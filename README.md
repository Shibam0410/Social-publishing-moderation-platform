# 🌐 Social Publishing & Moderation Platform

A full-stack social publishing platform with advanced content moderation, role-based access control (RBAC), community management, and real-time notifications.

---

## 📋 Project Scope

This platform enables users to **publish, discover, and engage** with content across public and private communities, while providing administrators and moderators with powerful tools to **review, moderate, and action** flagged content.

### Core Features

| Area | Features |
|---|---|
| **Authentication** | Register/Login with JWT, Mock OAuth (simulated Google/Apple), Multi-Factor Authentication (TOTP/QR Code), Password Reset (email link), Admin Invite Flow |
| **Publishing** | Text, Image, Video, Poll, Thread posts. Scheduled posts with background cron job processing. Post lifecycle: `Draft → Published → Flagged → Under Review → Approved / Removed / Archived / Scheduled` |
| **Engagement** | Like / Dislike, Comment, Repost, Bookmark, Share, Poll voting with Unpoll / Change vote |
| **Communities** | Create Public & Private communities. Join requests, member approval/rejection, community moderation policies, community-level member/post management |
| **Moderation** | 6-stage Report lifecycle: `Submitted → Auto Risk Scoring → Moderator Review → Escalated → Decision → Closed`. AI toxicity risk score. Moderators can warn, suspend, and ban users. Moderation SLA auto-escalation (48-hour cron job). |
| **RBAC** | 7 roles: `user`, `creator`, `moderator`, `senior_moderator`, `admin`, `compliance_officer`, `analyst` |
| **Notifications** | Likes, Comments, Mentions (`@username`), Moderation Decisions, Warnings, Suspensions, Report Outcomes — with mark-as-read and mark-all-as-read |
| **Analytics** | Per-post analytics for Creators. Platform-level summary (active users, new users, new posts, flagged content ratio) for Admins/Analysts. Weekly analytics snapshot via cron job. |
| **Compliance** | Full audit logs with before/after state snapshots. User data export (JSON/CSV/PDF). Access/login history. Data deletion requests with admin approval workflow. |
| **Admin** | User management (role changes, status updates). Admin-invite system (email-based, role-scoped, token-gated). |
| **Explore** | Trending hashtags (auto-calculated every 15 minutes). Suggested users. Advanced search with keyword, community, date, and engagement filters. |
| **Profile** | View/edit personal profile. Follow/Unfollow other users. View follower/following counts. Public user profile pages. |

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
| **cors** | Cross-Origin Resource Sharing |
| **dotenv** | Environment variable management |
| **node-cron** | Background job scheduler (5 cron jobs: scheduled posts, trending, SLA monitoring, weekly analytics, risk scoring) |
| **otplib** | TOTP-based Multi-Factor Authentication |
| **qrcode** | QR code generation for MFA setup |
| **nodemailer** | Email integration (password reset, invite emails) |
| **pdfkit + json2csv** | Compliance data export as PDF or CSV |
| **uuid** | UUID generation for all entities |
| **nodemon** *(dev)* | Auto-restart server during development |

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | Component-based UI library |
| **Vite** | Dev server and build tool |
| **React Router DOM v7** | Client-side routing (20 routes) |
| **Tailwind CSS v3** | Utility-first CSS framework |
| **Recharts** | Analytics charts and graphs |
| **Lucide React** | Icon library |
| **date-fns** | Date formatting and calculation |
| **clsx + tailwind-merge** | Conditional class utility helpers |

---

## 📁 Project Structure

