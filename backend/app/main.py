from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta, date

# Import your local files
from app.database import engine, Base, get_db
from app.models import User, Problem, UserProblemProgress, ReviewSession, DailyStats # Updated models
from app.services.gemini_service import GeminiService
from app.services.spaced_repetition import SpacedRepetitionService

# 1. Modern Lifespan Handler (Handles Startup/Shutdown)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP: Create Tables
    print("🚀 Connecting to Supabase and creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tables ready!")
    
    # Initialize Global Gemini Service
    global gemini_service
    gemini_service = GeminiService()
    
    yield
    # SHUTDOWN
    await engine.dispose()

app = FastAPI(title="LeetCode Companion Backend", lifespan=lifespan)

# 2. CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Pydantic Models
class ProblemInput(BaseModel):
    title: str
    description: str
    difficulty: str
    url: str

class SolveInput(BaseModel):
    title: str
    difficulty: str
    quality: int # 0-5
    url: str
    analysis: dict = None  # Optional: cached analysis data

# 4. Helper to get Default User (MVP shortcut)
async def get_current_user(db: AsyncSession = Depends(get_db)) -> User:
    # Try to find a default user
    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    
    if not user:
        # Create a default user if none exists
        user = User(
            email="user@example.com",
            username="LeetCodeUser",
            daily_goal=5
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
    return user

# 5. Endpoints
@app.get("/")
@app.head("/")
def read_root():
    return {"status": "ok", "message": "Backend is live with SM-2 Memory!"}


@app.post("/analyze")
async def analyze_problem(
    input_data: ProblemInput,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not gemini_service:
        raise HTTPException(status_code=500, detail="Gemini Service not initialized")
    
    try:
        # Check if problem exists and has cached analysis
        result = await db.execute(select(Problem).where(Problem.title == input_data.title))
        problem = result.scalar_one_or_none()
        
        # Return cached analysis if available
        if problem and problem.cached_analysis:
            return problem.cached_analysis
        
        # Get fresh analysis from Gemini
        analysis = await gemini_service.analyze_problem(input_data.description)
        
        # Cache the analysis in the problem record
        if problem:
            problem.cached_analysis = analysis
            problem.patterns = analysis.get('patterns', [])
            await db.commit()
        else:
            # Create problem with cached analysis
            new_problem = Problem(
                title=input_data.title,
                difficulty=input_data.difficulty,
                url=input_data.url,
                description=input_data.description,
                cached_analysis=analysis,
                patterns=analysis.get('patterns', [])
            )
            db.add(new_problem)
            await db.commit()
        
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/solve")
async def solve_problem(
    input_data: SolveInput, 
    user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    # 1. Find or Create Problem
    result = await db.execute(select(Problem).where(Problem.title == input_data.title))
    problem = result.scalar_one_or_none()
    
    if not problem:
        problem = Problem(
            title=input_data.title,
            difficulty=input_data.difficulty,
            url=input_data.url
            # analysis data could be passed here if we wanted to simplify
        )
        db.add(problem)
        await db.flush() # flush to get ID
    
    # 2. Find or Create User Progress
    result = await db.execute(
        select(UserProblemProgress).where(
            and_(UserProblemProgress.user_id == user.id, UserProblemProgress.problem_id == problem.id)
        )
    )
    progress = result.scalar_one_or_none()
    
    if not progress:
        progress = UserProblemProgress(
            user_id=user.id,
            problem_id=problem.id,
            easiness_factor=2.5,
            interval=0,
            repetitions=0,
            times_solved=0,
            total_attempts=0
        )
        db.add(progress)
    
    # 3. Calculate SM-2
    new_interval, new_ease, new_repetitions = SpacedRepetitionService.calculate_next_review(
        quality=input_data.quality,
        ease_factor=progress.easiness_factor,
        interval=progress.interval,
        repetitions=progress.repetitions
    )
    
    # Snapshot for session
    ef_before = progress.easiness_factor
    interval_before = progress.interval
    
    # 4. Update Progress
    progress.easiness_factor = new_ease
    progress.interval = new_interval
    progress.repetitions = new_repetitions
    progress.last_reviewed_at = datetime.utcnow()
    progress.next_review_date = datetime.utcnow().date() + timedelta(days=new_interval)
    
    if new_repetitions > 0:
        progress.status = 'learning' if new_repetitions < 3 else 'reviewing'
    if new_repetitions > 5:
        progress.status = 'mastered'
        
    progress.times_solved = (progress.times_solved or 0) + 1
    
    # 5. Log Review Session
    session = ReviewSession(
        user_id=user.id,
        problem_id=problem.id,
        progress_id=progress.id,
        quality_rating=input_data.quality,
        solved_successfully=True if input_data.quality >= 3 else False,
        ef_before=ef_before,
        ef_after=new_ease,
        interval_before=interval_before,
        interval_after=new_interval,
        session_date=datetime.utcnow().date()
    )
    db.add(session)
    
    # 6. Update Daily Stats
    today = datetime.utcnow().date()
    result = await db.execute(
        select(DailyStats).where(
            and_(DailyStats.user_id == user.id, DailyStats.date == today)
        )
    )
    daily = result.scalar_one_or_none()
    
    if not daily:
        daily = DailyStats(user_id=user.id, date=today, problems_solved=0, problems_reviewed=0)
        db.add(daily)
    
    daily.problems_solved += 1
    # Check if this counts effectively as 'reviewed' (assuming solve = review for now)
    daily.problems_reviewed += 1
    
    # Update Streak (basic logic)
    if daily.problems_solved == 1: # First solve of day
        # Ideally check yesterday, but simplifying for now.
        user.streak_count += 1
        user.total_problems_solved += 1
    
    await db.commit()
    
    return {
        "message": "Progress saved!",
        "next_review": progress.next_review_date.strftime("%Y-%m-%d"),
        "interval_days": new_interval,
        "streak": user.streak_count
    }

@app.get("/today")
async def get_due_problems(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    today = datetime.utcnow().date()
    
    query = (
        select(Problem, UserProblemProgress)
        .join(UserProblemProgress, Problem.id == UserProblemProgress.problem_id)
        .where(
            and_(
                UserProblemProgress.user_id == user.id,
                UserProblemProgress.next_review_date <= today,
                UserProblemProgress.status.in_(['learning', 'reviewing'])
            )
        )
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    # Simplify response
    due = []
    for problem, progress in rows:
        due.append({
            "title": problem.title,
            "difficulty": problem.difficulty,
            "url": problem.url,
            "next_review": progress.next_review_date,
            "status": progress.status
        })
        
    return {"due_count": len(due), "problems": due}

@app.get("/stats")
async def get_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    today = datetime.utcnow().date()
    
    # Count due today
    due_query = select(func.count()).select_from(UserProblemProgress).where(
        and_(
            UserProblemProgress.user_id == user.id,
            UserProblemProgress.next_review_date <= today,
            UserProblemProgress.status.in_(['learning', 'reviewing'])
        )
    )
    due_result = await db.execute(due_query)
    due_count = due_result.scalar()
    
    # Calculate Mastery (simplified: mastered / total)
    total_query = select(func.count()).select_from(UserProblemProgress).where(UserProblemProgress.user_id == user.id)
    mastered_query = select(func.count()).select_from(UserProblemProgress).where(
        and_(UserProblemProgress.user_id == user.id, UserProblemProgress.status == 'mastered')
    )
    
    total_res = await db.execute(total_query)
    total_count = total_res.scalar()
    
    mastered_res = await db.execute(mastered_query)
    mastered_count = mastered_res.scalar()
    
    mastery_rate = (mastered_count / total_count * 100) if total_count > 0 else 0
    
    return {
        "streak": user.streak_count,
        "total_solved": user.total_problems_solved,
        "due_today": due_count,
        "mastery_rate": round(mastery_rate, 1)
    }

@app.get("/heatmap")
async def get_heatmap(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Get last 365 days
    since = datetime.utcnow().date() - timedelta(days=365)
    
    query = select(DailyStats).where(
        and_(DailyStats.user_id == user.id, DailyStats.date >= since)
    ).order_by(DailyStats.date)
    
    result = await db.execute(query)
    stats = result.scalars().all()
    
    data = {}
    for day in stats:
        # Convert date to timestamp or string
        date_str = day.date.strftime("%Y-%m-%d")
        data[date_str] = day.problems_solved
        
    return data

@app.get("/patterns")
async def get_patterns(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get pattern mastery statistics for the user.
    Analyzes all problems solved by the user and groups them by pattern.
    """
    # Get all problems with progress for this user
    query = (
        select(Problem, UserProblemProgress)
        .join(UserProblemProgress, Problem.id == UserProblemProgress.problem_id)
        .where(UserProblemProgress.user_id == user.id)
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    # Dictionary to track pattern statistics
    pattern_stats = {}
    
    for problem, progress in rows:
        # Extract patterns from cached_analysis or patterns field
        patterns_list = []
        
        if problem.patterns and isinstance(problem.patterns, list):
            # patterns field is a JSONB array of pattern objects
            patterns_list = [p.get('name', p) if isinstance(p, dict) else p for p in problem.patterns]
        elif problem.cached_analysis and isinstance(problem.cached_analysis, dict):
            # Try to extract from cached_analysis
            if 'patterns' in problem.cached_analysis:
                patterns_data = problem.cached_analysis['patterns']
                if isinstance(patterns_data, list):
                    patterns_list = [p.get('name', p) if isinstance(p, dict) else p for p in patterns_data]
        
        # Count solved problems for each pattern
        for pattern_name in patterns_list:
            if pattern_name not in pattern_stats:
                pattern_stats[pattern_name] = {
                    'solved': 0,
                    'total': 0
                }
            
            pattern_stats[pattern_name]['solved'] += 1
    
    # Get total problems per pattern (including unsolved)
    # For now, we'll use solved count as total (can be enhanced later with LeetCode API)
    for pattern_name in pattern_stats:
        # In production, you'd query LeetCode's API or maintain a patterns database
        # For MVP, we'll estimate total as solved * 4 (assuming user solved 25% of pattern problems)
        pattern_stats[pattern_name]['total'] = max(pattern_stats[pattern_name]['solved'] * 4, pattern_stats[pattern_name]['solved'])
    
    # Format response
    patterns = []
    for pattern_name, stats in pattern_stats.items():
        solved = stats['solved']
        total = stats['total']
        percentage = round((solved / total * 100) if total > 0 else 0, 0)
        
        patterns.append({
            'name': pattern_name,
            'solved': solved,
            'total': total,
            'percentage': int(percentage)
        })
    
    # Sort by solved count (descending)
    patterns.sort(key=lambda x: x['solved'], reverse=True)
    
    return {'patterns': patterns}

@app.get("/problems")
async def get_problems(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all problems with user progress.
    Returns detailed information for the Problems tab.
    """
    # Query all problems with progress for this user
    query = (
        select(Problem, UserProblemProgress)
        .join(UserProblemProgress, Problem.id == UserProblemProgress.problem_id)
        .where(UserProblemProgress.user_id == user.id)
        .order_by(UserProblemProgress.last_reviewed_at.desc())
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    problems = []
    for problem, progress in rows:
        # Extract patterns
        patterns_list = []
        if problem.patterns and isinstance(problem.patterns, list):
            patterns_list = [p.get('name', p) if isinstance(p, dict) else p for p in problem.patterns]
        
        problems.append({
            'id': str(problem.id),
            'title': problem.title,
            'difficulty': problem.difficulty,
            'url': problem.url,
            'status': progress.status,
            'next_review': progress.next_review_date.strftime('%Y-%m-%d') if progress.next_review_date else None,
            'patterns': patterns_list,
            'times_solved': progress.times_solved,
            'easiness_factor': progress.easiness_factor,
            'last_reviewed': progress.last_reviewed_at.strftime('%Y-%m-%d') if progress.last_reviewed_at else None
        })
    
    return {
        'problems': problems,
        'total': len(problems)
    }

@app.get("/stats/detailed")
async def get_detailed_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed statistics including weekly activity and difficulty breakdown.
    """
    # Total problems
    total_query = select(func.count()).select_from(UserProblemProgress).where(
        UserProblemProgress.user_id == user.id
    )
    total_result = await db.execute(total_query)
    total_problems = total_result.scalar()
    
    # Mastered problems
    mastered_query = select(func.count()).select_from(UserProblemProgress).where(
        and_(
            UserProblemProgress.user_id == user.id,
            UserProblemProgress.status == 'mastered'
        )
    )
    mastered_result = await db.execute(mastered_query)
    mastered = mastered_result.scalar()
    
    mastery_percentage = round((mastered / total_problems * 100), 1) if total_problems > 0 else 0
    
    # Total review sessions
    reviews_query = select(func.count()).select_from(ReviewSession).where(
        ReviewSession.user_id == user.id
    )
    reviews_result = await db.execute(reviews_query)
    total_reviews = reviews_result.scalar()
    
    # Weekly activity (last 7 days)
    today = datetime.utcnow().date()
    week_ago = today - timedelta(days=6)
    
    weekly_query = select(DailyStats).where(
        and_(
            DailyStats.user_id == user.id,
            DailyStats.date >= week_ago,
            DailyStats.date <= today
        )
    ).order_by(DailyStats.date)
    
    weekly_result = await db.execute(weekly_query)
    weekly_stats = weekly_result.scalars().all()
    
    # Create daily counts for the week
    weekly_activity = []
    for i in range(7):
        current_date = week_ago + timedelta(days=i)
        day_stat = next((s for s in weekly_stats if s.date == current_date), None)
        weekly_activity.append({
            'day': current_date.strftime('%a'),
            'count': day_stat.problems_solved if day_stat else 0
        })
    
    # Difficulty breakdown
    difficulty_query = (
        select(Problem.difficulty, func.count())
        .join(UserProblemProgress, Problem.id == UserProblemProgress.problem_id)
        .where(UserProblemProgress.user_id == user.id)
        .group_by(Problem.difficulty)
    )
    
    difficulty_result = await db.execute(difficulty_query)
    difficulty_rows = difficulty_result.all()
    
    difficulty_counts = {'easy': 0, 'medium': 0, 'hard': 0}
    for difficulty, count in difficulty_rows:
        if difficulty:
            difficulty_counts[difficulty.lower()] = count
    
    total = sum(difficulty_counts.values())
    
    by_difficulty = {
        'easy': {
            'count': difficulty_counts['easy'],
            'percentage': round((difficulty_counts['easy'] / total * 100), 0) if total > 0 else 0
        },
        'medium': {
            'count': difficulty_counts['medium'],
            'percentage': round((difficulty_counts['medium'] / total * 100), 0) if total > 0 else 0
        },
        'hard': {
            'count': difficulty_counts['hard'],
            'percentage': round((difficulty_counts['hard'] / total * 100), 0) if total > 0 else 0
        }
    }
    
    return {
        'total_problems': total_problems,
        'mastered': mastered,
        'mastery_percentage': mastery_percentage,
        'current_streak': user.streak_count,
        'longest_streak': user.longest_streak,
        'total_reviews': total_reviews,
        'weekly_activity': weekly_activity,
        'by_difficulty': by_difficulty
    }
