# 🧠 Memento

A beautiful, self-hosted web application for managing and analyzing your daily insights from Limitless AI. Transform your personal insights into an interactive dashboard with persistent storage, action item tracking, audio playback, speaker management, database exploration, and powerful search capabilities.

> **Perfect for**: Limitless AI users who want to organize, track, and act on their daily insights with a beautiful, modern interface.

## ⚠️ Prerequisites

**🧠 CRITICAL: This project depends on Daily Insights from Limitless AI.**

### Required Before Starting
1. **Limitless AI Account with Daily Insights Enabled**
   - You MUST have Daily Insights working in your Limitless AI app
   - **Enable Daily Insights**: Settings → Notification → Daily Insights (toggle ON)
   - Daily Insights generate around 7:00 AM Pacific Time
   - **If you don't see Daily Insights in Limitless, you won't see data in Memento**

2. **Technical Requirements**
   - **Node.js 18+** and npm (**Python is NOT required**)
   - **Limitless AI API key** from https://www.limitless.ai/developers

### Data Dependency Warning
- **Memento cannot create insights** - it only displays and organizes existing Daily Insights from Limitless AI
- **Before using Memento**: Confirm you can see Daily Insights in your Limitless app chat history
- **Common scenarios with no data**: New accounts, quiet days, disabled insights, or Limitless technical issues

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/smian1/memento2.git
cd memento
npm install
```

### 2. Launch The App
```bash
npm run dev
```
This single command starts the Node.js API, serves the React client, and schedules background sync jobs.

### 3. Complete Setup
- Visit **http://localhost:3000**
- Create admin account (first run only)
- Enter your Limitless API key and timezone in the browser

**You're ready!** The app will sync your insights and provide an interactive dashboard.

## ✨ Features

### 📊 **Consolidated Dashboard**
- Organize content by type: Action Items, Decisions, Ideas, Questions, Themes, Quotes, Highlights
- **Knowledge Nuggets**: Automatically extracted facts and insights
- **Memorable Exchanges**: Important conversations and dialogues
- Real-time search across all content types
- Advanced filtering with tags, completion status, and dates
- Smart content discovery with auto-pattern detection

### 📅 **Smart Daily View**
- Interactive calendar navigation showing available insights
- Beautiful markdown rendering with inline formatting
- Navigate through insights chronologically
- Date-specific content organization

### ✅ **Action Item Management**
- Mark tasks complete with persistent checkboxes and timestamps
- Edit action items inline with hover-to-edit functionality
- Create custom action items for any date
- Advanced filtering by completion status, source, and tags
- Comprehensive tagging system with color-coded organization

### 🎵 **Audio Playbook & Life Logs**
- **Life Logs View**: Browse daily recorded conversations and meetings
- **Full Audio Playback**: Play complete recordings with progress tracking
- **Segment Audio Player**: Play specific conversation segments with precise timing
- **Streaming Support**: Direct audio streaming from the server
- **Audio Controls**: Play/pause, seek, and duration display

### 👥 **Speaker Management**
- **Speaker Profiles**: Create and manage profiles for people in recordings
- **Auto-Discovery**: Automatically detect and create speaker profiles from life logs
- **Custom Avatars**: Add profile images for each speaker
- **Color Coding**: Assign custom colors to speakers for visual organization
- **Speaker Descriptions**: Add notes and descriptions for each person
- **Active/Inactive Status**: Control which speakers are displayed

### 🗄️ **Database Explorer**
- **Database View**: Browse and explore your SQLite database directly
- **Table Inspector**: View table schemas, row counts, and data structure
- **Data Viewer**: Examine individual records with JSON formatting
- **Pagination Support**: Navigate through large datasets efficiently
- **Schema Exploration**: Understand your data relationships and structure

### 🔍 **Discovery Features**
- **Knowledge Nuggets**: Auto-extracted facts, insights, and learnings
- **Memorable Exchanges**: Important conversations and dialogue snippets
- **Discovery Notifications**: Alerts for new content patterns
- **Pattern Recognition**: Automatically identify recurring themes and topics
- **Content Categories**: Organize discoveries by type and importance

### 💬 **Chat Interface**
- **Chat Panel**: Interactive chat interface for data queries
- **Message History**: Full conversation tracking
- **Data Integration**: Connected to your insights and life logs (functionality in development)

### 🔄 **Automatic Sync**
- Fetch latest insights from Limitless AI API
- Smart incremental updates (only sync new/changed data)
- Preserves your edits and completion states
- Time-aware sync (respects daily insight generation schedule)
- Background sync every 10 minutes

### 🏷️ **Advanced Tagging System**
- **Create Custom Tags**: Add tags with custom names and colors
- **Color-Coded Organization**: Visual organization with predefined color palettes
- **Bulk Operations**: Filter and manage multiple items by tags
- **Tag Statistics**: Usage counts and analytics for each tag

### 🎨 **Beautiful Design**
- Modern glassmorphism interface with dark theme and gradient accents
- Subtle selection indicators and clean navigation
- Responsive design works on desktop and mobile
- Smooth animations and hover effects
- Accessibility-first design with intuitive interactions

## 💡 Usage Guide

### First Time Setup
1. **Verify Limitless Daily Insights**: Check they're visible in your Limitless AI app
2. **Start The App**: Run `npm run dev` and open **http://localhost:3000**
3. **Create Admin Account**: Follow the onboarding UI prompts
4. **Configure API & Timezone**: Enter your Limitless API key and preferred timezone
5. **Explore**: The dashboard will guide you through syncing and exploring your data

### Daily Workflow
1. **📅 Browse Insights**: Use the calendar to navigate your daily insights
2. **🎵 Listen to Recordings**: Access your life logs and play audio recordings
3. **✅ Complete Tasks**: Click checkboxes on action items as you complete them
4. **✏️ Edit Content**: Hover over any text and click the edit icon to modify
5. **🏷️ Organize with Tags**: Create and assign color-coded tags to action items
6. **👥 Manage Speakers**: Add profiles, avatars, and descriptions for people in recordings
7. **🔍 Search Everything**: Use the consolidated view to search across all content
8. **🗄️ Explore Database**: Use the database view to examine your data structure
9. **🔄 Stay Updated**: Use built-in sync controls to fetch new insights
10. **📊 Track Progress**: Monitor completion statistics and discoveries in the dashboard

### Power Features
- **Advanced Audio Playback**: Play full recordings or specific conversation segments
- **Database Exploration**: Direct access to your SQLite database with table browsing
- **Discovery Management**: Review and approve automatically detected content patterns
- **Speaker Organization**: Full speaker profile management with auto-discovery
- **Advanced Tagging**: Create, manage, and filter by color-coded tags
- **Keyboard Shortcuts**: Cmd+Enter to save edits, Escape to cancel
- **Smart Search**: Find specific content across all your insights
- **Completion Tracking**: See when you completed each action item
- **Content Organization**: All insights automatically categorized by type
- **Source Tracking**: Distinguish between Limitless AI and custom content
- **Real-time Sync**: Integrated sync controls with status indicators
- **Flexible Filtering**: Filter by completion status, source type, tags, and dates

## 📁 Project Architecture

```
memento/
├── server/                 # Node.js + Express + TypeScript backend
│   ├── src/
│   │   ├── app.ts         # Express app & middleware setup
│   │   ├── index.ts       # Server entry with Vite integration & cron jobs
│   │   ├── routes/        # API endpoints
│   │   │   ├── actionItems.ts    # Action item CRUD operations
│   │   │   ├── auth.ts          # Authentication & user management
│   │   │   ├── config.ts        # User configuration management
│   │   │   ├── content.ts       # Content search and filtering
│   │   │   ├── database.ts      # Database exploration endpoints
│   │   │   ├── discovery.ts     # Discovery features and nuggets
│   │   │   ├── insights.ts      # Daily insights management
│   │   │   ├── lifelogs.ts      # Life logs & audio streaming
│   │   │   ├── speakers.ts      # Speaker profile management
│   │   │   ├── sync.ts          # Data synchronization
│   │   │   ├── system.ts        # System status & health
│   │   │   └── tags.ts          # Tag management
│   │   ├── services/      # Business logic & data access
│   │   │   ├── authService.ts     # Authentication logic
│   │   │   ├── dataService.ts     # Data access layer
│   │   │   ├── discoveryService.ts # Content discovery logic
│   │   │   ├── speakerService.ts  # Speaker management
│   │   │   ├── syncService.ts     # Limitless API integration
│   │   │   ├── systemService.ts   # System utilities
│   │   │   └── userService.ts     # User management
│   │   ├── db/            # Database layer
│   │   │   ├── client.ts        # SQLite connection
│   │   │   ├── init.ts          # Database initialization
│   │   │   └── schema.ts        # Drizzle ORM schema
│   │   ├── jobs/          # Background tasks
│   │   │   └── syncJob.ts       # Automated sync scheduling
│   │   ├── middlewares/   # Express middleware
│   │   │   └── authMiddleware.ts # JWT authentication
│   │   ├── types/         # TypeScript definitions
│   │   └── utils/         # Utility functions
│   └── tsconfig.json
├── frontend/               # React + TypeScript client (Vite)
│   ├── src/
│   │   ├── App.tsx        # Auth provider + onboarding gate
│   │   ├── DashboardApp.tsx # Main application shell
│   │   ├── components/    # UI components
│   │   │   ├── ActionItem.tsx         # Action item display/editing
│   │   │   ├── AudioPlayer.tsx        # Full audio playback
│   │   │   ├── Calendar.tsx           # Date navigation
│   │   │   ├── ChatPanel.tsx          # Chat interface
│   │   │   ├── ConsolidatedView.tsx   # Main dashboard view
│   │   │   ├── DailyView.tsx          # Daily insights view
│   │   │   ├── DatabaseView.tsx       # Database explorer
│   │   │   ├── DiscoveryNotification.tsx # Discovery alerts
│   │   │   ├── LifeLogView.tsx        # Life logs & audio interface
│   │   │   ├── SegmentAudioPlayer.tsx # Segment-specific playback
│   │   │   ├── SpeakerManager.tsx     # Speaker profile management
│   │   │   ├── SpeakerIndicator.tsx   # Speaker visual indicators
│   │   │   ├── TagManager.tsx         # Tag creation & management
│   │   │   ├── UserMenu.tsx           # Settings & user controls
│   │   │   └── onboarding/            # First-run setup UI
│   │   ├── contexts/      # React context providers
│   │   │   └── AuthContext.tsx        # Authentication state
│   │   ├── api/           # API client
│   │   │   └── client.ts              # Axios-based API client
│   │   ├── styles/        # CSS organization
│   │   │   ├── components/            # Component-specific styles
│   │   │   ├── audio.css             # Audio player styles
│   │   │   ├── chat.css              # Chat interface styles
│   │   │   ├── database.css          # Database view styles
│   │   │   ├── menus.css             # Menu and dropdown styles
│   │   │   └── tags.css              # Tag system styles
│   │   └── utils/         # Utility functions
│   ├── onboarding.css     # First-run UI styling
│   └── vite.config.ts
├── data/                   # Local SQLite database (auto-created, gitignored)
├── package.json            # Root scripts & dependencies
├── CHANGELOG.md            # Project change history
└── README.md
```

### Development Scripts
```bash
npm run dev      # Unified Node + React development server (http://localhost:3000)
npm run build    # Build production assets (server + client)
npm run start    # Serve the compiled build
```

## 🛠️ Development

### API Endpoints
The Express backend mounts everything under `/api`:

```bash
# System status and health
curl http://localhost:3000/api/system/status

