// Stats API Response
export interface Stats {
    streak: number;
    total_solved: number;
    due_today: number;
    mastery_rate: number;
}

// Problem in Today's Queue
export interface DueProblem {
    title: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    url: string;
    next_review: string;
    status: 'learning' | 'reviewing' | 'mastered';
}

// Today API Response
export interface TodayResponse {
    due_count: number;
    problems: DueProblem[];
}

// Heatmap API Response (date string -> count)
export type HeatmapData = Record<string, number>;

// Solve Request Payload
export interface SolveRequest {
    title: string;
    difficulty: string;
    quality: number; // 0-5
    url: string;
}

// Solve Response
export interface SolveResponse {
    message: string;
    next_review: string;
    interval_days: number;
    streak: number;
}

// Pattern Analysis (from Gemini)
export interface PatternAnalysis {
    patterns: string[];
    time_complexity: string;
    space_complexity: string;
    key_insight: string;
}

// UI State Types
export interface AppState {
    sidebarOpen: boolean;
    selectedProblem: DueProblem | null;
    toggleSidebar: () => void;
    setSelectedProblem: (problem: DueProblem | null) => void;
}

// Quality Rating Labels
export const QUALITY_RATINGS: Record<number, { label: string; description: string; color: string }> = {
    0: { label: 'Complete Blackout', description: 'No recall at all', color: '#ef4743' },
    1: { label: 'Incorrect', description: 'Wrong answer, slight familiarity', color: '#f87171' },
    2: { label: 'Incorrect', description: 'Wrong answer, but recognized solution', color: '#fb923c' },
    3: { label: 'Correct', description: 'Correct with difficulty', color: '#ffa116' },
    4: { label: 'Correct', description: 'Correct after some thought', color: '#a3e635' },
    5: { label: 'Perfect', description: 'Instant, perfect recall', color: '#00b8a3' },
};
