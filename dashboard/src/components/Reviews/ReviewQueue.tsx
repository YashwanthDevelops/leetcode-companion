import { motion } from 'framer-motion';
import { CalendarClock, PartyPopper } from 'lucide-react';
import { useToday } from '../../hooks/useApi';
import { ReviewCard } from './ReviewCard';

// Loading skeleton
const ReviewCardSkeleton = () => (
    <div className="p-4 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] animate-pulse">
        <div className="flex items-center gap-4">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                    <div className="h-5 w-14 bg-[hsl(var(--muted))] rounded-full" />
                    <div className="h-4 w-20 bg-[hsl(var(--muted))] rounded" />
                </div>
                <div className="h-5 w-48 bg-[hsl(var(--muted))] rounded" />
            </div>
            <div className="h-8 w-28 bg-[hsl(var(--muted))] rounded-lg" />
        </div>
    </div>
);

export const ReviewQueue = () => {
    const { data: today, isLoading, error } = useToday();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] overflow-hidden"
        >
            {/* Header */}
            <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-lc-blue)]/20 flex items-center justify-center">
                        <CalendarClock className="w-5 h-5 text-[var(--color-lc-blue)]" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-[hsl(var(--foreground))]">
                            Today's Review Queue
                        </h2>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                            {isLoading ? 'Loading...' : `${today?.due_count ?? 0} problems due`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                {isLoading ? (
                    <>
                        {[...Array(3)].map((_, i) => (
                            <ReviewCardSkeleton key={i} />
                        ))}
                    </>
                ) : error ? (
                    <div className="p-4 rounded-xl bg-[hsl(var(--destructive)/0.1)] border border-[hsl(var(--destructive)/0.2)] text-[hsl(var(--destructive))] text-sm">
                        Failed to load today's problems. Make sure the backend is running.
                    </div>
                ) : today?.problems.length === 0 ? (
                    <div className="py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-[var(--color-lc-green)]/20 flex items-center justify-center mx-auto mb-4">
                            <PartyPopper className="w-8 h-8 text-[var(--color-lc-green)]" />
                        </div>
                        <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-1">
                            All caught up! 🎉
                        </h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                            No problems due for review today. Great job!
                        </p>
                    </div>
                ) : (
                    today?.problems.map((problem, index) => (
                        <ReviewCard key={problem.title} problem={problem} index={index} />
                    ))
                )}
            </div>
        </motion.div>
    );
};
