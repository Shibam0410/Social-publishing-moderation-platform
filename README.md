# 🌐 Social Publishing & Moderation Platform

A full-stack social publishing platform with advanced content moderation, role-based access control (RBAC), community management, and real-time notifications.

---

## 📋 Project Scope

This platform enables users to **publish, discover, and engage** with content across public and private communities, while providing administrators and moderators with powerful tools to **review, moderate, and action** flagged content.

### Core Features

| Area | Features |
|---|---|
| **Authentication** | Register/Login with JWT, Mock OAuth (Google/Apple), Multi-Factor Authentication (TOTP/QR Code) |
| **Publishing** | Text, Image, Video, Poll, Thread posts. Scheduled posts with background job processing. Post lifecycle: Draft → Published → Flagged → Under Review → Approved/Removed/Archived |
| **Engagement** | Like / Dislike, Comment, Repost, Bookmark, Share link, Poll voting with Unpoll/Change vote |
| **Communities** | Create Public & Private communities. Join requests, member approval/rejection, community moderation policies (strict pre-screening) |
| **Moderation** | 5-stage Report lifecycle: Submitted → Auto Risk Scoring → Moderator Review → Escalated → Decision → Closed. AI toxicity score. Admin/Moderator access to private communities and all post statuses |
| **RBAC** | 7 roles: `user`, `creator`, `moderator`, `senior_moderator`, `admin`, `compliance_officer`, `analyst` |
| **Notifications** | Likes, Comments, Mentions (`@username`), Moderation Decisions, Report Outcomes |
| **Analytics** | Engagement rate, follower growth, post performance heatmaps (Creator). Active users, flagged content ratio (Admin). CSV/PDF report export |
| **Compliance** | Data export requests, full audit logs, account suspension/ban workflow |

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express.js** | REST API server |
| **better-sqlite3** | Synchronous SQLite database driver |
| **SQLite** | Embedded relational database (`backend/database/data.sqlite`) |
| **JSON Web Tokens (jsonwebtoken)** | Auth token signing and verification |
| **bcryptjs** | Password hashing |
| **node-cron** | Background job scheduler (scheduled post publishing) |
| **otplib** | TOTP-based Multi-Factor Authentication |
| **qrcode** | QR code generation for MFA setup |
| **nodemailer** | Email integration |
| **pdfkit + json2csv** | Report export as PDF or CSV |
| **uuid** | UUID generation for all entities |

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | Component-based UI library |
| **Vite** | Dev server and build tool |
| **React Router DOM v7** | Client-side routing |
| **Tailwind CSS v3** | Utility-first CSS framework |
| **Recharts** | Analytics charts and graphs |
| **Lucide React** | Icon library |
| **date-fns** | Date formatting and calculation |

---

## 📁 Project Structure

```
Social_Publishing_Moderation_VibeCoding/
├── backend/                        # Node.js/Express REST API
│   ├── controllers/                # Route handler logic
│   │   ├── authController.js       # Auth, OAuth, MFA
│   │   ├── postsController.js      # Posts, Likes, Dislikes, Polls, Comments
│   │   ├── communitiesController.js# Community management
│   │   ├── moderationController.js # Moderation queue, reports, bans
│   │   └── ...
│   ├── database/
│   │   ├── schema.sql              # Full DB schema (27 tables)
│   │   ├── db.js                   # DB connection (better-sqlite3)
│   │   └── data.sqlite             # SQLite DB file (auto-created)
│   ├── middleware/
│   │   ├── authMiddleware.js       # JWT enforcement
│   │   └── optionalAuthMiddleware.js # Soft-auth for public feeds
│   ├── routes/                     # Express routers
│   ├── services/
│   │   ├── scheduler.js            # Cron jobs (scheduled posts)
│   │   ├── analyticsService.js     # Engagement tracking
│   │   ├── notificationService.js  # In-app notifications
│   │   └── riskScoringService.js   # AI toxicity scoring
│   └── server.js                   # Entry point
│
├── frontend/                       # React + Vite SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── PostCard.jsx        # Post display (likes, polls, comments, reposts)
│   │   │   └── CommentSection.jsx  # Threaded comment rendering
│   │   ├── pages/
│   │   │   ├── HomeFeed.jsx        # Global/Following feed
│   │   │   ├── CreatePost.jsx      # Post creation wizard
│   │   │   ├── CommunityPage.jsx   # Community feed and management
│   │   │   ├── ModerationDashboard.jsx # Moderation queue UI
│   │   │   ├── Notifications.jsx   # In-app notifications
│   │   │   ├── Analytics.jsx       # Creator & Admin analytics
│   │   │   └── ...
│   │   └── services/api.js         # Centralised API fetch wrapper
│   └── index.html
│
└── Prompts/                        # Design documents and specs
```

---

## 🚀 How to Run the Application

### Prerequisites
- **Node.js** v18 or higher
- **npm** v9 or higher

---

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Start the Backend Server

```bash
# Development mode (hot-reload via nodemon)
npm run dev

# OR production mode
npm start
```

The backend API will be available at **http://localhost:3000/api**

> ✅ The SQLite database and all tables are created automatically on first start. No manual DB setup required.

---

### 3. Install Frontend Dependencies

In a **new terminal window**:

```bash
cd frontend
npm install
```

### 4. Start the Frontend Dev Server

```bash
npm run dev
```

The frontend will be available at **http://localhost:5173**

---

## 👤 Default Test Accounts

Register a new account via the UI, or use the following test credentials if seeded:

| Role | How to Set |
|---|---|
| `user` | Default role on registration |
| `admin` / `moderator` | Update `role` column in `users` table via an admin panel or direct DB edit |

---

## 🔑 Environment Variables

Create a `.env` file inside the `backend/` directory (optional, defaults shown):

```env
JWT_SECRET=changeme_super_secret
PORT=3000
```

---

## 📡 Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login, get JWT |
| `GET` | `/api/posts` | Global feed (public, user-context-aware) |
| `POST` | `/api/posts` | Create a post (auth required) |
| `POST` | `/api/posts/:id/like` | Like/Unlike a post |
| `POST` | `/api/posts/:id/dislike` | Dislike/Un-dislike a post |
| `POST` | `/api/posts/:id/vote` | Vote/Unvote/Change poll vote |
| `POST` | `/api/posts/:id/comment` | Add a comment |
| `POST` | `/api/posts/:id/report` | Report a post |
| `GET` | `/api/communities` | List communities |
| `GET` | `/api/moderation/reports` | Get moderation queue (mod+ only) |
| `GET` | `/api/notifications` | Get user notifications |

---

## 📝 License

MIT
