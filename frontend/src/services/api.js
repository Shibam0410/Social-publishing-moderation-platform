// src/services/api.js
const API_BASE_URL = '/api';

/** Helper to retrieve the auth token from localStorage */
const getToken = () => localStorage.getItem('token');

/** Generic fetch wrapper that injects the auth token and parses JSON */
async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const isPdfOrCsv = headers['Accept'] && !headers['Accept'].includes('json');
  if (isPdfOrCsv && response.ok) {
    return response.blob();
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || response.statusText || 'An error occurred.');
  }

  return data;
}

// ─────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────
export const login = (email, password) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const oauthLogin = (provider, email, name, oauthId) => apiFetch('/auth/oauth', { method: 'POST', body: JSON.stringify({ provider, email, name, oauthId }) });
export const mfaLogin = (mfaToken, token) => apiFetch('/auth/mfa-login', { method: 'POST', body: JSON.stringify({ mfaToken, token }) });
export const setupMFA = () => apiFetch('/auth/mfa/setup', { method: 'POST' });
export const verifyMFA = (token) => apiFetch('/auth/mfa/verify', { method: 'POST', body: JSON.stringify({ token }) });
export const register = (username, email, password) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) });
export const getProfile = () => apiFetch('/auth/profile');
export const getUserProfile = (username) => apiFetch(`/users/${username}`);
export const followUser = (id) => apiFetch(`/users/${id}/follow`, { method: 'POST' });
export const unfollowUser = (id) => apiFetch(`/users/${id}/unfollow`, { method: 'POST' });
export const getFollowers = (id) => apiFetch(`/users/${id}/followers`);
export const getFollowing = (id) => apiFetch(`/users/${id}/following`);
export const getSuggestedUsers = (limit = 5) => apiFetch(`/users/suggested?limit=${limit}`);
export const searchUsers = (q) => apiFetch(`/users/search?q=${encodeURIComponent(q)}`);
export const updateProfile = (username, first_name, last_name) => apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify({ username, first_name, last_name }) });
export const forgotPassword = (email) => apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
export const resetPassword = (token, newPassword) => apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) });
export const validateInviteToken = (token) => apiFetch(`/auth/validate-invite?token=${token}`);
export const acceptInvite = (token, username, password) => apiFetch('/auth/accept-invite', { method: 'POST', body: JSON.stringify({ token, username, password }) });
export const adminInviteUser = (email, role) => apiFetch('/admin/invite', { method: 'POST', body: JSON.stringify({ email, role }) });
// ─────────────────────────────────────────────────────────────
// POSTS
// ─────────────────────────────────────────────────────────────
export const getPosts = (page = 1, limit = 10, community_id = '', feedType = '') => {
  const q = new URLSearchParams({ page, limit });
  if (community_id) q.append('community_id', community_id);
  if (feedType) q.append('feed_type', feedType);
  return apiFetch(`/posts?${q.toString()}`);
};
export const getPost = (id) => apiFetch(`/posts/${id}`);
export const createPost = (content, post_type = 'text', community_id = null, original_post_id = null, poll_options = [], scheduled_date = null) =>
  apiFetch('/posts', { method: 'POST', body: JSON.stringify({ content, post_type, community_id, original_post_id, poll_options, scheduled_date }) });
export const updatePost = (id, content) =>
  apiFetch(`/posts/${id}`, { method: 'PUT', body: JSON.stringify({ content }) });
export const deletePost = (id) =>
  apiFetch(`/posts/${id}`, { method: 'DELETE' });
export const repostPost = (id) => apiFetch(`/posts/${id}/repost`, { method: 'POST' });
export const searchPosts = (queryObj) => {
  const q = new URLSearchParams(queryObj);
  return apiFetch(`/posts/search?${q.toString()}`);
};

// Engagements
export const toggleLike = (id) => apiFetch(`/posts/${id}/like`, { method: 'POST' });
export const toggleDislike = (id) => apiFetch(`/posts/${id}/dislike`, { method: 'POST' });
export const votePoll = (id, option_id) =>
  apiFetch(`/posts/${id}/vote`, { method: 'POST', body: JSON.stringify({ option_id }) });
export const toggleBookmark = (id) => apiFetch(`/posts/${id}/bookmark`, { method: 'POST' });
export const getBookmarks = () => apiFetch('/posts/bookmarks');
export const addComment = (id, content) => apiFetch(`/posts/${id}/comment`, { method: 'POST', body: JSON.stringify({ content }) });
export const getComments = (id) => apiFetch(`/posts/${id}/comments`);

// Report Post
export const reportPost = (id, reason) => apiFetch(`/posts/${id}/report`, { method: 'POST', body: JSON.stringify({ reason }) });