# Insights and structured data
curl http://localhost:3000/api/insights
curl "http://localhost:3000/api/action-items?completed=false"

# Discovery features
curl http://localhost:3000/api/discovery/stats
curl http://localhost:3000/api/discovery/knowledge-nuggets
curl http://localhost:3000/api/discovery/memorable-exchanges

# Life logs and audio
curl http://localhost:3000/api/lifelogs
curl http://localhost:3000/api/lifelogs/123/audio  # Stream audio

# Speaker management
curl http://localhost:3000/api/speakers
curl -X POST http://localhost:3000/api/speakers/auto-discover

# Database exploration
curl http://localhost:3000/api/database/tables
curl http://localhost:3000/api/database/table/insights

# Search and stats
curl "http://localhost:3000/api/search?q=meeting"
curl http://localhost:3000/api/stats

# Manual sync controls
curl -X POST http://localhost:3000/api/sync/run
curl -X POST http://localhost:3000/api/sync/all
```

### Database
- SQLite database lives in `data/memento.db` (created automatically on first run)
- Drizzle ORM manages schema creation and relations
- Supports insights, life logs, speakers, action items, tags, discoveries, and user data

### Tech Stack
- **Backend**: Node.js (Express + TypeScript), Drizzle ORM, better-sqlite3
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Custom CSS with glassmorphism design and dark theme
- **Icons**: Lucide React, React Icons
- **Audio**: HTML5 Audio API with streaming support
- **Sync**: Scheduled cron job + manual triggers to Limitless API
- **Database**: SQLite with direct browser exploration

## 🔄 Data Synchronization

- Background job runs every 10 minutes while `npm run dev` (or `npm run start`) is active
- Use **Settings → Sync** panel in the UI to trigger manual sync or refresh specific data
- API shortcuts if you prefer `curl`:

```bash
# Check sync status
curl http://localhost:3000/api/sync/status

