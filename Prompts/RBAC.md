Implement Role Based Access Control (RBAC) for the platform.

Roles:

user
creator
moderator
senior_moderator
admin
compliance_officer
analyst

Create middleware:

authMiddleware.js
roleMiddleware.js

Permissions:

user
create posts
comment
like
report content

creator
view creator analytics

moderator
review flagged posts
approve or remove posts

senior_moderator
handle escalated moderation cases

admin
manage users
suspend users
change roles

compliance_officer
view audit logs
export user data

analyst
view analytics dashboards