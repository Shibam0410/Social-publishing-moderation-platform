import { useState, useEffect } from 'react';
import { getComments, addComment } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { Send } from 'lucide-react';

// Safely parse dates from SQLite ("2024-01-01 12:00:00") or ISO format (has T)
function safeDate(str) {
  if (!str) return null;
  if (String(str).includes('T')) return new Date(str);
  return new Date(String(str).replace(' ', 'T') + 'Z');
}

export default function CommentSection({ postId, user }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    try {
      const data = await getComments(postId);
      setComments(data.comments || []);
    } catch (err) {
      console.error('Failed to load comments', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const resp = await addComment(postId, newComment);
      const createdComment = {
        id: resp.commentId || Date.now(),
        user_id: user.id,
        username: user.username, // using local context for optimistic update
        content: newComment,
        created_at: new Date().toISOString()
      };
      setComments([...comments, createdComment]);
      setNewComment('');
    } catch (err) {
      alert(err.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-4 text-center text-slate-500 text-sm">Loading comments...</div>;

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <h4 className="font-semibold text-sm mb-4 text-slate-700">Comments ({comments.length})</h4>
      
      <div className="space-y-4 mb-4 max-h-60 overflow-y-auto pr-2">
        {comments.map(c => (
          <div key={c.id} className="bg-slate-50 p-3 rounded-lg flex space-x-3">
            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold shrink-0">
              {(c.author_name || c.username || 'U')[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm">{c.author_name || c.username || 'User'}</span>
                <span className="text-xs text-slate-400">
                  {(() => { const d = safeDate(c.created_at); return d ? formatDistanceToNow(d, { addSuffix: true }) : ''; })()}
                </span>
              </div>
              <p className="text-sm text-slate-700 mt-1">{c.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && <p className="text-sm text-slate-500 italic">No comments yet. Be the first!</p>}
      </div>

      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="input text-sm py-2 bg-slate-50 border-0 ring-1 ring-inset ring-slate-200 focus:ring-inset focus:ring-primary"
          disabled={submitting}
        />
        <button 
          type="submit" 
          disabled={!newComment.trim() || submitting}
          className="btn px-3 py-2 flex items-center justify-center shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}