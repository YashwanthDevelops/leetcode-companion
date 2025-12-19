# Backend Endpoints for Bottom Navigation

Add these two endpoints to `backend/app/main.py` after the existing `/patterns` endpoint.

## 1. GET /problems

Returns all problems with user progress information.

```python
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
```

## 2. GET /stats/detailed

Returns comprehensive statistics for the Stats tab.

```python
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
```

## Where to Add

In `backend/app/main.py`, add these endpoints after line 374 (after the `/patterns` endpoint).

## Testing

After adding, test with:

```bash
# Test problems endpoint
curl http://localhost:8000/problems

# Test detailed stats endpoint
curl http://localhost:8000/stats/detailed
```

Both should return JSON data or empty arrays if no problems have been solved yet.
