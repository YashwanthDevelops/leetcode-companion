document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const views = {
        initial: document.getElementById('initial-view'),
        loading: document.getElementById('loading-view'),
        error: document.getElementById('error-view'),
        results: document.getElementById('results-view')
    };

    const analyzeBtn = document.getElementById('analyze-btn');
    const retryBtn = document.getElementById('retry-btn');
    const errorMessage = document.querySelector('.error-message');

    // Event Listeners
    analyzeBtn.addEventListener('click', startAnalysis);
    retryBtn.addEventListener('click', () => switchView('initial'));

    document.querySelectorAll('.rating-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const quality = parseInt(e.target.dataset.quality);
            saveProgress(quality);
        });
    });

    // Initial Load
    fetchStats();

    function switchView(viewName) {
        Object.values(views).forEach(el => el.classList.add('hidden'));
        views[viewName].classList.remove('hidden');
    }

    // Global variable to store current problem data for saving
    let currentProblemData = null;

    async function fetchStats() {
        try {
            const response = await fetch('http://localhost:8000/stats');
            if (response.ok) {
                const data = await response.json();
                const statsBar = document.getElementById('stats-bar');
                if (statsBar) {
                    statsBar.classList.remove('hidden');
                    document.getElementById('streak-count').textContent = data.streak;
                    document.getElementById('due-count').textContent = data.due_today;
                }

                // Update connection status
                const statusEl = document.getElementById('connection-status');
                statusEl.style.backgroundColor = '#4ade80'; // Green
                statusEl.title = "Connected to Backend";
            }
        } catch (error) {
            console.log("Backend not reachable for stats");
            const statusEl = document.getElementById('connection-status');
            statusEl.style.backgroundColor = '#ef4444'; // Red
            statusEl.title = "Backend Disconnected";
        }
    }

    async function startAnalysis() {
        switchView('loading');

        try {
            // 1. Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab) {
                throw new Error("No active tab found.");
            }

            // Check if we are on LeetCode
            if (!tab.url.includes("leetcode.com/problems")) {
                throw new Error("Please navigate to a LeetCode problem page.");
            }

            // 2. Request data from content script
            const problemData = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tab.id, { action: "scrape_problem" }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error("Could not connect to page. Try reloading the page."));
                    } else if (response && response.success) {
                        resolve(response);
                    } else {
                        reject(new Error(response?.error || "Failed to scrape problem data."));
                    }
                });
            });

            currentProblemData = problemData; // Store for saving later

            // 3. Send to Backend
            const analysisResults = await fetchAnalysisFromBackend(problemData);

            // 4. Render Results
            renderResults(analysisResults);
            switchView('results');

            // Reset save status
            document.getElementById('save-status').textContent = '';

        } catch (error) {
            showError(error.message);
        }
    }

    async function fetchAnalysisFromBackend(data) {
        try {
            const response = await fetch('http://localhost:8000/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: data.title,
                    description: data.description,
                    difficulty: data.difficulty,
                    url: data.url
                })
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(error);
            if (error.message.includes("Failed to fetch")) {
                throw new Error("Could not connect to backend. Is it running on port 8000?");
            }
            throw error;
        }
    }

    async function saveProgress(quality) {
        if (!currentProblemData) return;

        const statusEl = document.getElementById('save-status');
        statusEl.textContent = 'Saving...';
        statusEl.style.color = 'var(--text-secondary)';

        try {
            const response = await fetch('http://localhost:8000/solve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: currentProblemData.title,
                    difficulty: currentProblemData.difficulty,
                    quality: quality,
                    url: currentProblemData.url
                })
            });

            if (!response.ok) throw new Error('Save failed');

            const result = await response.json();
            statusEl.textContent = `Saved! Next review in ${result.interval_days} days.`;
            statusEl.style.color = '#4ade80'; // Success green

        } catch (error) {
            console.error(error);
            statusEl.textContent = 'Error saving progress.';
            statusEl.style.color = '#ef4444'; // Error red
        }
    }

    function renderResults(data) {
        // Clear previous
        const badgesContainer = document.getElementById('pattern-badges');
        badgesContainer.innerHTML = '';

        // Patterns
        if (data.patterns && data.patterns.length > 0) {
            data.patterns.forEach(pattern => {
                const badge = document.createElement('div');
                badge.className = 'badge';
                // Confidence color mapping
                const confidenceClass = getConfidenceClass(pattern.confidence);

                badge.innerHTML = `
                    <span class="confidence-dot ${confidenceClass}"></span>
                    ${pattern.name}
                `;
                badgesContainer.appendChild(badge);
            });
        } else {
            badgesContainer.innerHTML = '<span style="color:var(--text-secondary); font-size:12px;">No specific patterns detected.</span>';
        }

        // Complexity
        document.getElementById('time-complexity').textContent = data.time_complexity || "N/A";
        document.getElementById('space-complexity').textContent = data.space_complexity || "N/A";

        // Insight
        document.getElementById('key-insight').textContent = data.key_insight || "No insights available.";
    }

    function getConfidenceClass(score) {
        if (score >= 0.8) return 'confidence-high';
        if (score >= 0.5) return 'confidence-medium';
        return 'confidence-low';
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        switchView('error');
    }
});
