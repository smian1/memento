# 🧠 Memento

A beautiful, self-hosted web application for managing and analyzing your daily insights from Limitless AI. Transform your personal insights into an interactive dashboard with persistent storage, action item tracking, and powerful search capabilities.

> **Perfect for**: Limitless AI users who want to organize, track, and act on their daily insights with a beautiful, modern interface.

## ✨ Features

### 📅 **Smart Daily View**
- Interactive calendar navigation showing available insights
- Beautiful markdown rendering with inline formatting
- Navigate through your insights chronologically

### 📊 **Consolidated Dashboard**
- Organize all content by type: Action Items, Decisions, Ideas, Questions, Themes, Quotes, Highlights
- Real-time search across all your insights
- Advanced filtering with tags and completion status
- Date-grouped content for better context

### ✅ **Action Item Management**
- Mark tasks as complete with persistent checkboxes
- Track completion timestamps
- Edit action items inline with hover-to-edit functionality
- Create custom action items for any date
- Advanced filtering by completion status, source, and tags
- Comprehensive tagging system with color-coded organization

### 🔄 **Automatic Sync**
- Fetch latest insights from Limitless AI API
- Smart incremental updates (only sync new/changed data)
- Preserves your edits and completion states
- Time-aware sync (respects daily insight generation schedule)

### 🎨 **Beautiful Design**
- Modern glassmorphism interface with dark theme and gradient accents
- Subtle selection indicators and clean navigation
- Responsive design works on desktop and mobile
- Smooth animations and hover effects
- Accessibility-first design with intuitive interactions

## ⚠️ Important Prerequisites

**🧠 CRITICAL: This is an experimental project that depends on Daily Insights from Limitless AI.**

### Required Dependencies

#### 1. **Limitless AI Account with Daily Insights Enabled**
- **Most Important**: You MUST have Daily Insights working in your Limitless AI app
- Daily Insights are generated around 7:00 AM Pacific Time
- **If you don't see Daily Insights in Limitless, you won't see data in Memento**
- This is normal for new accounts or days with insufficient data

#### 2. **Technical Requirements**
- **Python 3.9+**
- **Node.js 16+** and npm
- **Limitless AI account** with API access from https://www.limitless.ai/developers

### ⚠️ Data Dependency Warning

**Memento cannot create insights - it only displays and organizes existing Daily Insights from Limitless AI.**

**Before using Memento:**
1. ✅ Enable Daily Insights: **Settings → Notification → Daily Insights (toggle ON)**
2. ✅ Confirm you can see Daily Insights in your Limitless app chat history
3. ✅ Wait for at least one Daily Insight to be generated (usually after 7 AM Pacific)
4. ✅ If missing insights, check your Limitless app first - the issue is likely there

