/**
 * API Service for LeetCode Companion
 * Centralized API calls to the FastAPI backend with JWT authentication
 */

/**
 * API Configuration
 * Change PRODUCTION_API to your Railway URL after deployment
 */
const CONFIG = {
    // Production URL (update after Railway deployment)
    PRODUCTION_API: 'https://your-app.railway.app',

    // Local development URL
    LOCAL_API: 'http://localhost:8000',

    // Set to true to use local API
    USE_LOCAL: false
};

/**
 * Get the API base URL
 * Checks for custom URL in storage, falls back to config
 */
async function getApiBase() {
    // Check for custom URL in settings
    try {
        const { apiUrl } = await chrome.storage.local.get('apiUrl');
        if (apiUrl && apiUrl.trim()) {
            return apiUrl.trim();
        }
    } catch (e) {
        console.log('Could not read storage:', e);
    }

    // Use configured URL
    return CONFIG.USE_LOCAL ? CONFIG.LOCAL_API : CONFIG.PRODUCTION_API;
}

/**
 * Get stored auth tokens from chrome.storage.local
 */
async function getTokens() {
    const { token, refreshToken } = await chrome.storage.local.get(['token', 'refreshToken']);
    return { token, refreshToken };
}

/**
 * Check if JWT token is expiring soon (within 5 minutes)
 * @param {string} token - JWT access token
 * @returns {boolean} - True if token is expiring soon or invalid
 */
function isTokenExpiringSoon(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiresAt = payload.exp * 1000; // Convert to milliseconds
        const fiveMinutes = 5 * 60 * 1000;
        return Date.now() > (expiresAt - fiveMinutes);
    } catch (error) {
        console.error('Error parsing token:', error);
        return true; // Treat invalid tokens as expired
    }
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken() {
    const { refreshToken } = await getTokens();

    if (!refreshToken) {
        throw new Error('No refresh token available');
    }

    try {
        const baseUrl = await getApiBase();
        const response = await fetch(`${baseUrl}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
        });

        if (!response.ok) {
            throw new Error('Token refresh failed');
        }

        const data = await response.json();

        // Store new tokens
        await chrome.storage.local.set({
            token: data.access_token,
            refreshToken: data.refresh_token
        });

        return data.access_token;
    } catch (error) {
        // Refresh failed - clear tokens and force login
        await chrome.storage.local.remove(['token', 'refreshToken', 'user']);
        throw error;
    }
}

/**
 * Generic fetch wrapper with authentication and error handling
 */
async function fetchWithAuth(endpoint, options = {}, maxRetries = 3) {
    let { token } = await getTokens();

    // Check if token needs refresh
    if (token && isTokenExpiringSoon(token)) {
        console.log('Token expiring soon, refreshing...');
        try {
            token = await refreshAccessToken();
        } catch (error) {
            console.error('Token refresh failed:', error);
            // Token refresh failed, will be handled by 401 below
        }
    }

    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const baseUrl = await getApiBase();
            const url = `${baseUrl}${endpoint}`;

            const headers = {
                'Content-Type': 'application/json',
                ...options.headers
            };

            // Add Authorization header if token exists
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

            const response = await fetch(url, {
                headers,
                signal: controller.signal,
                ...options
            });

            clearTimeout(timeoutId);

            // Handle 401 Unauthorized - token expired or invalid
            if (response.status === 401) {
                // Clear tokens and redirect to login
                await chrome.storage.local.remove(['token', 'refreshToken', 'user']);
                throw new Error('Session expired. Please log in again.');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            lastError = error;

            // Handle timeout errors
            if (error.name === 'AbortError') {
                lastError = new Error('Request timed out. Please try again.');
            }

            // Don't retry on 4xx errors (client errors)
            if (error.message && error.message.includes('HTTP 4')) {
                throw error;
            }

            // Don't retry on auth errors
            if (error.message && error.message.includes('Session expired')) {
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
    // ==========================================
    // AUTHENTICATION ENDPOINTS (No Auth Required)
    // ==========================================

    /**
     * Sign up a new user
     */
    async signup(email, password) {
        const baseUrl = await getApiBase();
        const response = await fetch(`${baseUrl}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Signup failed');
        }

        return await response.json();
    },

    /**
     * Login with email and password
     */
    async login(email, password) {
        const baseUrl = await getApiBase();
        const response = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Invalid credentials');
        }

        return await response.json();
    },

    /**
     * Logout current user
     */
    async logout() {
        return fetchWithAuth('/auth/logout', { method: 'POST' });
    },

    /**
     * Get current user info (validates token)
     */
    async getMe(token) {
        const baseUrl = await getApiBase();
        const response = await fetch(`${baseUrl}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Invalid token');
        }

        return await response.json();
    },

    /**
     * Send forgot password email
     */
    async forgotPassword(email) {
        const baseUrl = await getApiBase();
        const response = await fetch(`${baseUrl}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (!response.ok) {
            throw new Error('Could not send reset email');
        }

        return await response.json();
    },

    // ==========================================
    // PROTECTED ENDPOINTS (Auth Required)
    // ==========================================

    /**
     * Analyze a LeetCode problem with Gemini AI
     */
    async analyze(problemData) {
        return fetchWithAuth('/analyze', {
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
     */
    async solve(solveData) {
        return fetchWithAuth('/solve', {
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
     */
    async getStats() {
        return fetchWithAuth('/stats');
    },

    /**
     * Get today's review problems
     */
    async getToday() {
        return fetchWithAuth('/today');
    },

    /**
     * Get activity heatmap data
     */
    async getHeatmap() {
        return fetchWithAuth('/heatmap');
    },

    /**
     * Get pattern mastery data
     */
    async getPatterns() {
        return fetchWithAuth('/patterns');
    },

    /**
     * Get all tracked problems with progress
     */
    async getProblems() {
        return fetchWithAuth('/problems');
    },

    /**
     * Get detailed statistics
     */
    async getDetailedStats() {
        return fetchWithAuth('/stats/detailed');
    },

    /**
     * Check backend connection status
     */
    async checkConnection() {
        try {
            const baseUrl = await getApiBase();
            const response = await fetch(`${baseUrl}/`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            return response.ok;
        } catch {
            return false;
        }
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}
