import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { Tooltip } from 'react-tooltip';
import { useHeatmap } from '../../hooks/useApi';

export const ContributionHeatmap = () => {
    const { data: heatmapData, isLoading, error } = useHeatmap();

    // Generate calendar data for last 365 days
    const calendarData = useMemo(() => {
        const today = new Date();
        const data: { date: string; count: number; weekday: number }[] = [];

        for (let i = 364; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            data.push({
                date: dateStr,
                count: heatmapData?.[dateStr] ?? 0,
                weekday: date.getDay(),
            });
        }

        return data;
    }, [heatmapData]);

    // Group data by weeks
    const weeks = useMemo(() => {
        const result: typeof calendarData[] = [];
        let currentWeek: typeof calendarData = [];

        // Add empty cells for the first week if needed
        const firstDayWeekday = calendarData[0]?.weekday ?? 0;
        for (let i = 0; i < firstDayWeekday; i++) {
            currentWeek.push({ date: '', count: -1, weekday: i });
        }

        calendarData.forEach((day) => {
            currentWeek.push(day);
            if (day.weekday === 6) {
                result.push(currentWeek);
                currentWeek = [];
            }
        });

        // Add remaining days
        if (currentWeek.length > 0) {
            result.push(currentWeek);
        }

        return result;
    }, [calendarData]);

    // Get color based on count
    const getColor = (count: number): string => {
        if (count < 0) return 'transparent';
        if (count === 0) return 'hsl(var(--muted))';
        if (count <= 2) return 'var(--color-heat-1)';
        if (count <= 4) return 'var(--color-heat-2)';
        if (count <= 6) return 'var(--color-heat-3)';
        return 'var(--color-heat-4)';
    };

    // Get month labels
    const monthLabels = useMemo(() => {
        const labels: { month: string; weekIndex: number }[] = [];
        let lastMonth = -1;

        weeks.forEach((week, weekIndex) => {
            const firstValidDay = week.find(d => d.date);
            if (firstValidDay) {
                const month = new Date(firstValidDay.date).getMonth();
                if (month !== lastMonth) {
                    labels.push({
                        month: new Date(firstValidDay.date).toLocaleString('default', { month: 'short' }),
                        weekIndex,
                    });
                    lastMonth = month;
                }
            }
        });

        return labels;
    }, [weeks]);

    // Calculate total solved in period
    const totalSolved = useMemo(() => {
        return calendarData.reduce((sum, day) => sum + Math.max(0, day.count), 0);
    }, [calendarData]);

    if (error) {
        return (
            <div className="p-4 rounded-xl bg-[hsl(var(--destructive)/0.1)] border border-[hsl(var(--destructive)/0.2)] text-[hsl(var(--destructive))]">
                Failed to load heatmap data.
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] overflow-hidden"
        >
            {/* Header */}
            <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-lc-green)]/20 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-[var(--color-lc-green)]" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-[hsl(var(--foreground))]">
                            Activity
                        </h2>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                            {totalSolved} problems solved in the last year
                        </p>
                    </div>
                </div>

                {/* Legend */}
                <div className="hidden sm:flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                    <span>Less</span>
                    {[0, 1, 2, 3, 4].map((level) => (
                        <div
                            key={level}
                            className="w-3 h-3 rounded-sm"
                            style={{ backgroundColor: getColor(level === 0 ? 0 : level * 2) }}
                        />
                    ))}
                    <span>More</span>
                </div>
            </div>

            {/* Heatmap Grid */}
            <div className="p-4 overflow-x-auto">
                {isLoading ? (
                    <div className="h-32 flex items-center justify-center">
                        <div className="animate-spin w-8 h-8 border-2 border-[hsl(var(--muted))] border-t-[var(--color-lc-green)] rounded-full" />
                    </div>
                ) : (
                    <div className="min-w-fit">
                        {/* Month labels */}
                        <div className="flex mb-2 pl-8" style={{ gap: '3px' }}>
                            {monthLabels.map((label, i) => (
                                <div
                                    key={i}
                                    className="text-xs text-[hsl(var(--muted-foreground))]"
                                    style={{
                                        position: 'relative',
                                        left: `${label.weekIndex * 14}px`,
                                        marginRight: i < monthLabels.length - 1
                                            ? `${(monthLabels[i + 1].weekIndex - label.weekIndex - 3) * 14}px`
                                            : 0
                                    }}
                                >
                                    {label.month}
                                </div>
                            ))}
                        </div>

                        {/* Grid */}
                        <div className="flex">
                            {/* Day labels */}
                            <div className="flex flex-col justify-between text-xs text-[hsl(var(--muted-foreground))] pr-2 py-1">
                                <span>Sun</span>
                                <span>Tue</span>
                                <span>Thu</span>
                                <span>Sat</span>
                            </div>

                            {/* Cells */}
                            <div className="flex gap-[3px]">
                                {weeks.map((week, weekIndex) => (
                                    <div key={weekIndex} className="flex flex-col gap-[3px]">
                                        {week.map((day, dayIndex) => (
                                            <div
                                                key={`${weekIndex}-${dayIndex}`}
                                                data-tooltip-id="heatmap-tooltip"
                                                data-tooltip-content={
                                                    day.count >= 0
                                                        ? `${day.count} problem${day.count !== 1 ? 's' : ''} on ${new Date(day.date).toLocaleDateString('en-US', {
                                                            weekday: 'short',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}`
                                                        : ''
                                                }
                                                className={`w-[11px] h-[11px] rounded-sm transition-transform hover:scale-125 ${day.count >= 0 ? 'cursor-pointer' : ''
                                                    }`}
                                                style={{ backgroundColor: getColor(day.count) }}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Tooltip
                id="heatmap-tooltip"
                className="!bg-[hsl(var(--popover))] !text-[hsl(var(--popover-foreground))] !text-xs !px-2 !py-1 !rounded-lg !border !border-[hsl(var(--border))]"
            />
        </motion.div>
    );
};
