-- ============================================================
-- schema.sql — Database schema for Social Publishing Platform
-- Supports 12 integrated features (RBAC, Communities, Lifecycles, Reporting, AI Scoring, Suspensions, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  username    TEXT UNIQUE NOT NULL,
  email       TEXT UNIQUE COLLATE NOCASE NOT NULL,
  password    TEXT NOT NULL,
  first_name  TEXT DEFAULT NULL,
  last_name   TEXT DEFAULT NULL,
  role        TEXT NOT NULL DEFAULT 'user', -- 'user', 'creator', 'moderator', 'senior_moderator', 'admin', 'compliance_officer', 'analyst'
  status      TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'WARNING', 'TEMP_SUSPENDED', 'PERMANENTLY_BANNED'
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS follows (
  id           TEXT PRIMARY KEY,
  follower_id  TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (follower_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE(follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS communities (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  description       TEXT,
  moderation_policy TEXT,
  created_by        TEXT, -- ID of the user who created the community
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS community_members (
  id           TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  user_id      TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'member', -- 'member', 'moderator'
  joined_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (community_id) REFERENCES communities (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS posts (
  id               TEXT PRIMARY KEY,
  community_id     TEXT,
  user_id          TEXT NOT NULL,
  content          TEXT NOT NULL,
  post_type        TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'video', 'poll', 'thread', 'scheduled'
  status           TEXT NOT NULL DEFAULT 'PUBLISHED', -- 'DRAFT', 'PUBLISHED', 'FLAGGED', 'UNDER_REVIEW', 'APPROVED', 'REMOVED', 'ARCHIVED', 'SCHEDULED'
  language         TEXT NOT NULL DEFAULT 'en',
  original_post_id TEXT, -- for reposts
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (community_id) REFERENCES communities (id) ON DELETE SET NULL,
  FOREIGN KEY (original_post_id) REFERENCES posts (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS polls (
  id         TEXT PRIMARY KEY,
  post_id    TEXT NOT NULL,
  question   TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS poll_options (
  id          TEXT PRIMARY KEY,
  poll_id     TEXT NOT NULL,
  option_text TEXT NOT NULL,
  votes       INTEGER DEFAULT 0,
  FOREIGN KEY (poll_id) REFERENCES polls (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id         TEXT PRIMARY KEY,
  poll_id    TEXT NOT NULL,
  option_id  TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (poll_id) REFERENCES polls (id) ON DELETE CASCADE,
  FOREIGN KEY (option_id) REFERENCES poll_options (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE(poll_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id         TEXT PRIMARY KEY,
  post_id    TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS likes (
  id         TEXT PRIMARY KEY,
  post_id    TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS dislikes (
  id         TEXT PRIMARY KEY,
  post_id    TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id         TEXT PRIMARY KEY,
  post_id    TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id            TEXT PRIMARY KEY,
  post_id       TEXT NOT NULL,
  reporter_id   TEXT NOT NULL,
  reason        TEXT NOT NULL, -- 'hate speech', 'spam', 'misinformation', 'harassment', 'nsfw content'
  report_status TEXT NOT NULL DEFAULT 'SUBMITTED', -- 'SUBMITTED', 'AUTO_RISK_SCORING', 'MODERATOR_REVIEW', 'ESCALATED', 'DECISION', 'CLOSED'
  risk_score    REAL DEFAULT 0, -- AI toxicity score (0-1)
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  type       TEXT NOT NULL, -- 'like', 'comment', 'mention', 'moderation_decision', 'report_outcome', 'warning', 'suspension'
  message    TEXT NOT NULL,
  is_read    INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id           TEXT PRIMARY KEY,
  admin_id     TEXT NOT NULL,        -- actor (user who triggered the action)
  actor_role   TEXT,                 -- role of the actor at time of action
  action       TEXT NOT NULL,        -- e.g. 'post.edited', 'user.banned', 'report.decision'
  target_id    TEXT,                 -- referenced entity (post:uuid, user:uuid, report:uuid)
  before_state TEXT,                 -- JSON snapshot before the change
  after_state  TEXT,                 -- JSON snapshot after the change
  details      TEXT,                 -- arbitrary extra context (JSON)
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id            TEXT PRIMARY KEY,
  post_id       TEXT NOT NULL,
  views_count   INTEGER DEFAULT 0,
  reach_score   INTEGER DEFAULT 0,
  snapshot_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,        -- the user whose data is to be deleted
  requested_by TEXT NOT NULL,        -- who submitted the request (self or admin)
  status       TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'
  reason       TEXT,
  resolved_at  DATETIME,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)      REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS access_history (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Analytics & Scheduled Jobs Tables ----------------------------------------

CREATE TABLE IF NOT EXISTS trending_topics (
  hashtag TEXT PRIMARY KEY,
  use_count INTEGER DEFAULT 0,
  last_calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weekly_analytics (
  id TEXT PRIMARY KEY,
  week_start_date DATE NOT NULL,
  active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  new_posts INTEGER DEFAULT 0,
  flagged_content_ratio REAL DEFAULT 0.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Invite Tokens (sent by admin to invite users with a specific role) --------
CREATE TABLE IF NOT EXISTS invite_tokens (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'user',
  token       TEXT UNIQUE NOT NULL,
  invited_by  TEXT NOT NULL,          -- admin user id
  expires_at  DATETIME NOT NULL,      -- 10 minutes from creation
  used        INTEGER DEFAULT 0,      -- 0 = unused, 1 = used
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invited_by) REFERENCES users (id) ON DELETE CASCADE
);

-- Password Reset Tokens (forgot password flow) --------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  token       TEXT UNIQUE NOT NULL,
  expires_at  DATETIME NOT NULL,      -- 10 minutes from creation
  used        INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
