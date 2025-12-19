/**
 * API Service for LeetCode Companion
 * Centralized API calls to the FastAPI backend
 */

const API_BASE = 'http://localhost:8000';

/**
 * Generic fetch wrapper with error handling, retry logic, and timeouts
 */
async function apiCall(endpoint, options = {}, maxRetries = 3) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const url = `${API_BASE}${endpoint}`;

            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                signal: controller.signal,
                ...options
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            lastError = error;

            // Don't retry on 4xx errors (client errors)
            if (error.message && error.message.includes('HTTP 4')) {
                throw error;
            }

            // If this isn't the last attempt, wait before retrying
            if (attempt < maxRetries - 1) {
                // Exponential backoff: 1s, 2s, 4s
                const delay = 1000 * Math.pow(2, attempt);
                console.log(`API call failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // If all retries failed, throw the last error
    console.error(`API call failed after ${maxRetries} attempts for ${endpoint}:`, lastError);
    throw lastError;
}

/**
 * API Endpoints
 */
const API = {
    /**
     * Analyze a LeetCode problem with Gemini AI
     * @param {Object} problemData - Problem data from content script
     * @returns {Promise<Object>} Analysis results
     */
    async analyze(problemData) {
        return apiCall('/analyze', {
            method: 'POST',
            body: JSON.stringify({
                title: problemData.title,
                description: problemData.description,
                difficulty: problemData.difficulty,
                url: problemData.url
            })
        });
    },

    /**
     * Save problem solving progress
     * @param {Object} solveData - Problem and quality rating
     * @returns {Promise<Object>} Next review info
     */
    async solve(solveData) {
        return apiCall('/solve', {
            method: 'POST',
            body: JSON.stringify({
                title: solveData.title,
                difficulty: solveData.difficulty,
                quality: solveData.quality,
                url: solveData.url
            })
        });
    },

    /**
     * Get dashboard statistics
     * @returns {Promise<Object>} Stats object
     */
    async getStats() {
        return apiCall('/stats');
    },

    /**
     * Get today's review problems
     * @returns {Promise<Object>} Today's reviews
     */
    async getToday() {
        return apiCall('/today');
    },

    /**
     * Get activity heatmap data
     * @returns {Promise<Object>} Heatmap data
     */
    async getHeatmap() {
        return apiCall('/heatmap');
    },

    /**
     * Get pattern mastery data
     * @returns {Promise<Object>} Pattern stats
     */
    async getPatterns() {
        return apiCall('/patterns');
    },

    /**
     * Get all tracked problems with progress
     * @returns {Promise<Object>} All problems and stats
     */
    async getProblems() {
        return apiCall('/problems');
    },

    /**
     * Get detailed statistics
     * @returns {Promise<Object>} Detailed stats
     */
    async getDetailedStats() {
        return apiCall('/stats/detailed');
    },

    /**
     * Check backend connection status
     * @returns {Promise<boolean>} Connection status
     */
    async checkConnection() {
        try {
            await apiCall('/stats');
            return true;
        } catch (error) {
            return false;
        }
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}
