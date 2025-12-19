import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, ChevronDown, Check, AlertCircle } from 'lucide-react';
import type { DueProblem } from '../../types';
import { QUALITY_RATINGS } from '../../types';
import { useSolveProblem } from '../../hooks/useApi';

interface ReviewCardProps {
    problem: DueProblem;
    index: number;
}

export const ReviewCard = ({ problem, index }: ReviewCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedQuality, setSelectedQuality] = useState<number | null>(null);
    const solveMutation = useSolveProblem();

    // Calculate days overdue
    const getDaysOverdue = () => {
        const reviewDate = new Date(problem.next_review);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        reviewDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const daysOverdue = getDaysOverdue();

    // Difficulty color
    const difficultyColors: Record<string, string> = {
        Easy: 'var(--color-easy)',
        Medium: 'var(--color-medium)',
        Hard: 'var(--color-hard)',
    };

    const handleMarkReviewed = () => {
        if (selectedQuality === null) return;

        solveMutation.mutate({
            title: problem.title,
            difficulty: problem.difficulty,
            quality: selectedQuality,
            url: problem.url,
        });

        setIsExpanded(false);
        setSelectedQuality(null);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] overflow-hidden"
        >
            {/* Main Card */}
            <div className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{
                                backgroundColor: `${difficultyColors[problem.difficulty]}20`,
                                color: difficultyColors[problem.difficulty]
                            }}
                        >
                            {problem.difficulty}
                        </span>

                        {daysOverdue > 0 && (
                            <span className="flex items-center gap-1 text-xs text-[hsl(var(--destructive))]">
                                <AlertCircle className="w-3 h-3" />
                                {daysOverdue} day{daysOverdue > 1 ? 's' : ''} overdue
                            </span>
                        )}
                    </div>

                    <h3 className="font-medium text-[hsl(var(--foreground))] truncate">
                        {problem.title}
                    </h3>
                </div>

                <div className="flex items-center gap-2">
                    <a
                        href={problem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-[hsl(var(--secondary))] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ExternalLink className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    </a>

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        Mark Reviewed
                        <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronDown className="w-4 h-4" />
                        </motion.div>
                    </button>
                </div>
            </div>

            {/* Expanded Quality Rating Section */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-[hsl(var(--border))]"
                    >
                        <div className="p-4">
                            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
                                How well did you solve this problem?
                            </p>

                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
                                {Object.entries(QUALITY_RATINGS).map(([quality, { label, color }]) => (
                                    <button
                                        key={quality}
                                        onClick={() => setSelectedQuality(Number(quality))}
                                        className={`p-2 rounded-lg border text-center transition-all ${selectedQuality === Number(quality)
                                                ? 'border-[hsl(var(--ring))] scale-105'
                                                : 'border-[hsl(var(--border))] hover:border-[hsl(var(--ring)/0.5)]'
                                            }`}
                                        style={{
                                            backgroundColor: selectedQuality === Number(quality) ? `${color}20` : 'transparent',
                                        }}
                                    >
                                        <div
                                            className="text-lg font-bold mb-0.5"
                                            style={{ color }}
                                        >
                                            {quality}
                                        </div>
                                        <div className="text-[10px] text-[hsl(var(--muted-foreground))] leading-tight">
                                            {label}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleMarkReviewed}
                                disabled={selectedQuality === null || solveMutation.isPending}
                                className="w-full py-2 rounded-lg bg-[var(--color-lc-green)] text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                                {solveMutation.isPending ? (
                                    <span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full" />
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Submit Review
                                    </>
                                )}
                            </button>

                            {solveMutation.isSuccess && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-sm text-[var(--color-lc-green)] text-center mt-2"
                                >
                                    Review saved! Next review scheduled.
                                </motion.p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
