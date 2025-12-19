import { motion } from 'framer-motion';
import { Flame, Calendar, CheckCircle2, Trophy } from 'lucide-react';
import { useStats } from '../../hooks/useApi';
import { useEffect, useState } from 'react';

interface StatCardProps {
    icon: React.ElementType;
    label: string;
    value: number;
    suffix?: string;
    color: string;
    delay: number;
}

const StatCard = ({ icon: Icon, label, value, suffix = '', color, delay }: StatCardProps) => {
    const [displayValue, setDisplayValue] = useState(0);

    // Count-up animation
    useEffect(() => {
        const duration = 1000; // 1 second
        const steps = 30;
        const stepDuration = duration / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += value / steps;
            if (current >= value) {
                setDisplayValue(value);
                clearInterval(timer);
            } else {
                setDisplayValue(Math.floor(current));
            }
        }, stepDuration);

        return () => clearInterval(timer);
    }, [value]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            className="relative p-5 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] overflow-hidden group cursor-pointer"
        >
            {/* Background gradient */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                    background: `radial-gradient(circle at 0% 0%, ${color}15 0%, transparent 50%)`
                }}
            />

            <div className="relative flex items-start justify-between">
                <div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mb-1">{label}</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-[hsl(var(--foreground))]">
                            {displayValue}
                        </span>
                        {suffix && (
                            <span className="text-lg text-[hsl(var(--muted-foreground))]">{suffix}</span>
                        )}
                    </div>
                </div>

                <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${color}20` }}
                >
                    <Icon className="w-5 h-5" style={{ color }} />
                </div>
            </div>
        </motion.div>
    );
};

// Loading skeleton
const StatCardSkeleton = () => (
    <div className="p-5 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] animate-pulse">
        <div className="flex items-start justify-between">
            <div>
                <div className="h-4 w-20 bg-[hsl(var(--muted))] rounded mb-2" />
                <div className="h-8 w-16 bg-[hsl(var(--muted))] rounded" />
            </div>
            <div className="w-11 h-11 rounded-xl bg-[hsl(var(--muted))]" />
        </div>
    </div>
);

export const StatsCards = () => {
    const { data: stats, isLoading, error } = useStats();

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <StatCardSkeleton key={i} />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 rounded-xl bg-[hsl(var(--destructive)/0.1)] border border-[hsl(var(--destructive)/0.2)] text-[hsl(var(--destructive))]">
                Failed to load stats. Make sure the backend is running.
            </div>
        );
    }

    const statCards = [
        {
            icon: Flame,
            label: 'Current Streak',
            value: stats?.streak ?? 0,
            suffix: 'days 🔥',
            color: 'var(--color-lc-orange)',
        },
        {
            icon: Calendar,
            label: 'Due Today',
            value: stats?.due_today ?? 0,
            suffix: '',
            color: 'var(--color-lc-blue)',
        },
        {
            icon: CheckCircle2,
            label: 'Total Solved',
            value: stats?.total_solved ?? 0,
            suffix: '',
            color: 'var(--color-lc-green)',
        },
        {
            icon: Trophy,
            label: 'Mastery Rate',
            value: stats?.mastery_rate ?? 0,
            suffix: '%',
            color: 'var(--color-lc-purple)',
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, index) => (
                <StatCard key={stat.label} {...stat} delay={index * 0.1} />
            ))}
        </div>
    );
};
