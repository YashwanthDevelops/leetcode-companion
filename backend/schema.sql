-- ============================================
-- LEETCODE COMPANION - DATABASE SCHEMA
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100),
    avatar_url TEXT,
    leetcode_username VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'UTC',
    daily_goal INTEGER DEFAULT 5,
    streak_count INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    total_problems_solved INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. PROBLEMS TABLE (LeetCode Problems Cache)
-- ============================================
CREATE TABLE problems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    leetcode_id INTEGER UNIQUE,
    title VARCHAR(500) NOT NULL UNIQUE, -- Added UNIQUE to title for easier lookups
    slug VARCHAR(500) UNIQUE, -- slug might not be available initially if scraping title only
    difficulty VARCHAR(20) CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    description TEXT,
    url TEXT,
    
    -- AI Analysis (Cached from Gemini)
    cached_analysis JSONB, -- Stores the full/raw analysis response if needed
    patterns JSONB DEFAULT '[]'::jsonb, -- requested 'cached_patterns' maps to this
    complexity_analysis JSONB DEFAULT '{}'::jsonb,
    key_insights JSONB DEFAULT '[]'::jsonb,
    similar_problems JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    topics JSONB DEFAULT '[]'::jsonb,
    companies JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. USER_PROBLEM_PROGRESS TABLE (SM-2 Data)
-- ============================================
CREATE TABLE user_problem_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
    
    -- SM-2 Algorithm Fields
    easiness_factor DECIMAL(4,2) DEFAULT 2.5,  -- EF (starts at 2.5)
    interval INTEGER DEFAULT 0,                 -- Days until next review
    repetitions INTEGER DEFAULT 0,              -- Successful reviews in a row
    next_review_date DATE DEFAULT CURRENT_DATE, -- When to review next
    last_reviewed_at TIMESTAMPTZ,
    
    -- Progress Tracking
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'learning', 'reviewing', 'mastered')),
    times_solved INTEGER DEFAULT 0,
    total_attempts INTEGER DEFAULT 0,
    average_quality DECIMAL(3,2) DEFAULT 0,
    
    -- Performance Metrics
    best_time_minutes INTEGER,
    last_time_minutes INTEGER,
    solutions_viewed BOOLEAN DEFAULT FALSE,
    hints_used INTEGER DEFAULT 0,
    
    -- Notes
    personal_notes TEXT,
    code_snippets JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, problem_id)
);

-- ============================================
-- 4. REVIEW_SESSIONS TABLE (History)
-- ============================================
CREATE TABLE review_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
    progress_id UUID REFERENCES user_problem_progress(id) ON DELETE CASCADE,
    
    -- Session Data
    quality_rating INTEGER CHECK (quality_rating BETWEEN 0 AND 5),
    time_spent_minutes INTEGER,
    solved_successfully BOOLEAN,
    
    -- SM-2 Snapshot (for debugging/analytics)
    ef_before DECIMAL(4,2),
    ef_after DECIMAL(4,2),
    interval_before INTEGER,
    interval_after INTEGER,
    
    session_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. DAILY_STATS TABLE (For Heatmap/Streaks)
-- ============================================
CREATE TABLE daily_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    problems_solved INTEGER DEFAULT 0,
    problems_reviewed INTEGER DEFAULT 0,
    total_time_minutes INTEGER DEFAULT 0,
    patterns_practiced JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

-- ============================================
-- 6. PATTERN_MASTERY TABLE
-- ============================================
CREATE TABLE pattern_mastery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    pattern_name VARCHAR(100) NOT NULL,
    problems_solved INTEGER DEFAULT 0,
    average_quality DECIMAL(3,2) DEFAULT 0,
    mastery_level VARCHAR(20) DEFAULT 'beginner' 
        CHECK (mastery_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    last_practiced_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, pattern_name)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_user_progress_user_id ON user_problem_progress(user_id);
CREATE INDEX idx_user_progress_next_review ON user_problem_progress(user_id, next_review_date);
CREATE INDEX idx_user_progress_status ON user_problem_progress(user_id, status);
CREATE INDEX idx_problems_slug ON problems(slug);
CREATE INDEX idx_problems_title ON problems(title);
CREATE INDEX idx_problems_patterns ON problems USING GIN (patterns);
CREATE INDEX idx_review_sessions_user_date ON review_sessions(user_id, session_date);
CREATE INDEX idx_daily_stats_user_date ON daily_stats(user_id, date);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_problems_updated_at
    BEFORE UPDATE ON problems
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at
    BEFORE UPDATE ON user_problem_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pattern_mastery_updated_at
    BEFORE UPDATE ON pattern_mastery
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_problem_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_mastery ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own data" ON users
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage own progress" ON user_problem_progress
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions" ON review_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own stats" ON daily_stats
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own mastery" ON pattern_mastery
    FOR ALL USING (auth.uid() = user_id);

-- Problems are public (cached LeetCode data)
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Problems are viewable by all" ON problems
    FOR SELECT USING (true);
CREATE POLICY "Problems can be inserted by authenticated" ON problems
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Problems can be updated by authenticated" ON problems
    FOR UPDATE USING (auth.role() = 'authenticated');