# Run full sync for insights + lifelogs (past 30 days)
curl -X POST "http://localhost:3000/api/sync/all?force=false&days_back=30"

# Check for new discoveries
curl -X POST http://localhost:3000/api/discovery/check
```

## 🚨 Troubleshooting

### Most Common Issue: "No Data Showing"

**🧠 If you're not seeing any insights in Memento:**

#### Step 1: Check Limitless AI First
1. **Open your Limitless AI app** (mobile or desktop)
2. **Look for "Daily insights"** in your chat history
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
curl -X POST http://localhost:3000/api/sync/run

# Check if any insights were found
curl http://localhost:3000/api/stats
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

#### `npm run dev` fails immediately
```bash
node --version   # Require Node.js 18+
npm install      # Reinstall dependencies if packages are missing
```

If the port is in use:
```bash
lsof -ti:3000 | xargs kill -9
```

#### Can't reach the dashboard
- Confirm the dev server reports `Memento server listening on http://localhost:3000`
- Verify your browser is loading `http://localhost:3000`

#### Sync never completes
- Open the in-app settings menu and check the sync status indicator
- Make sure your Limitless API key is still valid
- Check console output for `Sync completed` or specific error messages

#### Audio Won't Play
1. **Check Network**: Ensure `http://localhost:3000` is accessible
2. **Check File Format**: Memento streams audio as provided by Limitless API
3. **Browser Compatibility**: Use a modern browser with HTML5 audio support
4. **Console Errors**: Check browser console for specific audio errors

