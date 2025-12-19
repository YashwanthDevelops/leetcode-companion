/**
 * LeetCode Companion - Popup Script
 * Handles authentication, navigation, analysis, and dashboard functionality
 */

// ==========================================
// AUTHENTICATION STATE
// ==========================================

let currentUser = null;
let isAuthChecking = false;

// ==========================================
// PAGE NAVIGATION SYSTEM
// ==========================================

const PAGES = {
    LOADING: 'loading',
    AUTH: 'auth',
    ANALYZE: 'analyze',
    DASHBOARD: 'dashboard',
    SETTINGS: 'settings'
};

let currentPage = PAGES.LOADING;
let currentProblemData = null;

/**
 * Navigate between pages
 */
function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Show target page
    const targetPage = document.getElementById(`${page}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
        currentPage = page;

        // Load data for dashboard if navigating to it
        if (page === PAGES.DASHBOARD) {
            loadDashboardData();
        }
    }
}

// ==========================================
// AUTHENTICATION FUNCTIONS
// ==========================================

/**
 * Check authentication status on startup
 */
async function checkAuth() {
    isAuthChecking = true;

    try {
        const { token, refreshToken } = await chrome.storage.local.get(['token', 'refreshToken']);

        if (!token) {
            // No token - show auth page
            navigateTo(PAGES.AUTH);
            return;
        }

        // Validate token with backend
        const user = await API.getMe(token);
        currentUser = user;

        // Store user info
        await chrome.storage.local.set({ user });

        // Token valid - show main app
        navigateTo(PAGES.ANALYZE);

        // Load user email in settings
        loadUserInfo();

    } catch (error) {
        console.log('Auth check failed:', error);
        // Token invalid - clear and show login
        await chrome.storage.local.remove(['token', 'refreshToken', 'user']);
        navigateTo(PAGES.AUTH);
    } finally {
        isAuthChecking = false;
    }
}

/**
 * Handle login form submission
 */
async function handleLogin(email, password, rememberMe) {
    const errorEl = document.getElementById('login-error');
    const submitBtn = document.querySelector('#login-form button[type="submit"]');

    try {
        errorEl.textContent = '';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';

        const response = await API.login(email, password);

        // Store tokens
        await chrome.storage.local.set({
            token: response.access_token,
            refreshToken: response.refresh_token,
            user: response.user
        });

        currentUser = response.user;

        // Navigate to main app
        navigateTo(PAGES.ANALYZE);
        showToast('Welcome back!', 'success');

        // Load user info in settings
        loadUserInfo();

    } catch (error) {
        errorEl.textContent = error.message || 'Invalid email or password';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
    }
}

/**
 * Handle signup form submission
 */
async function handleSignup(email, password, confirmPassword) {
    const errorEl = document.getElementById('signup-error');
    const submitBtn = document.querySelector('#signup-form button[type="submit"]');

    if (password !== confirmPassword) {
        errorEl.textContent = 'Passwords do not match';
        return;
    }

    if (password.length < 6) {
        errorEl.textContent = 'Password must be at least 6 characters';
        return;
    }

    try {
        errorEl.textContent = '';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';

        const response = await API.signup(email, password);

        // Store tokens
        await chrome.storage.local.set({
            token: response.access_token,
            refreshToken: response.refresh_token,
            user: response.user
        });

        currentUser = response.user;

        // Navigate to main app
        navigateTo(PAGES.ANALYZE);
        showToast('Account created successfully!', 'success');

        // Load user info in settings
        loadUserInfo();

    } catch (error) {
        errorEl.textContent = error.message || 'Could not create account';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
}

/**
 * Handle forgot password form submission
 */
async function handleForgotPassword(email) {
    const errorEl = document.getElementById('forgot-error');
    const successEl = document.getElementById('forgot-success');
    const submitBtn = document.querySelector('#forgot-password-form button[type="submit"]');

    try {
        errorEl.textContent = '';
        successEl.textContent = '';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        await API.forgotPassword(email);

        successEl.textContent = '✓ Password reset email sent! Check your inbox.';

        // Auto-return to login after 3 seconds
        setTimeout(() => {
            showLoginForm();
        }, 3000);

    } catch (error) {
        errorEl.textContent = error.message || 'Could not send reset email';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Reset Link';
    }
}

/**
 * Handle logout
 */
async function handleLogout() {
    try {
        await API.logout();
    } catch (error) {
        console.log('Logout error:', error);
    }

    // Clear local storage
    await chrome.storage.local.remove(['token', 'refreshToken', 'user']);
    currentUser = null;

    // Show auth page
    navigateTo(PAGES.AUTH);
    showToast('Logged out', 'info');
}

/**
 * Load user info into settings page
 */
async function loadUserInfo() {
    const { user } = await chrome.storage.local.get('user');
    if (user) {
        const userEmailEl = document.getElementById('user-email');
        if (userEmailEl) {
            userEmailEl.textContent = user.email;
        }
    }
}

/**
 * Toggle to show login form
 */
function showLoginForm() {
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    document.getElementById('login-form').classList.add('active');
}

/**
 * Toggle to show signup form
 */
function showSignupForm() {
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    document.getElementById('signup-form').classList.add('active');
}

/**
 * Toggle to show forgot password form
 */
function showForgotPasswordForm() {
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    document.getElementById('forgot-password-form').classList.add('active');
}

// ==========================================
// TAB SWITCHING (WITHIN DASHBOARD)
// ==========================================

let currentTab = 'dashboard';
let tabDataCache = {};

/**
 * Switch between tabs within the dashboard page
 */
function switchTab(tabName) {
    // Get current and new tabs
    const currentTabEl = document.querySelector('.tab-section.active');
    const newTabEl = document.getElementById(`tab-${tabName}`);

    if (!newTabEl || currentTabEl === newTabEl) return;

    // Remove active from all tabs
    document.querySelectorAll('.tab-section').forEach(section => {
        section.classList.remove('active', 'entering');
    });

    // Add entering class to trigger animation
    newTabEl.classList.add('entering');

    // Use RAF for smooth transition
    requestAnimationFrame(() => {
        newTabEl.classList.remove('entering');
        newTabEl.classList.add('active');
    });

    // Update bottom nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.nav === tabName) {
            item.classList.add('active');
        }
    });

    currentTab = tabName;

    // Load tab data if needed
    loadTabData(tabName);
}

/**
 * Load data for specific tab
 */
async function loadTabData(tabName) {
    // Check cache first (except dashboard which loads on page nav)
    if (tabDataCache[tabName] && tabName !== 'dashboard') {
        return; // Data already loaded
    }

    try {
        switch (tabName) {
            case 'dashboard':
                // Already loaded in loadDashboardData()
                break;

            case 'problems':
                const problemsData = await API.getProblems();
                tabDataCache.problems = problemsData;
                renderProblemsTab(problemsData);
                break;

            case 'stats':
                const statsData = await API.getDetailedStats();
                tabDataCache.stats = statsData;
                renderStatsTab(statsData);
                break;

            case 'patterns':
            case 'patterns-detail':
                const patternsData = await API.getPatterns();
                tabDataCache.patterns = patternsData;
                renderPatternsDetailTab(patternsData);
                break;
        }
    } catch (error) {
        console.error(`Error loading ${tabName} data:`, error);
        showTabError(tabName, error.message);
    }
}

function showTabError(tabName, message) {
    const container = document.getElementById(`tab-${tabName}`);
    if (container) {
        const errorHTML = `
            <div class="empty-state">
                <p>⚠️ Error loading data</p>
                <p style="font-size: 12px; color: var(--text-tertiary);">${message}</p>
            </div>
        `;
        container.innerHTML = errorHTML;
    }
}

// ==========================================
// ANALYZE PAGE - VIEW MANAGEMENT
// ==========================================

const views = {
    initial: null,
    loading: null,
    error: null,
    results: null
};

function switchView(viewName) {
    Object.values(views).forEach(view => {
        if (view) view.classList.remove('active');
    });

    if (views[viewName]) {
        views[viewName].classList.add('active');
    }
}

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize view references
    views.initial = document.getElementById('initial-view');
    views.loading = document.getElementById('loading-view');
    views.error = document.getElementById('error-view');
    views.results = document.getElementById('results-view');

    // ==========================================
    // AUTHENTICATION EVENT LISTENERS
    // ==========================================

    // Check auth on startup
    checkAuth();

    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const rememberMe = document.getElementById('remember-me').checked;
            handleLogin(email, password, rememberMe);
        });
    }

    // Signup form
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const confirm = document.getElementById('signup-confirm').value;
            handleSignup(email, password, confirm);
        });
    }

    // Forgot password form
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('forgot-email').value;
            handleForgotPassword(email);
        });
    }

    // Toggle between forms
    const showSignupLink = document.getElementById('show-signup');
    if (showSignupLink) {
        showSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            showSignupForm();
        });
    }

    const showLoginLink = document.getElementById('show-login');
    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginForm();
        });
    }

    const forgotPasswordLink = document.getElementById('forgot-password-link');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            showForgotPasswordForm();
        });
    }

    const backToLoginLink = document.getElementById('back-to-login');
    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginForm();
        });
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Navigation buttons
    const navToDashboard = document.getElementById('nav-to-dashboard');
    const navToAnalyze = document.getElementById('nav-to-analyze');

    if (navToDashboard) {
        navToDashboard.addEventListener('click', () => navigateTo(PAGES.DASHBOARD));
    }

    if (navToAnalyze) {
        navToAnalyze.addEventListener('click', () => navigateTo(PAGES.ANALYZE));
    }

    // Analyze page buttons
    const analyzeBtn = document.getElementById('analyze-btn');
    const retryBtn = document.getElementById('retry-btn');

    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', startAnalysis);
    }

    if (retryBtn) {
        retryBtn.addEventListener('click', () => switchView('initial'));
    }

    // Rating buttons - FIXED: Disable after first click
    document.querySelectorAll('.rating-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const quality = parseInt(e.target.dataset.quality);
            // Disable all rating buttons to prevent multiple clicks
            document.querySelectorAll('.rating-btn').forEach(b => b.disabled = true);
            saveProgress(quality);
        });
    });

    // View All Patterns link
    const viewAllPatternsLink = document.getElementById('view-all-patterns');
    if (viewAllPatternsLink) {
        viewAllPatternsLink.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('patterns-detail');
        });
    }

    // Bottom navigation - Tab switching
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const nav = e.currentTarget.dataset.nav;
            if (nav === 'settings') {
                navigateTo(PAGES.SETTINGS);
            } else {
                // Switch tabs within dashboard
                switchTab(nav);
            }
        });
    });

    // Settings page handlers
    const settingsBackBtn = document.getElementById('settings-back-btn');
    if (settingsBackBtn) {
        settingsBackBtn.addEventListener('click', () => {
            // Go back to dashboard if came from there, otherwise analyze
            navigateTo(currentPage === PAGES.SETTINGS ? PAGES.DASHBOARD : currentPage);
        });
    }

    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }

    const testConnectionBtn = document.getElementById('test-connection-btn');
    if (testConnectionBtn) {
        testConnectionBtn.addEventListener('click', testConnection);
    }

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', (e) => {
            const themeLabel = document.getElementById('theme-label');
            if (themeLabel) {
                themeLabel.textContent = e.target.checked ? 'Light' : 'Dark';
            }
        });
    }

    // Load settings on startup
    loadSettings();

    // Check backend connection
    checkBackendConnection();
});

// ==========================================
// BACKEND CONNECTION
// ==========================================

async function checkBackendConnection() {
    const statusEl = document.getElementById('connection-status');
    if (!statusEl) return;

    try {
        const isConnected = await API.checkConnection();
        statusEl.style.background = isConnected ? '#30d158' : '#ff453a';
        statusEl.title = isConnected ? 'Backend Connected' : 'Backend Disconnected';
    } catch (error) {
        statusEl.style.background = '#ff453a';
        statusEl.title = 'Backend Disconnected';
    }
}

// ==========================================
// ANALYZE FEATURE
// ==========================================

async function startAnalysis() {
    switchView('loading');

    try {
        // 1. Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab) {
            throw new Error('No active tab found.');
        }

        // 2. Check if on LeetCode
        if (!tab.url || !tab.url.includes('leetcode.com/problems')) {
            throw new Error('Please navigate to a LeetCode problem page first.');
        }

        // 3. Request problem data from content script
        const problemData = await new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tab.id, { action: 'scrape_problem' }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error('Could not connect to page. Try reloading the LeetCode page.'));
                } else if (response && response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response?.error || 'Failed to scrape problem data.'));
                }
            });
        });

        // Store for later use
        currentProblemData = problemData;

        // 4. Send to backend for analysis
        const analysisResults = await API.analyze(problemData);

        // 5. Display results
        renderResults(analysisResults, problemData);
        switchView('results');

        // Reset save status and re-enable rating buttons for new problem
        const saveStatus = document.getElementById('save-status');
        if (saveStatus) {
            saveStatus.textContent = '';
        }

        // Re-enable rating buttons for new analysis
        document.querySelectorAll('.rating-btn').forEach(b => b.disabled = false);

    } catch (error) {
        console.error('Analysis error:', error);

        // Show error toast with retry option
        showError(error, () => startAnalysis());

        // Also show error view for visibility
        showErrorView(getErrorMessage(error));
    }
}

function renderResults(data, problemData) {
    // Set problem info
    const titleEl = document.getElementById('problem-title');
    const difficultyEl = document.getElementById('problem-difficulty');

    if (titleEl && problemData) {
        titleEl.textContent = problemData.title;
    }

    if (difficultyEl && problemData) {
        difficultyEl.textContent = problemData.difficulty;
        difficultyEl.className = 'difficulty-badge';
        difficultyEl.classList.add(problemData.difficulty.toLowerCase());
    }

    // Render patterns
    const patternBadges = document.getElementById('pattern-badges');
    if (patternBadges) {
        patternBadges.innerHTML = '';

        if (data.patterns && data.patterns.length > 0) {
            data.patterns.forEach(pattern => {
                const badge = document.createElement('div');
                badge.className = 'pattern-badge';

                const confidenceClass = getConfidenceClass(pattern.confidence);

                badge.innerHTML = `
                    <span class="confidence-dot ${confidenceClass}"></span>
                    ${pattern.name}
                `;

                patternBadges.appendChild(badge);
            });
        } else {
            patternBadges.innerHTML = '<span style="color: var(--text-secondary); font-size: 12px;">No patterns detected</span>';
        }
    }

    // Render complexity
    const timeComplexity = document.getElementById('time-complexity');
    const spaceComplexity = document.getElementById('space-complexity');

    if (timeComplexity) {
        timeComplexity.textContent = data.time_complexity || 'N/A';
    }

    if (spaceComplexity) {
        spaceComplexity.textContent = data.space_complexity || 'N/A';
    }

    // Render key insight
    const keyInsight = document.getElementById('key-insight');
    if (keyInsight) {
        keyInsight.textContent = data.key_insight || 'No specific insights available.';
    }
}

function getConfidenceClass(score) {
    if (score >= 0.8) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
}

function showErrorView(message) {
    const errorMessage = document.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
    }
    switchView('error');
}

// ==========================================
// SAVE PROGRESS
// ==========================================

async function saveProgress(quality) {
    if (!currentProblemData) {
        console.error('No problem data to save');
        showToast('No problem data to save', 'error');
        return;
    }

    const statusEl = document.getElementById('save-status');
    if (!statusEl) return;

    statusEl.textContent = 'Saving...';
    statusEl.className = 'save-status';

    try {
        const result = await API.solve({
            title: currentProblemData.title,
            difficulty: currentProblemData.difficulty,
            quality: quality,
            url: currentProblemData.url
        });

        // Show success animation
        showSuccessAnimation('Progress Saved!');

        // Show toast with next review info
        showToast(`Next review in ${result.interval_days} day${result.interval_days === 1 ? '' : 's'}!`, 'success');

        statusEl.textContent = `✓ Saved! Next review in ${result.interval_days} day${result.interval_days === 1 ? '' : 's'}.`;
        statusEl.className = 'save-status success';

        // Keep buttons disabled after successful save

        // Update connection status after saving
        setTimeout(checkBackendConnection, 500);

    } catch (error) {
        console.error('Save error:', error);

        // Show error with retry option
        showError(error, () => saveProgress(quality));

        statusEl.textContent = '✗ Error saving progress.';
        statusEl.className = 'save-status error';

        // Re-enable buttons on error so user can retry
        document.querySelectorAll('.rating-btn').forEach(b => b.disabled = false);
    }
}

// ==========================================
// DASHBOARD DATA LOADING
// ==========================================

async function loadDashboardData() {
    try {
        // Load all dashboard data in parallel
        const [stats, todayProblems, heatmapData, patterns] = await Promise.allSettled([
            API.getStats(),
            API.getToday(),
            API.getHeatmap(),
            API.getPatterns()
        ]);

        // Render stats
        if (stats.status === 'fulfilled') {
            renderStats(stats.value);
        }

        // Render today's reviews
        if (todayProblems.status === 'fulfilled') {
            renderTodayReviews(todayProblems.value);
        }

        // Render heatmap
        if (heatmapData.status === 'fulfilled') {
            renderHeatmap(heatmapData.value);
        }

        // Render patterns
        if (patterns.status === 'fulfilled') {
            renderPatterns(patterns.value);
        }

    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function renderStats(data) {
    // Streak - with animation
    const streakEl = document.getElementById('stat-streak');
    if (streakEl) {
        animateNumber(streakEl, data.streak || 0);
    }

    const streakProgress = document.getElementById('streak-progress');
    if (streakProgress) {
        const percentage = Math.min(((data.streak || 0) / 30) * 100, 100);
        streakProgress.style.width = `${percentage}%`;
    }

    // Due Today - with animation
    const dueEl = document.getElementById('stat-due');
    if (dueEl) {
        animateNumber(dueEl, data.due_today || 0);
    }

    const overdueText = document.getElementById('overdue-text');
    if (overdueText && data.overdue && data.overdue > 0) {
        overdueText.textContent = `${data.overdue} overdue`;
    }

    // Solved This Week - with animation
    const solvedEl = document.getElementById('stat-solved');
    if (solvedEl) {
        animateNumber(solvedEl, data.solved_this_week || 0);
    }

    // Mastery - with animation
    const masteryEl = document.getElementById('stat-mastery');
    if (masteryEl) {
        const masteryPercent = Math.round((data.mastery_rate || 0) * 100);
        animateNumber(masteryEl, masteryPercent);

        // Add % after animation completes
        setTimeout(() => {
            if (masteryEl.textContent && !masteryEl.textContent.includes('%')) {
                masteryEl.textContent += '%';
            }
        }, 850);
    }
}

function renderTodayReviews(data) {
    const reviewsList = document.getElementById('reviews-list');
    if (!reviewsList) return;

    if (!data.problems || data.problems.length === 0) {
        reviewsList.innerHTML = `
            <div class="empty-state">
                <p>No reviews due today! 🎉</p>
            </div>
        `;
        return;
    }

    reviewsList.innerHTML = '';

    // Show max 5 reviews
    const reviewsToShow = data.problems.slice(0, 5);

    reviewsToShow.forEach(review => {
        const reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';

        // Calculate if overdue
        const today = new Date().toISOString().split('T')[0];
        const reviewDate = review.next_review;
        const isOverdue = reviewDate < today;

        const statusClass = isOverdue ? 'overdue' : 'due';
        const statusText = isOverdue ? '🔴 Overdue' : '🔵 Due Today';

        reviewItem.innerHTML = `
            <div class="review-header">
                <span class="review-title">${review.title}</span>
                <span class="review-badge ${review.difficulty.toLowerCase()}">${review.difficulty}</span>
            </div>
            <div class="review-meta">
                <span class="review-tag">${review.status || 'General'}</span>
                <span class="review-status ${statusClass}">${statusText}</span>
            </div>
            <button class="review-btn">Review →</button>
        `;

        reviewsList.appendChild(reviewItem);
    });
}

function renderHeatmap(data) {
    const container = document.getElementById('heatmap-container');
    const summary = document.getElementById('heatmap-summary');

    if (!container) return;

    // Backend returns {"2025-01-15": 3, "2025-01-16": 5, ...}
    if (!data || Object.keys(data).length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 12px;">No activity data yet</p>';
        if (summary) summary.textContent = 'Start solving to build your streak!';
        return;
    }

    container.innerHTML = '';

    // Calculate date range for last 26 weeks (182 days)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 181); // 182 days including today

    // Find max count for scaling
    const counts = Object.values(data);
    const maxCount = Math.max(...counts, 1);

    // Calculate total for summary
    const totalSolved = counts.reduce((sum, count) => sum + count, 0);

    // Generate cells for each day
    for (let i = 0; i < 182; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD

        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';

        // Get count for this date
        const count = data[dateStr] || 0;

        // Calculate level (0-4) based on count
        let level = 0;
        if (count > 0) {
            if (maxCount <= 1) {
                level = 4;
            } else {
                level = Math.min(4, Math.ceil((count / maxCount) * 4));
            }
        }

        cell.classList.add(`level-${level}`);
        cell.title = `${dateStr}: ${count} problem${count !== 1 ? 's' : ''}`;

        container.appendChild(cell);
    }

    // Update summary
    if (summary) {
        const year = new Date().getFullYear();
        summary.textContent = `${totalSolved} problem${totalSolved !== 1 ? 's' : ''} solved in ${year}`;
    }
}

function renderPatterns(data) {
    const patternsList = document.getElementById('patterns-list');
    if (!patternsList) return;

    if (!data.patterns || data.patterns.length === 0) {
        patternsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 12px;">No pattern data yet</p>';
        return;
    }

    patternsList.innerHTML = '';

    // Show top 5 patterns
    const patternsToShow = data.patterns.slice(0, 5);

    patternsToShow.forEach(pattern => {
        const item = document.createElement('div');
        item.className = 'pattern-item';

        item.innerHTML = `
            <div class="pattern-header">
                <span class="pattern-name">${pattern.name}</span>
                <span class="pattern-stats">${pattern.solved}/${pattern.total} ${pattern.percentage}%</span>
            </div>
            <div class="pattern-progress-bar">
                <div class="pattern-progress-fill" style="width: ${pattern.percentage}%"></div>
            </div>
        `;

        patternsList.appendChild(item);
    });
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} overdue`;
    } else if (diffDays === 0) {
        return 'Due today';
    } else {
        return `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
    }
}

// ==========================================
// SETTINGS MANAGEMENT
// ==========================================

// Default settings
const DEFAULT_SETTINGS = {
    dailyGoal: 5,
    theme: 'dark',
    notifications: false,
    backendUrl: 'http://localhost:8000'
};

/**
 * Load settings from chrome.storage.local
 */
async function loadSettings() {
    try {
        const result = await chrome.storage.local.get('settings');
        const settings = result.settings || DEFAULT_SETTINGS;

        // Apply settings to UI
        const dailyGoalInput = document.getElementById('daily-goal');
        if (dailyGoalInput) {
            dailyGoalInput.value = settings.dailyGoal || DEFAULT_SETTINGS.dailyGoal;
        }

        const themeToggle = document.getElementById('theme-toggle');
        const themeLabel = document.getElementById('theme-label');
        if (themeToggle) {
            const isLight = settings.theme === 'light';
            themeToggle.checked = isLight;
            if (themeLabel) {
                themeLabel.textContent = isLight ? 'Light' : 'Dark';
            }
            // Apply theme to body
            applyTheme(settings.theme);
        }

        const notificationsToggle = document.getElementById('notifications-toggle');
        if (notificationsToggle) {
            notificationsToggle.checked = settings.notifications || false;
        }

        const backendUrlInput = document.getElementById('backend-url');
        if (backendUrlInput) {
            backendUrlInput.value = settings.backendUrl || DEFAULT_SETTINGS.backendUrl;
        }

        // Update global API base URL if different
        if (settings.backendUrl && settings.backendUrl !== API_BASE) {
            // Note: API_BASE is in api.js - we'd need to make it mutable or reload
            console.log('Backend URL setting:', settings.backendUrl);
        }

    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

/**
 * Save settings to chrome.storage.local
 */
async function saveSettings() {
    const statusEl = document.getElementById('settings-save-status');

    try {
        const dailyGoal = parseInt(document.getElementById('daily-goal').value) || DEFAULT_SETTINGS.dailyGoal;
        const theme = document.getElementById('theme-toggle').checked ? 'light' : 'dark';
        const notifications = document.getElementById('notifications-toggle').checked;
        const backendUrl = document.getElementById('backend-url').value || DEFAULT_SETTINGS.backendUrl;

        const settings = {
            dailyGoal,
            theme,
            notifications,
            backendUrl
        };

        // Save to chrome.storage
        await chrome.storage.local.set({ settings });

        // Apply theme
        applyTheme(theme);

        // Show success message
        if (statusEl) {
            statusEl.textContent = '✓ Settings saved successfully!';
            statusEl.style.color = '#30d158';

            setTimeout(() => {
                statusEl.textContent = '';
            }, 3000);
        }

        console.log('Settings saved:', settings);

    } catch (error) {
        console.error('Error saving settings:', error);
        if (statusEl) {
            statusEl.textContent = '✗ Failed to save settings';
            statusEl.style.color = '#ff453a';
        }
    }
}

/**
 * Test connection to backend
 */
async function testConnection() {
    const badge = document.getElementById('settings-connection-status');
    const dot = badge?.querySelector('.status-dot');
    const text = badge?.querySelector('.status-text');

    if (!badge || !dot || !text) return;

    // Show checking state
    badge.className = 'connection-badge';
    text.textContent = 'Testing...';

    try {
        const backendUrl = document.getElementById('backend-url').value;
        const response = await fetch(`${backendUrl}/`, { method: 'GET' });

        if (response.ok) {
            badge.classList.add('connected');
            text.textContent = 'Connected';
        } else {
            badge.classList.add('disconnected');
            text.textContent = 'Failed';
        }
    } catch (error) {
        badge.classList.add('disconnected');
        text.textContent = 'Disconnected';
        console.error('Connection test failed:', error);
    }
}

/**
 * Apply theme to the popup
 */
function applyTheme(theme) {
    if (theme === 'light') {
        // For now, we keep dark theme (light theme would require CSS variable overrides)
        console.log('Light theme not yet implemented');
        // TODO: Implement light theme CSS variables
    } else {
        // Dark theme is default
    }
}

// ==========================================
// TAB RENDERING FUNCTIONS
// ==========================================

/**
 * Render Problems Tab
 */
function renderProblemsTab(data) {
    const problemsList = document.getElementById('problems-list');
    const problemCountBadge = document.getElementById('problem-count-badge');

    if (!data || !data.problems || data.problems.length === 0) {
        problemsList.innerHTML = `
            <div class="empty-state">
                <p>No problems tracked yet</p>
                <p style="font-size: 12px; color: var(--text-tertiary);">Analyze some problems to see them here!</p>
            </div>
        `;
        if (problemCountBadge) problemCountBadge.textContent = '0';
        return;
    }

    if (problemCountBadge) {
        problemCountBadge.textContent = data.total || data.problems.length;
    }

    renderProblemsList(data.problems);
    setupProblemFilters(data.problems);
}

function renderProblemsList(problems) {
    const problemsList = document.getElementById('problems-list');
    problemsList.innerHTML = '';

    problems.forEach(problem => {
        const card = document.createElement('div');
        card.className = 'problem-card';
        card.onclick = () => window.open(problem.url, '_blank');

        const patternsHTML = problem.patterns && problem.patterns.length > 0
            ? problem.patterns.map(p => `<span class="problem-pattern-tag">${p}</span>`).join('')
            : '<span class="problem-pattern-tag">No patterns</span>';

        card.innerHTML = `
            <div class="problem-header">
                <span class="problem-title">${problem.title}</span>
                <span class="problem-difficulty ${problem.difficulty.toLowerCase()}">${problem.difficulty}</span>
            </div>
            <div class="problem-meta">
                Status: ${problem.status || 'new'} • Next: ${problem.next_review || 'Not scheduled'}
            </div>
            <div class="problem-patterns">${patternsHTML}</div>
        `;

        problemsList.appendChild(card);
    });
}

function setupProblemFilters(allProblems) {
    const difficultyFilter = document.getElementById('filter-difficulty');
    const statusFilter = document.getElementById('filter-status');
    const searchInput = document.getElementById('search-problems');

    if (!difficultyFilter || !statusFilter || !searchInput) return;

    function filterProblems() {
        const difficulty = difficultyFilter.value;
        const status = statusFilter.value;
        const searchTerm = searchInput.value.toLowerCase();

        const filtered = allProblems.filter(p => {
            const matchesDifficulty = difficulty === 'all' || p.difficulty.toLowerCase() === difficulty;
            const matchesStatus = status === 'all' || p.status === status;
            const matchesSearch = !searchTerm || p.title.toLowerCase().includes(searchTerm);

            return matchesDifficulty && matchesStatus && matchesSearch;
        });

        renderProblemsList(filtered);
    }

    difficultyFilter.addEventListener('change', filterProblems);
    statusFilter.addEventListener('change', filterProblems);
    searchInput.addEventListener('input', filterProblems);
}

/**
 * Render Stats Tab
 */
function renderStatsTab(data) {
    // Overview stats
    document.getElementById('total-problems').textContent = data.total_problems || 0;
    document.getElementById('problems-mastered').textContent =
        `${data.mastered || 0} (${data.mastery_percentage || 0}%)`;
    document.getElementById('current-streak-detail').textContent =
        `${data.current_streak || 0} days`;
    document.getElementById('longest-streak').textContent =
        `${data.longest_streak || 0} days`;
    document.getElementById('total-reviews').textContent = data.total_reviews || 0;

    // Weekly chart
    if (data.weekly_activity) {
        renderWeeklyChart(data.weekly_activity);
    }

    // Difficulty breakdown
    if (data.by_difficulty) {
        renderDifficultyBreakdown(data.by_difficulty);
    }
}

function renderWeeklyChart(weeklyData) {
    const chartContainer = document.getElementById('weekly-chart');
    if (!chartContainer) return;

    chartContainer.innerHTML = '';

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const maxCount = Math.max(...weeklyData.map(d => d.count || 0), 1);

    weeklyData.forEach((day, i) => {
        const dayEl = document.createElement('div');
        dayEl.className = 'week-day';

        const count = day.count || 0;
        const width = (count / maxCount) * 100;

        dayEl.innerHTML = `
            <span class="week-day-label">${days[i] || day.day}</span>
            <div class="week-day-bar-container">
                <div class="week-day-bar" style="width: ${width}%"></div>
            </div>
            <span class="week-day-count">${count}</span>
        `;

        chartContainer.appendChild(dayEl);
    });
}

function renderDifficultyBreakdown(difficultyData) {
    // Easy
    const easyCount = document.getElementById('easy-count');
    const easyProgress = document.getElementById('easy-progress');
    if (easyCount && easyProgress) {
        easyCount.textContent = `${difficultyData.easy?.count || 0} (${difficultyData.easy?.percentage || 0}%)`;
        easyProgress.style.width = `${difficultyData.easy?.percentage || 0}%`;
    }

    // Medium
    const mediumCount = document.getElementById('medium-count');
    const mediumProgress = document.getElementById('medium-progress');
    if (mediumCount && mediumProgress) {
        mediumCount.textContent = `${difficultyData.medium?.count || 0} (${difficultyData.medium?.percentage || 0}%)`;
        mediumProgress.style.width = `${difficultyData.medium?.percentage || 0}%`;
    }

    // Hard
    const hardCount = document.getElementById('hard-count');
    const hardProgress = document.getElementById('hard-progress');
    if (hardCount && hardProgress) {
        hardCount.textContent = `${difficultyData.hard?.count || 0} (${difficultyData.hard?.percentage || 0}%)`;
        hardProgress.style.width = `${difficultyData.hard?.percentage || 0}%`;
    }
}

/**
 * Render Patterns Detail Tab
 */
function renderPatternsDetailTab(data) {
    const patternsList = document.getElementById('patterns-detail-list');
    if (!patternsList) return;

    if (!data || !data.patterns || data.patterns.length === 0) {
        patternsList.innerHTML = `
            <div class="empty-state">
                <p>No patterns detected yet</p>
                <p style="font-size: 12px; color: var(--text-tertiary);">Solve problems to track pattern mastery!</p>
            </div>
        `;
        return;
    }

    patternsList.innerHTML = '';

    // Pattern emojis mapping
    const patternEmojis = {
        'Two Pointers': '🎯',
        'Hash Map': '🗂️',
        'Binary Search': '🔍',
        'Dynamic Programming': '📊',
        'Sliding Window': '🪟',
        'Stack': '📚',
        'Queue': '📋',
        'Tree': '🌳',
        'Graph': '🕸️',
        'Backtracking': '🔙',
        'Greedy': '💰',
        'DFS': '🌲',
        'BFS': '🌊'
    };

    data.patterns.forEach(pattern => {
        const card = document.createElement('div');
        card.className = 'pattern-detail-card';

        const emoji = patternEmojis[pattern.name] || '🎯';
        const masteryLevel = getMasteryLevel(pattern.percentage);

        card.innerHTML = `
            <div class="pattern-detail-header">
                <span class="pattern-emoji">${emoji}</span>
                <span class="pattern-detail-name">${pattern.name}</span>
            </div>
            <div class="pattern-detail-progress-bar">
                <div class="pattern-detail-progress-fill" style="width: ${pattern.percentage}%"></div>
            </div>
            <div class="pattern-detail-stats">
                <span>${pattern.solved}/${pattern.total} (${pattern.percentage}%)</span>
                <span class="pattern-mastery-level">Status: ${masteryLevel}</span>
            </div>
        `;

        patternsList.appendChild(card);
    });
}

function getMasteryLevel(percentage) {
    if (percentage >= 80) return 'Expert';
    if (percentage >= 60) return 'Advanced';
    if (percentage >= 40) return 'Intermediate';
    return 'Beginner';
}

// ==========================================
// UX POLISH & MICRO-INTERACTIONS
// ==========================================

/**
 * Show skeleton loading state
 */
function showSkeleton(containerId, type = 'card', count = 3) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let skeletonHTML = '';

    switch (type) {
        case 'card':
            skeletonHTML = Array(count).fill('<div class="skeleton-card skeleton"></div>').join('');
            break;
        case 'stat':
            skeletonHTML = Array(count).fill('<div class="skeleton-stat-card skeleton"></div>').join('');
            break;
        case 'text':
            skeletonHTML = Array(count).fill(`
                <div class="skeleton-text skeleton"></div>
                <div class="skeleton-text skeleton short"></div>
            `).join('');
            break;
    }

    container.innerHTML = skeletonHTML;
}

/**
 * Show success animation overlay
 */
function showSuccessAnimation(message = 'Success!') {
    const overlay = document.createElement('div');
    overlay.className = 'success-overlay';
    overlay.innerHTML = `
        <div class="success-animation">
            <div class="checkmark">
                <svg width="24" height="24" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" fill="none"/>
                </svg>
            </div>
            <span class="success-text">${message}</span>
        </div>
    `;

    document.body.appendChild(overlay);

    setTimeout(() => {
        overlay.remove();
    }, 1500);
}

/**
 * Animate number count-up
 */
function animateNumber(element, target, duration = 800) {
    if (!element) return;

    const start = parseInt(element.textContent) || 0;
    const startTime = performance.now();

    // Add updating class for scale effect
    element.classList.add('updating');

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out quad
        const easeOut = 1 - (1 - progress) * (1 - progress);
        const current = Math.floor(start + (target - start) * easeOut);

        element.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = target;
            element.classList.remove('updating');
        }
    }

    requestAnimationFrame(update);
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info', duration = 3000) {
    let container = document.querySelector('.toast-container');

    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toast-out 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Get user-friendly error message
 */
function getErrorMessage(error) {
    const message = error.message || error.toString();

    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        return 'Cannot connect to server. Check your internet connection.';
    }
    if (message.includes('timeout') || message.includes('AbortError')) {
        return 'Request timed out. Please try again.';
    }
    if (message.includes('401') || message.includes('Unauthorized')) {
        return 'Session expired. Please log in again.';
    }
    if (message.includes('500') || message.includes('Internal Server Error')) {
        return 'Server error. Please try again later.';
    }
    if (message.includes('404')) {
        return 'Resource not found. Please try again.';
    }
    return 'Something went wrong. Please try again.';
}

/**
 * Show error with retry option
 */
function showError(error, retryCallback = null) {
    const message = getErrorMessage(error);

    const errorEl = document.createElement('div');
    errorEl.className = 'error-toast';
    errorEl.innerHTML = `
        <span class="error-icon">⚠️</span>
        <span class="error-message">${message}</span>
        ${retryCallback ? '<button class="retry-btn">Retry</button>' : ''}
    `;

    if (retryCallback) {
        errorEl.querySelector('.retry-btn').onclick = () => {
            errorEl.remove();
            retryCallback();
        };
    }

    document.body.appendChild(errorEl);

    setTimeout(() => {
        if (errorEl.parentNode) {
            errorEl.remove();
        }
    }, 5000);
}

/**
 * Empty state configurations
 */
const emptyStates = {
    problems: {
        icon: '📚',
        title: 'No problems yet',
        message: 'Start analyzing LeetCode problems to track your progress!',
        action: { text: 'Analyze First Problem', handler: () => navigateTo(PAGES.ANALYZE) }
    },
    reviews: {
        icon: '🎉',
        title: 'All caught up!',
        message: 'No problems due for review today.',
        action: null
    },
    patterns: {
        icon: '🎯',
        title: 'No patterns detected',
        message: 'Analyze more problems to see pattern insights.',
        action: null
    },
    stats: {
        icon: '📊',
        title: 'No data yet',
        message: 'Start solving problems to see your statistics!',
        action: null
    }
};

/**
 * Show empty state
 */
function showEmptyState(containerId, type) {
    const state = emptyStates[type];
    if (!state) return;

    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">${state.icon}</div>
            <h3>${state.title}</h3>
            <p>${state.message}</p>
            ${state.action ? `<button class="action-btn">${state.action.text}</button>` : ''}
        </div>
    `;

    if (state.action) {
        const btn = container.querySelector('.action-btn');
        if (btn) {
            btn.onclick = state.action.handler;
        }
    }
}

