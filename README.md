# 🧠 LeetCode Companion

A smart LeetCode practice assistant that uses **AI-powered pattern detection** and **spaced repetition** to help you master coding interviews efficiently.

![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green?logo=fastapi)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-yellow?logo=googlechrome)

---

## ✨ Features

- 🤖 **AI Pattern Detection** - Analyzes LeetCode problems using Google Gemini to identify algorithm patterns
- 📊 **Spaced Repetition (SM-2)** - Optimizes your review schedule for maximum retention
- 🔥 **Streak Tracking** - Stay motivated with daily streak and activity heatmap
- 🎯 **Smart Review Queue** - Know exactly which problems to review today
- 📈 **Progress Dashboard** - Beautiful React dashboard to visualize your journey

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     LeetCode Companion                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │   Chrome    │───▶│   FastAPI   │───▶│   React Dashboard   │  │
│  │  Extension  │    │   Backend   │    │   (Vite + TS)       │  │
│  └─────────────┘    └──────┬──────┘    └─────────────────────┘  │
│                            │                                    │
│                    ┌───────┴───────┐                            │
│                    ▼               ▼                            │
│             ┌──────────┐    ┌──────────┐                        │
│             │  Gemini  │    │ Supabase │                        │
│             │   API    │    │ Postgres │                        │
│             └──────────┘    └──────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Google Gemini API Key
- Supabase Account (free tier works)

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/leetcode-companion.git
cd leetcode-companion
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys
```

**Required Environment Variables:**
```env
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db
```

**Run the Server:**
```bash
uvicorn app.main:app --reload
```

### 3. Dashboard Setup

```bash
cd dashboard

# Install dependencies
npm install  # or pnpm install

# Start development server
npm run dev
```

### 4. Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension` folder

---

## 📂 Project Structure

```
leetcode-companion/
├── backend/                 # FastAPI Backend
│   ├── app/
│   │   ├── main.py          # API endpoints
│   │   ├── models.py        # SQLAlchemy models
│   │   ├── database.py      # Database configuration
│   │   └── services/
│   │       ├── gemini_service.py        # AI analysis
│   │       └── spaced_repetition.py     # SM-2 algorithm
│   ├── requirements.txt
│   └── schema.sql           # Database schema
│
├── dashboard/               # React Dashboard
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── hooks/           # React Query hooks
│   │   ├── services/        # API client
│   │   └── store/           # Zustand store
│   └── package.json
│
└── extension/               # Chrome Extension
    ├── manifest.json
    ├── popup/               # Extension popup UI
    └── content-scripts/     # LeetCode scraper
```

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/analyze` | POST | Analyze a LeetCode problem with AI |
| `/solve` | POST | Record a solved problem & calculate next review |
| `/today` | GET | Get problems due for review today |
| `/stats` | GET | Get user statistics (streak, mastery rate) |
| `/heatmap` | GET | Get activity data for heatmap |

---

## 🧮 SM-2 Algorithm

The spaced repetition system uses the **SuperMemo 2 (SM-2)** algorithm:

- **Quality Rating (0-5)**: How well you solved the problem
- **Easiness Factor**: Adjusts based on your performance
- **Interval**: Days until next review

Problems progress through: `new` → `learning` → `reviewing` → `mastered`

---

## 🛠️ Tech Stack

**Backend:**
- FastAPI (async Python web framework)
- SQLAlchemy (async ORM)
- Google Gemini (AI analysis)
- Supabase PostgreSQL (database)

**Frontend:**
- React 19 + TypeScript
- Vite (build tool)
- TailwindCSS 4 (styling)
- Framer Motion (animations)
- React Query (data fetching)
- Zustand (state management)

**Extension:**
- Manifest V3
- Chrome Extensions API

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [LeetCode](https://leetcode.com) for the problem platform
- [SuperMemo](https://supermemo.com) for the SM-2 algorithm
- [Google Gemini](https://deepmind.google/technologies/gemini/) for AI capabilities

---

<p align="center">Made with ❤️ to ace coding interviews</p>
