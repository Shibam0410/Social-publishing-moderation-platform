// routes/posts.js
// ─────────────────────────────────────────────────────────────
// Post routes — mounted at /api/posts in server.js
//
//   GET    /api/posts                   → List/search posts
//   POST   /api/posts                   → Create a post (auth)
//   GET    /api/posts/:id               → Get single post
//   PUT    /api/posts/:id               → Update post (auth, owner)
//   DELETE /api/posts/:id               → Delete post (auth, owner/mod)
//   POST   /api/posts/:id/like          → Toggle like (auth)
//   GET    /api/posts/:id/comments      → Get comments
//   POST   /api/posts/:id/comment       → Add comment (auth)
//   POST   /api/posts/:id/report        → Report post (auth)
// ─────────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();

const {
  createPost,
  listPosts,
  searchPosts,
  getPost,
  updatePost,
  deletePost,
  toggleLike,
  toggleDislike,
  toggleBookmark,
  getBookmarks,
  addComment,
  getComments,
  reportPost,
  votePoll,
  repost
} = require('../controllers/postsController');

const authMiddleware = require('../middleware/authMiddleware');
const optionalAuthMiddleware = require('../middleware/optionalAuthMiddleware');

// Public — anyone can browse posts and comments
router.get('/',                optionalAuthMiddleware, listPosts);
router.get('/search',          optionalAuthMiddleware, searchPosts);
router.get('/bookmarks',       authMiddleware, getBookmarks);
router.get('/:id',             optionalAuthMiddleware, getPost);
router.get('/:id/comments',    optionalAuthMiddleware, getComments);

// Protected — must be logged in
router.post('/',               authMiddleware, createPost);
router.put('/:id',             authMiddleware, updatePost);
router.delete('/:id',          authMiddleware, deletePost);
router.post('/:id/like',       authMiddleware, toggleLike);
router.post('/:id/dislike',    authMiddleware, toggleDislike);
router.post('/:id/bookmark',   authMiddleware, toggleBookmark);
router.post('/:id/comment',    authMiddleware, addComment);
router.post('/:id/report',     authMiddleware, reportPost);
router.post('/:id/vote',       authMiddleware, votePoll);
router.post('/:id/repost',     authMiddleware, repost);

module.exports = router;
