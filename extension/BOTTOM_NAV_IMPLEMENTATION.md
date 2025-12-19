# Bottom Navigation - Implementation Progress

## ✅ Completed (Steps 1-2)

### 1. HTML Structure ✅
**File**: `popup/popup.html`

Added 4 tab sections within dashboard page:
- `#tab-dashboard` - Dashboard overview (existing content)
- `#tab-problems` - All problems list with filters/search  
- `#tab-stats` - Detailed statistics 
- `#tab-patterns-detail` - Full pattern mastery list

Each tab has `.tab-section` class with `.active` for visibility control.

### 2. CSS Styles ✅
**File**: `popup/popup.css` (+362 lines)

Added comprehensive styles for:
- `.tab-section` - Tab visibility control
- Problems tab: filter-bar, search-input, problem-card, problem-patterns
- Stats tab: stat-rows, weekly-chart, difficulty-bars with progress
- Patterns tab: pattern-detail-card with progress bars
- Loading states and empty states

---

## 🚧 In Progress (Steps 3-5)

### 3. JavaScript - Tab Switching & Data Loading
**File**: `popup/popup.js`

Need to add:

```javascript
// Tab switching state
let currentTab = 'dashboard';
let tabDataCache = {};

// Bottom nav click handlers 
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.nav;
        switchTab(tab);
    });
});

// Switch tab function
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected tab
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.nav === tabName) {
            item.classList.add('active');
        }
    });
    
    currentTab = tabName;
    
    // Load tab data
    loadTabData(tabName);
}

// Load data for each tab
async function loadTabData(tabName) {
    // Check cache first
    if (tabDataCache[tabName]) {
        renderTabData(tabName, tabDataCache[tabName]);
        return;
    }
    
    try {
        let data;
        switch(tabName) {
            case 'dashboard':
                // Already loaded in loadDashboardData()
                break;
                
            case 'problems':
                data = await API.getProblems();
                tabDataCache.problems = data;
                renderProblemsTab(data);
                break;
                
            case 'stats':
                data = await API.getDetailedStats();
                tabDataCache.stats = data;
                renderStatsTab(data);
                break;
                
            case 'patterns':
                data = await API.getPatterns();
                tabDataCache.patterns = data;
                renderPatternsDetailTab(data);
                break;
                
            case 'settings':
                navigateTo(PAGES.SETTINGS);
                break;
        }
    } catch (error) {
        console.error(`Error loading ${tabName} data:`, error);
    }
}

// Render functions for each tab
function renderProblemsTab(data) {
    const problemsList = document.getElementById('problems-list');
    const problemCountBadge = document.getElementById('problem-count-badge');
    
    if (!data.problems || data.problems.length === 0) {
        problemsList.innerHTML = `
            <div class="empty-state">
                <p>No problems tracked yet</p>
            </div>
        `;
        return;
    }
    
    problemCountBadge.textContent = data.total || data.problems.length;
    
    problemsList.innerHTML = '';
    
    data.problems.forEach(problem => {
        const card = document.createElement('div');
        card.className = 'problem-card';
        card.onclick = () => window.open(problem.url, '_blank');
        
        card.innerHTML = `
            <div class="problem-header">
                <span class="problem-title">${problem.title}</span>
                <span class="problem-difficulty ${problem.difficulty.toLowerCase()}">${problem.difficulty}</span>
            </div>
            <div class="problem-meta">
                Status: ${problem.status} • Next: ${problem.next_review}
            </div>
            <div class="problem-patterns">
                ${problem.patterns.map(p => `
                    <span class="problem-pattern-tag">${p}</span>
                `).join('')}
            </div>
        `;
        
        problemsList.appendChild(card);
    });
    
    // Add filter/search handlers
    setupProblemFilters(data.problems);
}

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
    renderWeeklyChart(data.weekly_activity || []);
    
    // Difficulty breakdown
    if (data.by_difficulty) {
        renderDifficultyBreakdown(data.by_difficulty);
    }
}

function renderWeeklyChart(weeklyData) {
    const chartContainer = document.getElementById('weekly-chart');
    chartContainer.innerHTML = '';
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const maxCount = Math.max(...weeklyData.map(d => d.count), 1);
    
    weeklyData.forEach((day, i) => {
        const dayEl = document.createElement('div');
        dayEl.className = 'week-day';
        
        const width = (day.count / maxCount) * 100;
        
        dayEl.innerHTML = `
            <span class="week-day-label">${days[i]}</span>
            <div class="week-day-bar-container">
                <div class="week-day-bar" style="width: ${width}%"></div>
            </div>
            <span class="week-day-count">${day.count}</span>
        `;
        
        chartContainer.appendChild(dayEl);
    });
}

function renderDifficultyBreakdown(difficultyData) {
    // Easy
    document.getElementById('easy-count').textContent = 
        `${difficultyData.easy.count} (${difficultyData.easy.percentage}%)`;
    document.getElementById('easy-progress').style.width = 
        `${difficultyData.easy.percentage}%`;
    
    // Medium
    document.getElementById('medium-count').textContent = 
        `${difficultyData.medium.count} (${difficultyData.medium.percentage}%)`;
    document.getElementById('medium-progress').style.width = 
        `${difficultyData.medium.percentage}%`;
    
    // Hard
    document.getElementById('hard-count').textContent = 
        `${difficultyData.hard.count} (${difficultyData.hard.percentage}%)`;
    document.getElementById('hard-progress').style.width = 
        `${difficultyData.hard.percentage}%`;
}

function renderPatternsDetailTab(data) {
    const patternsList = document.getElementById('patterns-detail-list');
    
    if (!data.patterns || data.patterns.length === 0) {
        patternsList.innerHTML = `
            <div class="empty-state">
                <p>No patterns detected yet</p>
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
        'Backtracking': '🔙'
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

