# Database Structure

The Social Publishing Platform uses SQLite. The main database file is mapped in `db.js` and stored at `backend/data.sqlite`.

## Tables Overview

### 1. `users`
**Purpose**: Stores all user accounts on the platform.
- `id` (TEXT, Primary Key)
- `username` (TEXT, Unique)
- `email` (TEXT, Unique)
- `password` (TEXT)
- `first_name` (TEXT)
- `last_name` (TEXT)
- `role` (TEXT)
- `status` (TEXT)
- `created_at` (DATETIME)

### 2. `follows`
**Purpose**: Tracks follower and following relationships between users.
- `id` (TEXT, Primary Key)
- `follower_id` (TEXT, Foreign Key -> users)
- `following_id` (TEXT, Foreign Key -> users)
- `created_at` (DATETIME)

### 3. `communities`
**Purpose**: Stores created communities/groups on the platform.
- `id` (TEXT, Primary Key)
- `name` (TEXT)
- `description` (TEXT)
- `moderation_policy` (TEXT)
- `created_by` (TEXT, Foreign Key -> users)
- `created_at` (DATETIME)

### 4. `community_members`
**Purpose**: Links users to communities as members or moderators.
- `id` (TEXT, Primary Key)
- `community_id` (TEXT, Foreign Key -> communities)
- `user_id` (TEXT, Foreign Key -> users)
- `role` (TEXT)
- `joined_at` (DATETIME)

### 5. `posts`
**Purpose**: Stores content posted by users across the platform or inside communities.
- `id` (TEXT, Primary Key)
- `community_id` (TEXT, Foreign Key -> communities)
- `user_id` (TEXT, Foreign Key -> users)
- `content` (TEXT)
- `post_type` (TEXT)
- `status` (TEXT)
- `language` (TEXT)
- `original_post_id` (TEXT, Foreign Key -> posts)
- `created_at` (DATETIME)

### 6. `polls`
**Purpose**: Stores poll details attached to a regular post.
- `id` (TEXT, Primary Key)
- `post_id` (TEXT, Foreign Key -> posts)
- `question` (TEXT)
- `created_at` (DATETIME)

### 7. `poll_options`
**Purpose**: Stores options for specific polls.
- `id` (TEXT, Primary Key)
- `poll_id` (TEXT, Foreign Key -> polls)
- `option_text` (TEXT)
- `votes` (INTEGER)

### 8. `poll_votes`
**Purpose**: Tracks which option a user voted for in a poll.
- `id` (TEXT, Primary Key)
- `poll_id` (TEXT, Foreign Key -> polls)
- `option_id` (TEXT, Foreign Key -> poll_options)
- `user_id` (TEXT, Foreign Key -> users)
- `created_at` (DATETIME)

### 9. `comments`
**Purpose**: Stores comments made on posts.
- `id` (TEXT, Primary Key)
- `post_id` (TEXT, Foreign Key -> posts)
- `user_id` (TEXT, Foreign Key -> users)
- `content` (TEXT)
- `created_at` (DATETIME)

### 10. `likes`
**Purpose**: Stores user likes on specific posts.
- `id` (TEXT, Primary Key)
- `post_id` (TEXT, Foreign Key -> posts)
- `user_id` (TEXT, Foreign Key -> users)
- `created_at` (DATETIME)

### 11. `bookmarks`
**Purpose**: Stores posts bookmarked by users to view later.
- `id` (TEXT, Primary Key)
- `post_id` (TEXT, Foreign Key -> posts)
- `user_id` (TEXT, Foreign Key -> users)
- `created_at` (DATETIME)

### 12. `reports`
**Purpose**: Records violation reports against posts.
- `id` (TEXT, Primary Key)
- `post_id` (TEXT, Foreign Key -> posts)
- `reporter_id` (TEXT, Foreign Key -> users)
- `reason` (TEXT)
- `report_status` (TEXT)
- `risk_score` (REAL)
- `created_at` (DATETIME)

### 13. `notifications`
**Purpose**: Stores notifications meant for users (e.g. mentions, moderation decisions).
- `id` (TEXT, Primary Key)
- `user_id` (TEXT, Foreign Key -> users)
- `type` (TEXT)
- `message` (TEXT)
- `is_read` (INTEGER)
- `created_at` (DATETIME)

### 14. `audit_logs`
**Purpose**: Keeps track of administrative and moderator actions.
- `id` (TEXT, Primary Key)
- `admin_id` (TEXT, Foreign Key -> users)
- `actor_role` (TEXT)
- `action` (TEXT)
- `target_id` (TEXT)
- `before_state` (TEXT)
- `after_state` (TEXT)
- `details` (TEXT)
- `created_at` (DATETIME)

### 15. `analytics_snapshots`
**Purpose**: Stores periodic engagement insights for posts.
- `id` (TEXT, Primary Key)
- `post_id` (TEXT, Foreign Key -> posts)
- `views_count` (INTEGER)
- `reach_score` (INTEGER)
- `snapshot_date` (DATETIME)

### 16. `data_deletion_requests`
**Purpose**: Records requests made by users to delete their accounts/data.
- `id` (TEXT, Primary Key)
- `user_id` (TEXT, Foreign Key -> users)
- `requested_by` (TEXT, Foreign Key -> users)
- `status` (TEXT)
- `reason` (TEXT)
- `resolved_at` (DATETIME)
- `created_at` (DATETIME)

### 17. `access_history`
**Purpose**: Tracks when and from where users sign in (IP, user agent).
- `id` (TEXT, Primary Key)
- `user_id` (TEXT, Foreign Key -> users)
- `ip_address` (TEXT)
- `user_agent` (TEXT)
- `created_at` (DATETIME)

### 18. `trending_topics`
**Purpose**: Tracks trending hashtags/topics and their popularity.
- `hashtag` (TEXT, Primary Key)
- `use_count` (INTEGER)
- `last_calculated_at` (DATETIME)

### 19. `weekly_analytics`
**Purpose**: Stores aggregated weekly analytics for the whole platform.
- `id` (TEXT, Primary Key)
- `week_start_date` (DATE)
- `active_users` (INTEGER)
- `new_users` (INTEGER)
- `new_posts` (INTEGER)
- `flagged_content_ratio` (REAL)
- `created_at` (DATETIME)

### 20. `invite_tokens`
**Purpose**: Stores tokens used to invite specific users (e.g., moderators/admins).
- `id` (TEXT, Primary Key)
- `email` (TEXT)
- `role` (TEXT)
- `token` (TEXT)
- `invited_by` (TEXT, Foreign Key -> users)
- `expires_at` (DATETIME)
- `used` (INTEGER)
- `created_at` (DATETIME)

### 21. `password_reset_tokens`
**Purpose**: Stores tokens for password recovery securely.
- `id` (TEXT, Primary Key)
- `user_id` (TEXT, Foreign Key -> users)
- `token` (TEXT)
- `expires_at` (DATETIME)
- `used` (INTEGER)
- `created_at` (DATETIME)