#### Reset Everything
```bash
# WARNING: This deletes all your local data
rm -rf data/memento.db
npm run dev
```
The onboarding flow will recreate the database and request configuration again.

### Still Having Issues?

1. **Verify Limitless Daily Insights first** — the app can only display what Limitless generates
2. **Restart `npm run dev`** to clear caches and re-run background jobs
3. **Inspect console output** — the unified server logs actionable errors
4. **Use the database explorer** to examine your data directly
5. **Open an issue** with logs attached if problems persist

## 🔒 Security & Privacy

- **Local First**: All data lives in `data/memento.db` on your machine
- **API Key Storage**: Keys are stored locally and never transmitted beyond the Limitless API
- **No Cloud Dependencies**: Runs entirely offline once configured
- **Audio Streaming**: Audio files are streamed directly from your local server
- **Database Security**: Full control over your SQLite database with direct access
- **Open Source**: Full transparency into data handling

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
git clone https://github.com/smian1/memento2.git
cd memento

# Install dependencies
npm install

# Run in development mode
npm run dev
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Limitless AI** for the amazing insights API and life logs platform
- **Express.js** for the excellent web framework
- **React** team for the robust frontend library
- **Drizzle ORM** for the TypeScript-first database toolkit

---

**Built with ❤️ for better personal knowledge management.**

*Transform your daily insights into actionable intelligence with beautiful audio playback, speaker management, and comprehensive data exploration.*