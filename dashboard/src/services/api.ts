import axios from 'axios';
import type { Stats, TodayResponse, HeatmapData, SolveRequest, SolveResponse } from '../types';

// Base API URL - Change this if backend runs on different port
const API_BASE_URL = 'http://localhost:8000';

// Create axios instance with base config
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// API Functions
export const fetchStats = async (): Promise<Stats> => {
    const response = await api.get<Stats>('/stats');
    return response.data;
};

export const fetchToday = async (): Promise<TodayResponse> => {
    const response = await api.get<TodayResponse>('/today');
    return response.data;
};

export const fetchHeatmap = async (): Promise<HeatmapData> => {
    const response = await api.get<HeatmapData>('/heatmap');
    return response.data;
};

export const solveProblem = async (data: SolveRequest): Promise<SolveResponse> => {
    const response = await api.post<SolveResponse>('/solve', data);
    return response.data;
};

// Health check
export const checkHealth = async (): Promise<boolean> => {
    try {
        const response = await api.get('/');
        return response.status === 200;
    } catch {
        return false;
    }
};

export { api };