```
Social_Publishing_Moderation_VibeCoding/
├── backend/                              # Node.js/Express REST API
│   ├── controllers/                      # Route handler logic
│   │   ├── authController.js             # Register, Login, OAuth, MFA setup/verify
│   │   ├── inviteController.js           # Admin invite, accept-invite, forgot/reset password
│   │   ├── postsController.js            # Posts, Likes, Dislikes, Bookmarks, Polls, Comments, Reposts, Reports
│   │   ├── communitiesController.js      # Community CRUD, join/leave, join requests, member management
│   │   ├── moderationController.js       # Report queue, post status, warn/suspend/ban users
│   │   ├── adminController.js            # Admin user management and role changes
│   │   ├── analyticsController.js        # Platform summary, per-post creator analytics
│   │   ├── complianceController.js       # Audit logs, data export, access history, deletion requests
│   │   └── usersController.js            # User profiles, follow/unfollow, search users
│   ├── database/
│   │   ├── schema.sql                    # Full DB schema (22 tables)
│   │   ├── db.js                         # DB connection (better-sqlite3, WAL mode)
│   │   ├── data.sqlite                   # SQLite DB file (auto-created on first start)
│   │   ├── migrate_comments.js           # Migration: comment threading columns
│   │   ├── migrate_missing_features.js   # Migration: MFA, OAuth, scheduled_date columns
│   │   ├── migrate_notifications_post_ref.js # Migration: post_id reference on notifications
│   │   └── update_db_private.js          # Migration: is_private (communities), status (community_members)
│   ├── middleware/
│   │   ├── authMiddleware.js             # JWT enforcement (populates req.user)
│   │   ├── optionalAuthMiddleware.js     # Soft-auth for public feeds (user context if logged in)
│   │   └── roleMiddleware.js             # RBAC — requireRole(...roles) guard
│   ├── routes/                           # Express routers (1 file per resource)
│   │   ├── auth.js
│   │   ├── posts.js
│   │   ├── communities.js
│   │   ├── moderation.js
│   │   ├── admin.js
│   │   ├── analytics.js
│   │   ├── notifications.js
│   │   ├── compliance.js
│   │   └── users.js
│   ├── services/
│   │   ├── scheduler.js                  # 5 cron jobs (scheduled posts, trending, SLA, weekly analytics, risk sweep)
│   │   ├── analyticsService.js           # Engagement tracking helpers
│   │   ├── notificationService.js        # In-app notification creation, read, mark-all-read
│   │   ├── auditLogService.js            # Audit log writes with before/after state snapshots
│   │   ├── emailService.js               # Email sending via nodemailer (invites, password reset)
│   │   └── riskScoringService.js         # AI-style toxicity/risk scoring for reports
│   ├── .env.example                      # Environment variable template
│   ├── create_admin.js                   # Utility: promote a user to admin via CLI
│   ├── wipe_and_reset.js                 # Utility: wipe and reinitialise the database
│   └── server.js                         # Entry point — registers all routes and starts Express
│
├── frontend/                             # React + Vite SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx                # Top navigation bar
│   │   │   ├── Sidebar.jsx               # Admin/Moderator/Creator sidebar
│   │   │   ├── PostCard.jsx              # Post display (likes, dislikes, polls, comments, reposts, bookmarks)
│   │   │   ├── CommentSection.jsx        # Comment rendering and submission
│   │   │   ├── ErrorBoundary.jsx         # Global React error boundary
│   │   │   ├── AnalyticsChart.jsx        # Recharts wrapper component
│   │   │   └── NotificationItem.jsx      # Individual notification display
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx             # Login with JWT + MFA support
│   │   │   ├── SignupPage.jsx            # User registration
│   │   │   ├── ForgotPassword.jsx        # Request password reset email
│   │   │   ├── ResetPassword.jsx         # Consume reset token and set new password
│   │   │   ├── AcceptInvite.jsx          # Accept admin invite (token-gated registration)
│   │   │   ├── HomeFeed.jsx              # Global / Following feed
│   │   │   ├── Explore.jsx               # Trending hashtags, suggested users, advanced search
│   │   │   ├── CreatePost.jsx            # Post creation wizard (text, image, video, poll, scheduled)
│   │   │   ├── PostDetail.jsx            # Single post view with comments
│   │   │   ├── Profile.jsx               # My profile — edit, MFA setup, account settings
│   │   │   ├── UserProfile.jsx           # Public profile page for another user
│   │   │   ├── Communities.jsx           # Browse and manage communities
│   │   │   ├── CommunityPage.jsx         # Community feed, members, join requests
│   │   │   ├── Notifications.jsx         # In-app notification feed (with post context cards)
│   │   │   ├── ModerationDashboard.jsx   # Moderation queue, report management, post actions
│   │   │   ├── AdminDashboard.jsx        # Admin overview and platform controls
│   │   │   ├── UserManagement.jsx        # Admin user list — role changes, warn/suspend/ban
│   │   │   ├── Compliance.jsx            # Audit logs, data export, deletion requests
│   │   │   ├── Analytics.jsx             # Platform-level analytics (admin/analyst)
│   │   │   └── CreatorAnalytics.jsx      # Per-post analytics for creators
│   │   ├── services/
│   │   │   └── api.js                    # Centralised API fetch wrapper (all endpoint calls)
│   │   ├── App.jsx                       # Root component — routing and auth state
│   │   └── main.jsx                      # React DOM entry point
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
└── Prompts/                              # Design documents and architecture specs
```

