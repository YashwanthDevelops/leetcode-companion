from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, Boolean, Text, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime
import uuid

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    username = Column(String)
    avatar_url = Column(Text)
    leetcode_username = Column(String)
    timezone = Column(String, default='UTC')
    
    daily_goal = Column(Integer, default=5)
    streak_count = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    total_problems_solved = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    progress = relationship("UserProblemProgress", back_populates="user")
    sessions = relationship("ReviewSession", back_populates="user")
    daily_stats = relationship("DailyStats", back_populates="user")
    pattern_mastery = relationship("PatternMastery", back_populates="user")

class Problem(Base):
    __tablename__ = "problems"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    leetcode_id = Column(Integer, unique=True, nullable=True)
    title = Column(String, unique=True, index=True, nullable=False)
    slug = Column(String, unique=True, index=True)
    difficulty = Column(String) # Easy, Medium, Hard
    description = Column(Text)
    url = Column(Text)
    
    # AI Analysis (Cached)
    cached_analysis = Column(JSONB) # Full raw response
    patterns = Column(JSONB, default=[]) # List of identified patterns
    complexity_analysis = Column(JSONB, default={})
    key_insights = Column(JSONB, default=[])
    similar_problems = Column(JSONB, default=[])
    
    # Metadata
    topics = Column(JSONB, default=[])
    companies = Column(JSONB, default=[])
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user_progress = relationship("UserProblemProgress", back_populates="problem")
    review_sessions = relationship("ReviewSession", back_populates="problem")

class UserProblemProgress(Base):
    __tablename__ = "user_problem_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    problem_id = Column(UUID(as_uuid=True), ForeignKey("problems.id"))
    
    # SM-2 Algorithm Fields
    easiness_factor = Column(Float, default=2.5)
    interval = Column(Integer, default=0)
    repetitions = Column(Integer, default=0)
    next_review_date = Column(Date, default=datetime.utcnow().date)
    last_reviewed_at = Column(DateTime)
    
    # Progress Tracking
    status = Column(String, default="new") # new, learning, reviewing, mastered
    times_solved = Column(Integer, default=0)
    total_attempts = Column(Integer, default=0)
    average_quality = Column(Float, default=0.0)
    
    # Performance Metrics
    best_time_minutes = Column(Integer)
    last_time_minutes = Column(Integer)
    solutions_viewed = Column(Boolean, default=False)
    hints_used = Column(Integer, default=0)
    
    # Notes
    personal_notes = Column(Text)
    code_snippets = Column(JSONB, default=[])
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="progress")
    problem = relationship("Problem", back_populates="user_progress")
    sessions = relationship("ReviewSession", back_populates="progress")

class ReviewSession(Base):
    __tablename__ = "review_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    problem_id = Column(UUID(as_uuid=True), ForeignKey("problems.id"))
    progress_id = Column(UUID(as_uuid=True), ForeignKey("user_problem_progress.id"))
    
    quality_rating = Column(Integer) # 0-5
    time_spent_minutes = Column(Integer)
    solved_successfully = Column(Boolean)
    
    # SM-2 Snapshot
    ef_before = Column(Float)
    ef_after = Column(Float)
    interval_before = Column(Integer)
    interval_after = Column(Integer)
    
    session_date = Column(Date, default=datetime.utcnow().date)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="sessions")
    problem = relationship("Problem", back_populates="review_sessions")
    progress = relationship("UserProblemProgress", back_populates="sessions")

class DailyStats(Base):
    __tablename__ = "daily_stats"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    date = Column(Date, nullable=False)
    
    problems_solved = Column(Integer, default=0)
    problems_reviewed = Column(Integer, default=0)
    total_time_minutes = Column(Integer, default=0)
    patterns_practiced = Column(JSONB, default=[])
    
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="daily_stats")

class PatternMastery(Base):
    __tablename__ = "pattern_mastery"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    pattern_name = Column(String, nullable=False)
    problems_solved = Column(Integer, default=0)
    average_quality = Column(Float, default=0.0)
    mastery_level = Column(String, default="beginner") # beginner, intermediate, advanced, expert
    last_practiced_at = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="pattern_mastery")
