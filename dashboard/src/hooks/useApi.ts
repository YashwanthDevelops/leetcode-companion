import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchStats, fetchToday, fetchHeatmap, solveProblem } from '../services/api';
import type { SolveRequest } from '../types';

// Query keys for cache management
export const queryKeys = {
    stats: ['stats'] as const,
    today: ['today'] as const,
    heatmap: ['heatmap'] as const,
};

// Hook to fetch user stats
export const useStats = () => {
    return useQuery({
        queryKey: queryKeys.stats,
        queryFn: fetchStats,
        staleTime: 1000 * 30, // Consider data fresh for 30 seconds
        refetchOnWindowFocus: true,
    });
};

// Hook to fetch today's due problems
export const useToday = () => {
    return useQuery({
        queryKey: queryKeys.today,
        queryFn: fetchToday,
        staleTime: 1000 * 60, // Consider data fresh for 1 minute
        refetchOnWindowFocus: true,
    });
};

// Hook to fetch heatmap data
export const useHeatmap = () => {
    return useQuery({
        queryKey: queryKeys.heatmap,
        queryFn: fetchHeatmap,
        staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
        refetchOnWindowFocus: false,
    });
};

// Hook to mark a problem as solved
export const useSolveProblem = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: SolveRequest) => solveProblem(data),
        onSuccess: () => {
            // Invalidate and refetch relevant queries
            queryClient.invalidateQueries({ queryKey: queryKeys.stats });
            queryClient.invalidateQueries({ queryKey: queryKeys.today });
            queryClient.invalidateQueries({ queryKey: queryKeys.heatmap });
        },
    });
};