// Problem filters
function setupProblemFilters(problems) {
    const difficultyFilter = document.getElementById('filter-difficulty');
    const statusFilter = document.getElementById('filter-status');
    const searchInput = document.getElementById('search-problems');
    
    function filterProblems() {
        const difficulty = difficultyFilter.value;
        const status = statusFilter.value;
        const searchTerm = searchInput.value.toLowerCase();
        
        const filtered = problems.filter(p => {
            const matchesDifficulty = difficulty === 'all' || p.difficulty.toLowerCase() === difficulty;
            const matchesStatus = status === 'all' || p.status === status;
            const matchesSearch = p.title.toLowerCase().includes(searchTerm);
            
            return matchesDifficulty && matchesStatus && matchesSearch;
        });
        
        renderFilteredProblems(filtered);
    }
    
    difficultyFilter.addEventListener('change', filterProblems);
    statusFilter.addEventListener('change', filterProblems);
    searchInput.addEventListener('input', filterProblems);
}

function renderFilteredProblems(problems) {
    const problemsList = document.getElementById('problems-list');
    
    if (problems.length === 0) {
        problemsList.innerHTML = `
            <div class="empty-state">
                <p>No problems match your filters</p>
            </div>
        `;
        return;
    }
    
    problemsList.innerHTML = '';
    
    problems.forEach(problem => {
        const card = document.createElement('div');
        card.className = 'problem-card';
        card.onclick = () => window.open(problem.url, '_blank');
        
        card.innerHTML = `
            <div class="problem-header">
                <span class="problem-title">${problem.title}</span>
                <span class="problem-difficulty ${problem.difficulty.toLowerCase()}">${problem.difficulty}</span>
            </div>
            <div class="problem-meta">
                Status: ${problem.status} • Next: ${problem.next_review}
            </div>
            <div class="problem-patterns">
                ${problem.patterns.map(p => `
                    <span class="problem-pattern-tag">${p}</span>
                `).join('')}
            </div>
        `;
        
        problemsList.appendChild(card);
    });
}
```

### 4. API Service Updates  
**File**: `services/api.js`

Need to add:

```javascript
// Get all problems
async getProblems() {
    return this.apiCall('/problems');
},

// Get detailed stats
async getDetailedStats() {
    return this.apiCall('/stats/detailed');
}
```

### 5. Backend Endpoints
**File**: `backend/app/main.py`

Need to add 2 endpoints - See BACKEND_ENDPOINTS.md for full implementation

---

## 📝 Implementation Status

| Component | Status | Lines | Progress |
|-----------|--------|-------|----------|
| HTML Structure | ✅ Done | +200 | 100% |
| CSS Styles | ✅ Done | +362 | 100% |
| JavaScript Logic | ⏳ Ready | +~400 | 0% (code written above) |
| API Service | ⏳ Ready | +15 | 0% |
| Backend Endpoints | ⏳ Ready | +~150 | 0% |

---

## 🎯 Next Steps

1. Copy JavaScript code from this document into `popup.js`
2. Add API functions to `services/api.js`
3. Add backend endpoints to `main.py`
4. Test each tab individually
5. Test navigation between tabs
6. Test filters and search

---

## ⚠️ Important Notes

- Tab switching happens WITHIN the Dashboard page
- Settings button navigates to separate Settings page (already working)
- Data is cached to avoid unnecessary API calls
- Bottom nav active state updates on tab switch
- All tabs share the same header (with back button to Analyze)

---

## 🐛 Testing Checklist

- [ ] Tab switching works (all 4 tabs)
- [ ] Bottom nav active state updates
- [ ] Dashboard tab shows existing content
- [ ] Problems tab loads and displays cards
- [ ] Problem filters work (difficulty, status)
- [ ] Problem search works
- [ ] Stats tab shows all metrics
- [ ] Weekly chart renders
- [ ] Difficulty bars show correct percentages
- [ ] Patterns detail tab loads
- [ ] Patterns sorted by mastery
- [ ] Settings button still works
- [ ] Back button returns to Analyze

---

This is a substantial feature. The code is ready above - just needs to be integrated!
