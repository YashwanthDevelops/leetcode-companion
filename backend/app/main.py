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
def read_root():
    return {"status": "ok", "message": "Backend is live with SM-2 Memory!"}

@app.post("/analyze")
async def analyze_problem(input_data: ProblemInput):
    if not gemini_service:
        raise HTTPException(status_code=500, detail="Gemini Service not initialized")
    
    try:
        # Check cache first? (Optional optimization)
        
        analysis = await gemini_service.analyze_problem(input_data.description)
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