/**
 * Keyboard shortcuts handler
 */
document.addEventListener('keydown', (e) => {
    // Only when not in input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Tab switching (1-5 keys)
    if (currentPage === PAGES.DASHBOARD) {
        switch (e.key) {
            case '1':
                switchTab('dashboard');
                break;
            case '2':
                switchTab('problems');
                break;
            case '3':
                switchTab('stats');
                break;
            case '4':
                switchTab('patterns-detail');
                break;
            case '5':
                navigateTo(PAGES.SETTINGS);
                break;
        }
    }

    // Global shortcuts
    if (e.key === 'Escape') {
        if (currentPage === PAGES.DASHBOARD) {
            navigateTo(PAGES.ANALYZE);
        } else if (currentPage === PAGES.SETTINGS) {
            navigateTo(PAGES.DASHBOARD);
        }
    }

    // Analyze page shortcuts
    if (currentPage === PAGES.ANALYZE && e.key === 'a') {
        const analyzeBtn = document.getElementById('analyze-btn');
        if (analyzeBtn && !analyzeBtn.disabled) {
            analyzeBtn.click();
        }
    }
});

/**
 * Monitor backend connection status
 */
let connectionCheckInterval = null;

async function startConnectionMonitoring() {
    const indicator = document.getElementById('connection-status');
    if (!indicator) return;

    // Check immediately
    await checkConnectionStatus();

    // Then check every 30 seconds
    if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
    }

    connectionCheckInterval = setInterval(async () => {
        await checkConnectionStatus();
    }, 30000);
}

async function checkConnectionStatus() {
    const indicator = document.getElementById('connection-status');
    if (!indicator) return;

    indicator.className = 'status-indicator checking';

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${API_BASE}/`, {
            method: 'HEAD',
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            indicator.className = 'status-indicator connected';
            indicator.title = 'Connected to server';
        } else {
            indicator.className = 'status-indicator disconnected';
            indicator.title = 'Server unreachable';
        }
    } catch (error) {
        indicator.className = 'status-indicator disconnected';
        indicator.title = 'Disconnected from server';
    }
}

/**
 * Add staggered animation to list items
 */
function addStaggeredAnimation(items) {
    items.forEach((item, index) => {
        item.classList.add('animate-in');
        if (index < 3) {
            item.classList.add(`animate-in-delay-${index + 1}`);
        }
    });
}

// Start connection monitoring when extension loads
if (typeof API_BASE !== 'undefined') {
    startConnectionMonitoring();
}