---

## 🗄️ Database Schema Overview

The database contains **22 tables** (auto-created from `schema.sql` on first server start):

| Table | Purpose |
|---|---|
| `users` | User accounts, roles, statuses, MFA, OAuth columns |
| `follows` | Follower/following relationships |
| `communities` | Community definitions (public/private, policy) |
| `community_members` | Membership with role and approval status |
| `posts` | All posts (text, image, video, poll, thread, scheduled) |
| `polls` | Poll metadata linked to a post |
| `poll_options` | Individual poll choices with vote counts |
| `poll_votes` | Per-user poll vote tracking (one vote per poll per user) |
| `comments` | Post comments |
| `likes` | Post likes (unique per user per post) |
| `dislikes` | Post dislikes (unique per user per post) |
| `bookmarks` | Saved posts (unique per user per post) |
| `reports` | Content reports with 6-stage lifecycle and risk score |
| `notifications` | In-app notifications with post reference |
| `audit_logs` | Full admin action audit trail (before/after state) |
| `analytics_snapshots` | Per-post view/reach snapshots |
| `data_deletion_requests` | GDPR-style data deletion request queue |
| `access_history` | Login/access records per user |
| `trending_topics` | Hashtag trending cache (refreshed every 15 min) |
| `weekly_analytics` | Weekly platform metrics snapshots |
| `invite_tokens` | Admin-generated role-scoped invite tokens |
| `password_reset_tokens` | Time-limited password reset tokens |

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

### 2. Configure Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

```env
PORT=3000
JWT_SECRET=change_this_to_a_long_random_string

# Optional — required only if you want email features (invites, password reset)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your@email.com
EMAIL_PASS=yourpassword
EMAIL_FROM=noreply@yourapp.com
```

> If `EMAIL_*` variables are not set, email-dependent features (invite flow, password reset) will log to the console instead.

### 3. Start the Backend Server

```bash
# Development mode (auto-restarts on file changes via nodemon)
npm run dev

# OR production mode
npm start
```

The backend API will be available at **http://localhost:3000/api**

> ✅ The SQLite database and all 22 tables are created automatically on first start. No manual DB setup or migration required.

---

### 4. Install Frontend Dependencies

In a **new terminal window**:

```bash
cd frontend
npm install
```

### 5. Start the Frontend Dev Server

```bash
npm run dev
```

The frontend will be available at **http://localhost:5173**

---

## 👤 Default Test Accounts & Role Management

Register a new account via the UI — all new accounts default to the `user` role.

To promote a user to **admin**, run the helper script (while the backend is NOT running):

```bash
cd backend
node create_admin.js
```

Or update the `role` column directly in the SQLite database using any SQLite browser.

