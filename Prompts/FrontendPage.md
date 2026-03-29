Create a modern React frontend for a Social Publishing & Moderation Platform using Vite.

Use:
React
Functional components
React Hooks
Fetch API for backend communication

Use a clean UI with simple CSS or Tailwind-style utility classes.

Create the following pages:

Login Page
Signup Page
Home Feed
Create Post Page
Explore Page
Communities Page
Notifications Page
Profile Page
Moderation Dashboard
Admin Dashboard
Compliance Page
Analytics Page

Navigation Layout:

Top Navigation Bar
- Home
- Explore
- Communities
- Create Post
- Notifications
- Profile

Sidebar (for moderator/admin users):
- Moderation Dashboard
- Admin Dashboard
- Compliance
- Analytics

Home Feed Page:
- Display posts in cards
- Show username, timestamp, and post content
- Buttons for:
  like
  comment
  bookmark
  report
- Infinite scroll layout

Create Post Page:
- Text editor
- Image upload field
- Community selector dropdown
- Buttons:
  Save Draft
  Publish
  Schedule

Explore Page:
- Trending hashtags
- Search bar
- Suggested users
- Filter options:
  keyword
  date range
  engagement

Communities Page:
- List of communities
- Join community button
- Community feed view

Notifications Page:
Display notifications for:
- likes
- comments
- mentions
- moderation decisions
- report results

Profile Page:
Tabs:
- Posts
- Replies
- Media
- Bookmarks
- Followers
- Following

Moderation Dashboard:
Table layout with columns:

Post ID
User
Risk Score
Report Count
Category
Status
Date

Filters:
- Risk score
- Report type
- Status
- Date range

Actions:
- Approve
- Remove
- Warn user
- Escalate

Admin Dashboard:
User management panel:
- list users
- suspend user
- change role

Compliance Page:
- data export requests
- audit logs
- data deletion requests

Analytics Page:
Charts displaying:
- active users
- post growth
- flagged content ratio
- trending topics

Project structure:

src
│
├── pages
│   ├── LoginPage.jsx
│   ├── SignupPage.jsx
│   ├── HomeFeed.jsx
│   ├── CreatePost.jsx
│   ├── Explore.jsx
│   ├── Communities.jsx
│   ├── Notifications.jsx
│   ├── Profile.jsx
│   ├── ModerationDashboard.jsx
│   ├── AdminDashboard.jsx
│   ├── Compliance.jsx
│   └── Analytics.jsx
│
├── components
│   ├── Navbar.jsx
│   ├── Sidebar.jsx
│   ├── PostCard.jsx
│   ├── CommentSection.jsx
│   ├── NotificationItem.jsx
│   └── AnalyticsChart.jsx
│
├── services
│   └── api.js
│
├── App.jsx
└── main.jsx

Use responsive design so the UI works on desktop and mobile.                                     Use modern card-based UI similar to LinkedIn or Twitter feeds.

Add clear comments in the code to explain each component.