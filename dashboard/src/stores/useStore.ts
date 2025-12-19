import { create } from 'zustand';
import type { DueProblem, AppState } from '../types';

export const useStore = create<AppState>((set) => ({
    sidebarOpen: true,
    selectedProblem: null,

    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setSelectedProblem: (problem: DueProblem | null) => set({ selectedProblem: problem }),
}));