| Role | Description |
|---|---|
| `user` | Default role — browse, post, engage |
| `creator` | Access to per-post analytics dashboard |
| `moderator` | Access moderation queue, warn/suspend users |
| `senior_moderator` | Elevated moderator with escalation authority |
| `admin` | Full access — user management, invites, all dashboards |
| `compliance_officer` | Audit logs, data exports, deletion requests |
| `analyst` | Platform analytics access (read-only) |

---

## 🔑 Environment Variables

Create a `.env` file inside the `backend/` directory. See `.env.example` for the full template.

```env
# Required
JWT_SECRET=changeme_super_secret
PORT=3000

# Optional — enables email features
EMAIL_HOST=smtp.yourprovider.com
EMAIL_PORT=587
EMAIL_USER=your@email.com
EMAIL_PASS=yourpassword
EMAIL_FROM=noreply@yourapp.com
```

---

## 📡 Key API Endpoints

### Auth — `/api/auth`
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login, receive JWT |
| `POST` | `/api/auth/oauth` | Simulated OAuth login (Google/Apple mock) |
| `POST` | `/api/auth/mfa-login` | Login with TOTP MFA token |
| `POST` | `/api/auth/mfa/setup` | Set up MFA (returns QR code) — auth required |
| `POST` | `/api/auth/mfa/verify` | Verify and activate MFA — auth required |
| `POST` | `/api/auth/forgot-password` | Request password reset email |
| `POST` | `/api/auth/reset-password` | Reset password with token |
| `GET` | `/api/auth/validate-invite` | Validate admin invite token |
| `POST` | `/api/auth/accept-invite` | Accept invite and complete registration |
| `GET` | `/api/auth/profile` | Get own profile — auth required |
| `PUT` | `/api/auth/profile` | Update own profile — auth required |

### Posts — `/api/posts`
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/posts` | Global feed (public, user-context-aware) |
| `GET` | `/api/posts/search` | Search posts with filters |
| `GET` | `/api/posts/bookmarks` | Get my bookmarked posts — auth required |
| `POST` | `/api/posts` | Create a post — auth required |
| `GET` | `/api/posts/:id` | Get a single post |
| `PUT` | `/api/posts/:id` | Update a post — auth required (owner) |
| `DELETE` | `/api/posts/:id` | Delete a post — auth required (owner/mod) |
| `POST` | `/api/posts/:id/like` | Toggle like — auth required |
| `POST` | `/api/posts/:id/dislike` | Toggle dislike — auth required |
| `POST` | `/api/posts/:id/bookmark` | Toggle bookmark — auth required |
| `POST` | `/api/posts/:id/comment` | Add a comment — auth required |
| `GET` | `/api/posts/:id/comments` | Get comments for a post |
| `POST` | `/api/posts/:id/vote` | Vote / Unvote / Change poll vote — auth required |
| `POST` | `/api/posts/:id/repost` | Repost — auth required |
| `POST` | `/api/posts/:id/report` | Report a post — auth required |

### Communities — `/api/communities`
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/communities` | List all communities |
| `POST` | `/api/communities` | Create a community — auth required |
| `GET` | `/api/communities/:id` | Get community details |
| `PUT` | `/api/communities/:id` | Edit community — auth required (creator/admin) |
| `GET` | `/api/communities/:id/posts` | Get posts in a community |
| `GET` | `/api/communities/:id/members` | Get community members |
| `POST` | `/api/communities/:id/join` | Join (or request to join private) community |
| `POST` | `/api/communities/:id/leave` | Leave a community |
| `PATCH` | `/api/communities/:id/policy` | Update moderation policy |
| `DELETE` | `/api/communities/:id/members/:userId` | Remove a member |
| `DELETE` | `/api/communities/:id/posts/:postId` | Remove a post from community |
| `GET` | `/api/communities/:id/requests` | Get pending join requests |
| `POST` | `/api/communities/:id/requests/:userId/approve` | Approve join request |
| `POST` | `/api/communities/:id/requests/:userId/reject` | Reject join request |