**Common scenarios where you won't see data:**
- New Limitless account (hasn't generated insights yet)
- Days when Limitless didn't process enough data
- Daily Insights disabled in Limitless settings
- Technical issues with Limitless insight generation

**Future Plans:**
- Create insights directly in Memento (removing Limitless dependency)
- Import life logs as examples
- Enhanced local insight generation

## 🚀 Quick Start

### 1. Clone & Setup
```bash
git clone https://github.com/smian1/memento.git
cd memento
```

### 2. One-Command Setup & Launch
```bash
# Start the interactive setup and launch
./run.sh
```

**That's it!** The script will:
1. ✅ Check all technical prerequisites (Python, Node.js, etc.)
2. 🔑 **Interactively prompt you for your Limitless API key**
3. ✅ Validate your API key works with Limitless servers
4. 🧠 Check for Daily Insights in your account (and warn if missing)
5. 📦 Install all dependencies automatically
6. 🚀 Start both frontend and backend servers
7. 🎯 Provide next steps and troubleshooting guidance

### 3. Access Your Dashboard
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### 4. First Run Guidance
On your first run, the script will:
- Guide you through API key setup
- Check for Daily Insights in your account
- Provide specific next steps
- Offer troubleshooting if no data is found

**Get your API key from**: https://www.limitless.ai/developers

## 📁 Project Architecture

```
memento/
├── backend/                 # FastAPI + SQLite backend
│   ├── app.py              # Main API server & routes
│   ├── database.py         # SQLAlchemy models & DB setup
│   ├── schemas.py          # Pydantic data validation schemas
│   ├── crud.py             # Database operations (CRUD)
│   ├── sync.py             # Limitless AI API integration
│   ├── sync_manager.py     # Data extraction & sync logic
│   ├── data_extraction.py  # Content parsing utilities
│   └── requirements.txt    # Python dependencies
├── frontend/               # React + TypeScript frontend
│   ├── src/
│   │   ├── App.tsx         # Main application
│   │   ├── api/client.ts   # API client & types
│   │   └── components/     # React components
│   └── package.json        # Node.js dependencies
├── .env.example           # Environment template
├── .gitignore            # Git ignore rules
└── run.sh               # One-click startup script
```

## 🔧 Manual Setup (Alternative)

If you prefer manual setup or want to run services separately:

### Backend Setup
```bash
cd backend
pip3 install -r requirements.txt
python3 app.py  # Starts on port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev  # Starts on port 5173
```

### Sync Your Data
```bash
cd backend
python3 sync.py  # Fetch your latest insights
```

## 💡 Usage Guide

### First Time Setup
1. **Check Limitless First**: Verify Daily Insights are working in your Limitless AI app
2. **Run Setup**: Execute `./run.sh` - it will guide you through everything
3. **Enter API Key**: The script will prompt you to paste your API key from [Limitless AI Developers](https://www.limitless.ai/developers)
4. **Automatic Validation**: Your API key and Daily Insights will be checked automatically
5. **Follow Guidance**: The script provides specific next steps based on what it finds

### Daily Workflow
1. **📅 Browse Insights**: Use the calendar to navigate your daily insights
2. **✅ Complete Tasks**: Click checkboxes on action items as you complete them
3. **✏️ Edit Content**: Hover over any text and click the edit icon to modify
4. **🏷️ Organize with Tags**: Create and assign color-coded tags to action items
5. **🔍 Search Everything**: Use the consolidated view to search across all content
6. **🔄 Stay Updated**: Use built-in sync controls to fetch new insights
7. **📊 Track Progress**: Monitor completion statistics in the dashboard

### Power Features
- **Advanced Tagging System**: Create, manage, and filter by color-coded tags
- **Keyboard Shortcuts**: Cmd+Enter to save edits, Escape to cancel
- **Smart Search**: Find specific content across all your insights
- **Completion Tracking**: See when you completed each action item
- **Content Organization**: All insights automatically categorized by type
- **Source Tracking**: Distinguish between Limitless AI and custom content
- **Real-time Sync**: Integrated sync controls with status indicators
- **Flexible Filtering**: Filter by completion status, source type, tags, and dates

## 🏷️ Tagging System

Organize your action items with a powerful tagging system:

### Tag Management
- **Create Custom Tags**: Add tags with custom names and colors
- **Color-Coded Organization**: Visual organization with 8 predefined colors
- **Bulk Operations**: Filter and manage multiple items by tags
- **Tag Statistics**: See usage counts for each tag

### Using Tags
1. **Create Tags**: Use the "Manage Tags" button in filters
2. **Assign Tags**: Click the tag button on any action item
3. **Filter Content**: Use tag filters to focus on specific categories
4. **Visual Organization**: Tags display with their assigned colors

## 🔄 Data Synchronization

The sync system is designed to work seamlessly with Limitless AI's insight generation:

### Automatic Smart Sync
```bash
cd backend && python3 sync.py
```

**What it does:**
- Fetches "Daily insights" chats from Limitless AI
- Extracts structured data (action items, decisions, ideas, etc.)
- Only updates changed content
- Preserves your edits and completion states
- Respects the 7:00 AM Pacific insight generation schedule

### Sync Options
```bash
# Preview changes without applying
python3 sync.py --dry-run

# Force sync (bypass time checks)
python3 sync.py --force
```

## 🛠️ Development

### API Endpoints
The FastAPI backend provides a full REST API:

```bash
# Get dashboard statistics
curl http://localhost:8000/stats

# Search across all content
curl "http://localhost:8000/search?q=meeting"

# Get action items with filtering
curl "http://localhost:8000/action-items?completed=false&source=LIMITLESS"

# Get insights for a specific date
curl http://localhost:8000/insights/2025-01-15

# Get all tags
curl http://localhost:8000/tags

# Trigger sync from settings
curl -X POST http://localhost:8000/sync

# View interactive API docs
open http://localhost:8000/docs
```

### Database
- **SQLite** database stored in `backend/insights.db`
- Automatically created on first run
- Full relational model with foreign keys
- ACID compliance for data integrity

### Tech Stack
- **Backend**: FastAPI, SQLAlchemy, Pydantic, SQLite
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Custom CSS with glassmorphism design and dark theme
- **Icons**: Lucide React, React Icons
- **API**: RESTful API with automatic OpenAPI documentation
- **Database**: SQLite with full relational model and ACID compliance

## 🚨 Troubleshooting

### Most Common Issue: "No Data Showing"

**🧠 If you're not seeing any insights in Memento:**

#### Step 1: Check Limitless AI First
```bash
# The #1 cause is missing Daily Insights in Limitless itself
```
1. **Open your Limitless AI app** (mobile or desktop)
2. **Look for "Daily insights" or similar** in your chat history
3. **If you don't see any**: This is your problem! Memento can only show what Limitless creates.

#### Step 2: Enable Daily Insights
1. **Open your Limitless AI app**
2. **Go to Settings → Notification (under Preferences)**
3. **Find "Daily Insights" under Daily Notification**
4. **Toggle it ON**
5. **Wait until after 7:00 AM Pacific** for generation

#### Step 3: Verify Data in Memento
```bash
# Force a sync to check for new data
cd backend && python3 sync.py

# Check if any insights were found
curl http://localhost:8000/stats
```

#### When Daily Insights Are Missing
**This is completely normal in these situations:**
- **New Limitless account** (hasn't generated first insights yet)
- **Quiet days** (Limitless didn't process enough data)
- **Weekends or holidays** (less activity to analyze)
- **Technical issues** with Limitless insight generation

**What to do:**
- ✅ **Use Memento anyway** - you can create custom action items
- ✅ **Check back tomorrow** after 7 AM Pacific
- ✅ **Verify Limitless app** shows insights before expecting them in Memento

### Technical Issues

#### "run.sh Script Fails"
```bash
# Check prerequisites
python3 --version  # Need 3.9+
node --version     # Need 16+
```

#### "API Key Issues"
The interactive setup should catch these, but if needed:
```bash
# Manually test your API key
curl -H "X-API-Key: YOUR_KEY_HERE" https://api.limitless.ai/v1/chats?limit=1

# Re-run setup to enter new key
rm .env
./run.sh
```

#### "Backend Won't Start"
```bash
# Check Python version (need 3.9+)
python3 --version

# Install dependencies manually
cd backend && pip3 install -r requirements.txt

# Check if port is in use
lsof -i :8000
# If in use: lsof -ti:8000 | xargs kill -9
```

#### "Frontend Won't Start"
```bash
# Check Node version (need 16+)
node --version

# Clear and reinstall
cd frontend && rm -rf node_modules package-lock.json && npm install

# Check if port is in use
lsof -i :5173
# If in use: lsof -ti:5173 | xargs kill -9
```

#### "Sync Not Working"
```bash
# Test API connection
curl -H "X-API-Key: $(grep LIMITLESS_API_KEY .env | cut -d= -f2)" https://api.limitless.ai/v1/chats

# Run sync with verbose output
cd backend && python3 sync.py --dry-run

# Check for Daily Insights specifically
curl -H "X-API-Key: $(grep LIMITLESS_API_KEY .env | cut -d= -f2)" "https://api.limitless.ai/v1/chats?q=Daily%20insights"
```

### Reset Everything
```bash
# WARNING: This deletes all your local data
rm backend/insights.db .env
./run.sh  # Will recreate everything and prompt for API key
```

### Still Having Issues?

1. **Double-check Daily Insights exist in Limitless first** - this fixes 90% of issues
2. **Run the script again** - the interactive setup catches most problems
3. **Check the error messages** - they're designed to be helpful
4. **Try the manual setup** (see Manual Setup section below)

## 🔒 Security & Privacy

- **Local First**: All data stored locally in SQLite
- **API Key Protection**: Never commit `.env` file to git
- **No Cloud Dependencies**: Runs entirely on your machine
- **Open Source**: Full code transparency

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature-name`
3. **Make your changes** with clear, commented code
4. **Test thoroughly** on your local setup
5. **Submit a pull request** with a clear description

### Development Setup
```bash
# Clone your fork
git clone https://github.com/yourusername/memento.git
cd memento

# Set up environment
cp .env.example .env
# Add your API key to .env

# Run in development mode
./run.sh
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Limitless AI** for the amazing insights API
- **FastAPI** for the excellent web framework
- **React** team for the robust frontend library

---

**Built with ❤️ for better personal knowledge management.**

*Transform your daily insights into actionable intelligence.*