// ─────────────────────────────────────────────────────────────
// COMMUNITIES
// ─────────────────────────────────────────────────────────────
export const getCommunities = () => apiFetch('/communities');
export const getCommunity = (id) => apiFetch(`/communities/${id}`);
export const createCommunity = (name, description, is_private = false) => apiFetch('/communities', { method: 'POST', body: JSON.stringify({ name, description, is_private }) });
export const editCommunity = (id, name, description) => apiFetch(`/communities/${id}`, { method: 'PUT', body: JSON.stringify({ name, description }) });
export const getCommunityRequests = (id) => apiFetch(`/communities/${id}/requests`);
export const approveCommunityRequest = (id, userId) => apiFetch(`/communities/${id}/requests/${userId}/approve`, { method: 'POST' });
export const rejectCommunityRequest = (id, userId) => apiFetch(`/communities/${id}/requests/${userId}/reject`, { method: 'POST' });
export const joinCommunity = (id) => apiFetch(`/communities/${id}/join`, { method: 'POST' });
export const leaveCommunity = (id) => apiFetch(`/communities/${id}/leave`, { method: 'POST' });
export const kickMember = (communityId, userId) => apiFetch(`/communities/${communityId}/members/${userId}`, { method: 'DELETE' });
export const updateCommunityPolicy = (id, policy) => apiFetch(`/communities/${id}/policy`, { method: 'PATCH', body: JSON.stringify({ policy }) });
export const removeCommunityPost = (communityId, postId) => apiFetch(`/communities/${communityId}/posts/${postId}`, { method: 'DELETE' });
export const getCommunityMembers = (id) => apiFetch(`/communities/${id}/members`);

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────
export const getNotifications = () => apiFetch('/notifications');
export const markNotificationRead = (id) => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
export const markAllNotificationsRead = () => apiFetch('/notifications/read-all', { method: 'PATCH' });

// ─────────────────────────────────────────────────────────────
// MODERATION
// ─────────────────────────────────────────────────────────────
export const getModerationReports = (status = 'SUBMITTED') => apiFetch(`/moderation/reports?status=${status}`);
export const getFlaggedPosts = () => apiFetch('/moderation/flagged-posts');
export const getEscalatedReports = () => apiFetch('/moderation/escalated');
export const setPostStatus = (id, status) => apiFetch(`/moderation/posts/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const approvePost = (id) => apiFetch(`/moderation/posts/${id}/approve`, { method: 'POST' });
export const removeModeratedPost = (id, reason) => apiFetch(`/moderation/posts/${id}/remove`, { method: 'POST', body: JSON.stringify({ reason }) });
export const updateReportStatus = (id, status) => apiFetch(`/moderation/reports/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const escalateReport = (id) => apiFetch(`/moderation/reports/${id}/escalate`, { method: 'PATCH' });
export const warnUser = (id, reason) => apiFetch(`/moderation/users/${id}/warn`, { method: 'POST', body: JSON.stringify({ reason }) });
export const suspendUser = (id, reason) => apiFetch(`/moderation/users/${id}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) });
export const banUser = (id, reason) => apiFetch(`/moderation/users/${id}/ban`, { method: 'POST', body: JSON.stringify({ reason }) });

// ─────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────
export const adminGetUsers = () => apiFetch('/admin/users');
export const adminChangeRole = (id, role) => apiFetch(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
export const adminUpdateUser = (id, updates) => apiFetch(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
export const adminWarnUser = (id, reason) => apiFetch(`/admin/users/${id}/warn`, { method: 'POST', body: JSON.stringify({ reason }) });
export const adminSuspendUser = (id, reason) => apiFetch(`/admin/users/${id}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) });
export const adminBanUser = (id, reason) => apiFetch(`/admin/users/${id}/ban`, { method: 'POST', body: JSON.stringify({ reason }) });
export const adminRestoreUser = (id) => apiFetch(`/admin/users/${id}/restore`, { method: 'POST' });

// ─────────────────────────────────────────────────────────────
// COMPLIANCE
// ─────────────────────────────────────────────────────────────
export const getAuditLogs = (action = '', adminId = '', limit = 50, page = 1) => {
  const q = new URLSearchParams({ limit, page });
  if (action) q.append('action', action);
  if (adminId) q.append('admin_id', adminId);
  return apiFetch(`/compliance/audit-logs?${q.toString()}`);
};
export const getActionTypes = () => apiFetch('/compliance/audit-logs/action-types');
export const getAccessHistory = (id) => apiFetch(`/compliance/users/${id}/access-history`);
export const getDeletionRequests = (status = 'PENDING') => apiFetch(`/compliance/deletion-requests?status=${status}`);
export const submitDeletionRequest = (id, reason) => apiFetch(`/compliance/users/${id}/deletion-request`, { method: 'POST', body: JSON.stringify({ reason }) });
export const resolveDeletionRequest = (id, decision, reason) => apiFetch(`/compliance/deletion-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ decision, reason }) });

// Downloads return raw blobs
export const exportDataBlob = async (id, format) => {
  return typeof fetch !== 'undefined' && fetch(`${API_BASE_URL}/compliance/users/${id}/export?format=${format}`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  }).then(r => r.blob());
}

// ─────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────
export const getPlatformSummary = () => apiFetch('/analytics/summary');
export const getPostMetrics = (postId) => apiFetch(`/analytics/posts/${postId}`);