### Moderation — `/api/moderation` *(mod/admin only)*
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/moderation/reports` | Get full moderation report queue |
| `GET` | `/api/moderation/escalated` | Get escalated reports |
| `GET` | `/api/moderation/flagged-posts` | Get flagged posts |
| `PATCH` | `/api/moderation/posts/:id/status` | Set post status |
| `POST` | `/api/moderation/posts/:id/approve` | Approve a post |
| `POST` | `/api/moderation/posts/:id/remove` | Remove a post |
| `PATCH` | `/api/moderation/reports/:id/escalate` | Escalate a report |
| `PATCH` | `/api/moderation/reports/:id` | Update report status |
| `POST` | `/api/moderation/users/:id/warn` | Warn a user |
| `POST` | `/api/moderation/users/:id/suspend` | Suspend a user |
| `POST` | `/api/moderation/users/:id/ban` | Permanently ban a user |

### Admin — `/api/admin` *(admin only)*
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/admin/invite` | Send role-scoped invite email |
| `GET` | `/api/admin/users` | List all users |
| `PATCH` | `/api/admin/users/:id` | Update user email/role |
| `PATCH` | `/api/admin/users/:id/role` | Change user role |
| `POST` | `/api/admin/users/:id/warn` | Warn a user |
| `POST` | `/api/admin/users/:id/suspend` | Suspend a user |
| `POST` | `/api/admin/users/:id/ban` | Ban a user |
| `POST` | `/api/admin/users/:id/restore` | Restore a suspended/banned user |

### Notifications — `/api/notifications` *(auth required)*
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/notifications` | Get my notifications |
| `PATCH` | `/api/notifications/read-all` | Mark all notifications as read |
| `PATCH` | `/api/notifications/:id/read` | Mark a single notification as read |

### Analytics — `/api/analytics`
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics/summary` | Platform summary — admin/analyst only |
| `GET` | `/api/analytics/posts/:id` | Per-post analytics — creator/admin/analyst |

### Compliance — `/api/compliance` *(compliance_officer/admin)*
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/compliance/audit-logs` | Full audit log with filters |
| `GET` | `/api/compliance/audit-logs/action-types` | List of all loggable action types |
| `GET` | `/api/compliance/users/:id/export` | Export user data (JSON/CSV/PDF) |
| `GET` | `/api/compliance/users/:id/access-history` | Get login/access history |
| `POST` | `/api/compliance/users/:id/deletion-request` | Request data deletion — auth required |
| `GET` | `/api/compliance/deletion-requests` | List data deletion requests |
| `PATCH` | `/api/compliance/deletion-requests/:id` | Approve/reject deletion request |

### Users — `/api/users`
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users/search` | Search users |
| `GET` | `/api/users/:username` | Get public user profile |
| `POST` | `/api/users/:id/follow` | Follow a user — auth required |
| `POST` | `/api/users/:id/unfollow` | Unfollow a user — auth required |
| `GET` | `/api/users/:id/followers` | Get followers list |
| `GET` | `/api/users/:id/following` | Get following list |

---

## ⚙️ Background Cron Jobs

The scheduler (`services/scheduler.js`) runs **5 automatic background jobs** when the server starts:

| Job | Schedule | Description |
|---|---|---|
| Publish Scheduled Posts | Every minute | Publishes posts whose `scheduled_date` has passed |
| Trending Hashtag Recalculation | Every 15 minutes | Scans last 24H posts, extracts and counts `#hashtags`, updates cache |
| Moderation SLA Monitor | Every hour (at :30) | Auto-escalates reports older than 48H to `ESCALATED` status |
| User Risk Score Sweep | Every hour (at :00) | Warns users with ≥ 3 removed posts; temp-suspends users with ≥ 5 |
| Weekly Analytics Snapshot | Every Sunday at midnight | Snapshots active users, new users, posts, and flagged ratio into `weekly_analytics` |

---

## 📝 License

MIT
