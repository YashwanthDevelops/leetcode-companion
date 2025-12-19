# Quick Start Guide - LeetCode Companion Extension

## 🚀 Load the Extension

1. **Open Chrome Extensions Page**
   - Navigate to: `chrome://extensions/`
   - OR: Menu → More Tools → Extensions

2. **Enable Developer Mode**
   - Toggle "Developer mode" switch (top right)

3. **Load Extension**
   - Click "Load unpacked"
   - Navigate to: `c:\My Space\AI Work\LeetCode Companion\extension`
   - Click "Select Folder"

4. **Verify Installation**
   - ✅ Extension should appear in the list
   - ✅ Click the puzzle icon in Chrome toolbar
   - ✅ Pin the extension for easy access

---

## 🧪 Test the Extension

### Test 1: Analyze Feature

1. Go to: https://leetcode.com/problems/two-sum/
2. Click the LeetCode Companion extension icon
3. You should see the **Analyze Page** with:
   - Logo "LC Companion"
   - Connection status (green dot = connected, red = disconnected)
   - "Analyze Problem" button
4. Click "Analyze Problem"
5. **Expected**: Loading spinner → Results displayed
6. Click a difficulty rating (Easy/Medium/Hard)
7. **Expected**: "Saved! Next review in X days"

### Test 2: Dashboard Navigation

1. From Analyze page, click the grid icon (top right)
2. **Expected**: Dashboard page opens with:
   - Stats cards showing numbers
   - Today's reviews list
   - Activity heatmap
   - Pattern mastery section
   - Bottom navigation bar
3. Click the back arrow (top left)
4. **Expected**: Return to Analyze page

### Test 3: Backend Connection

Make sure your FastAPI backend is running:

```bash
cd "c:\My Space\AI Work\LeetCode Companion\backend"
.venv\Scripts\activate  # or: source .venv/bin/activate on Mac/Linux
uvicorn app.main:app --reload
```

**Backend should be at**: http://localhost:8000

---

## 📁 Extension File Structure

```
extension/
├── manifest.json              # Extension configuration
├── services/
│   └── api.js                 # API service (backend calls)
├── content-scripts/
│   └── leetcode-scraper.js    # Scrapes LeetCode pages
├── popup/
│   ├── popup.html             # Popup UI (2 pages)
│   ├── popup.css              # Styles (dark theme)
│   └── popup.js               # Logic and navigation
└── icons/
    └── (extension icons)
```

---

## 🔧 Troubleshooting

### Issue: Red connection status dot

**Solution**: 
- Make sure backend is running on port 8000
- Check: http://localhost:8000/docs
- Verify `.env` file has correct settings

### Issue: "Could not connect to page"

**Solution**:
- Reload the LeetCode page
- Reload the extension
- Make sure you're on a problem page (not /problemset/)

### Issue: Extension not showing up

**Solution**:
- Click puzzle icon in Chrome toolbar
- Pin the extension
- Refresh the extensions page

### Issue: Analysis not working

**Solution**:
- Check backend logs for errors
- Verify Gemini API key in `.env`
- Check browser console (F12) for errors

---

## 🎯 Key Features

### Analyze Page
- 🧠 AI-powered problem analysis
- 🎯 Pattern detection with confidence scores
- ⏱️ Time/Space complexity analysis
- 💡 Key insights from Gemini
- ⭐ Quality ratings (Easy/Medium/Hard)
- 💾 Automatic save to database

### Dashboard Page
- 🔥 Streak tracking
- 📚 Due today counter
- ✅ Weekly solved count
- 📈 Mastery percentage
- 📋 Today's review list
- 🟨 Activity heatmap
- 📊 Pattern mastery progress

---

## 🎨 UI Preview

### Analyze Page Features:
- Dark theme (#0a0a0a background)
- Gradient logo (Yellow → Orange)
- Loading spinner with message
- Pattern badges with confidence dots
- Complexity cards with monospace font
- Emoji rating buttons

### Dashboard Page Features:
- 2×2 stats grid with icons
- Color-coded difficulty badges
- Yellow review buttons
- GitHub-style heatmap
- Purple-blue gradient progress bars
- Bottom navigation bar

---

## 📞 Support

If you encounter issues:

1. Check browser console (F12 → Console)
2. Check backend logs
3. Verify API endpoints are working: http://localhost:8000/docs
4. Reload extension: `chrome://extensions/` → Reload icon
5. Restart browser if needed

---

## ✨ Next Steps

1. Test with different LeetCode problems
2. Verify data persistence in database
3. Check spaced repetition calculations
4. Test all dashboard features
5. Customize settings if needed

Enjoy your LeetCode journey with spaced repetition! 🚀
