import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import {
  Heart, MessageCircle, AlertTriangle, ShieldCheck,
  Check, Bell, AtSign, CheckCheck, FileText,
  Image as ImageIcon, ExternalLink, ThumbsDown, Users
} from 'lucide-react';

// ── Utilities ──────────────────────────────────────────────────────────────

function safeDate(str) {
  if (!str) return null;
  if (String(str).includes('T')) return new Date(str);
  return new Date(String(str).replace(' ', 'T') + 'Z');
}

// Parse post content — handle image JSON, plain text, poll
function parsePostContent(content, post_type) {
  if (!content) return { text: '', imageData: '' };
  if (post_type === 'image') {
    try {
      const parsed = JSON.parse(content);
      return { text: parsed.caption || '', imageData: parsed.imageData || '' };
    } catch {
      return { text: content, imageData: '' };
    }
  }
  return { text: content, imageData: '' };
}

// ── Icon helpers ────────────────────────────────────────────────────────────

function getIcon(type) {
  switch (type) {
    case 'like':               return <Heart className="h-5 w-5 text-rose-500" />;
    case 'comment':            return <MessageCircle className="h-5 w-5 text-blue-500" />;
    case 'mention':            return <AtSign className="h-5 w-5 text-purple-500" />;
    case 'warning':            return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    case 'suspension':         return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case 'moderation_decision':
    case 'report_outcome':     return <ShieldCheck className="h-5 w-5 text-indigo-500" />;
    default:                   return <Bell className="h-5 w-5 text-slate-500" />;
  }
}

function getCardBorder(type) {
  switch (type) {
    case 'like':               return 'border-rose-200';
    case 'comment':            return 'border-blue-200';
    case 'mention':            return 'border-purple-200';
    case 'warning':
    case 'suspension':         return 'border-amber-200';
    case 'moderation_decision':
    case 'report_outcome':     return 'border-indigo-200';
    default:                   return 'border-slate-200';
  }
}

function getAccentBg(type, isRead) {
  if (isRead) return 'bg-white';
  switch (type) {
    case 'like':               return 'bg-rose-50/60';
    case 'comment':            return 'bg-blue-50/60';
    case 'mention':            return 'bg-purple-50/60';
    case 'warning':
    case 'suspension':         return 'bg-amber-50/60';
    case 'moderation_decision':
    case 'report_outcome':     return 'bg-indigo-50/40';
    default:                   return 'bg-slate-50';
  }
}

// ── Post type pill ──────────────────────────────────────────────────────────

function PostTypePill({ post_type }) {
  if (!post_type) return null;
  const map = {
    text:  { icon: <FileText className="h-3 w-3" />,   label: 'Text',  cls: 'bg-slate-100 text-slate-600' },
    image: { icon: <ImageIcon className="h-3 w-3" />,  label: 'Image', cls: 'bg-sky-100 text-sky-700' },
    poll:  { icon: <span>📊</span>,                     label: 'Poll',  cls: 'bg-violet-100 text-violet-700' },
  };
  const item = map[post_type] || { icon: <FileText className="h-3 w-3" />, label: post_type, cls: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${item.cls}`}>
      {item.icon} {item.label}
    </span>
  );
}

// ── Inline Post Embed ────────────────────────────────────────────────────────
// Shows the full post content inline inside the notification card

function InlinePostEmbed({ post }) {
  if (!post) return null;

  const { text, imageData } = parsePostContent(post.content, post.post_type);
  const authorInitial = (post.post_author || 'U')[0].toUpperCase();
  const createdDate = safeDate(post.post_created_at);
  const timeAgo = createdDate ? formatDistanceToNow(createdDate, { addSuffix: true }) : '';

  return (
    <Link
      to={`/post/${post.id}`}
      className="block mt-3 rounded-xl border border-slate-200 bg-white hover:border-primary/40 hover:shadow-sm transition-all group overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      {/* Post header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-blue-100 to-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
            {authorInitial}
          </div>
          <div>
            <span className="text-sm font-semibold text-slate-800">{post.post_author}</span>
            <span className="text-xs text-slate-400 ml-2">{timeAgo}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PostTypePill post_type={post.post_type} />
          {post.community_name && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
              {post.community_name}
            </span>
          )}
        </div>
      </div>

      {/* Post content */}
      <div className="px-4 pb-3">
        {text && (
          <p className="text-sm text-slate-700 leading-relaxed line-clamp-3 whitespace-pre-wrap">
            {text}
          </p>
        )}
        {imageData && (
          <img
            src={imageData}
            alt="Post"
            className="mt-2 w-full max-h-40 object-cover rounded-lg border border-slate-100"
          />
        )}
        {post.post_type === 'poll' && !text && (
          <p className="text-sm text-slate-500 italic">📊 Poll post</p>
        )}
      </div>

      {/* Post stats + CTA */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5 text-rose-400" />
            {post.like_count || 0}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5 text-blue-400" />
            {post.comment_count || 0}
          </span>
        </div>
        <span className="text-xs font-medium text-primary group-hover:underline flex items-center gap-1">
          View Post <ExternalLink className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications</h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full text-xs font-bold bg-primary text-white">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
          >
            <CheckCheck className="h-4 w-4" /> Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">Loading notifications…</div>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => {
            const createdDate = safeDate(n.created_at);
            const timeAgo = createdDate ? formatDistanceToNow(createdDate, { addSuffix: true }) : '';
            const hasPost = !!n.linked_post;

            return (
              <div
                key={n.id}
                className={`rounded-xl border shadow-sm transition-all hover:shadow-md ${getCardBorder(n.type)} ${getAccentBg(n.type, n.is_read)}`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Type icon */}
                    <div className="mt-0.5 flex-shrink-0 bg-white p-2 rounded-full shadow-sm ring-1 ring-slate-100">
                      {getIcon(n.type)}
                    </div>

                    {/* Content area */}
                    <div className="flex-1 min-w-0">
                      {/* Message */}
                      <p className={`text-sm leading-snug ${!n.is_read ? 'text-slate-900 font-semibold' : 'text-slate-600'}`}>
                        {n.actor_username ? (
                          <>
                            <Link
                              to={`/user/${n.actor_username}`}
                              className="font-bold text-slate-900 hover:underline hover:text-primary"
                              onClick={e => e.stopPropagation()}
                            >
                              {n.actor_username}
                            </Link>
                            {' '}
                            {/* Strip the actor name from the message if it starts with it */}
                            {n.message.startsWith(n.actor_username)
                              ? n.message.slice(n.actor_username.length).trim()
                              : n.message}
                          </>
                        ) : (
                          n.message
                        )}
                      </p>

                      {/* Timestamp */}
                      <p className="text-xs text-slate-400 mt-0.5">{timeAgo}</p>

                      {/* ── Inline Post Embed ── */}
                      {hasPost ? (
                        <InlinePostEmbed post={n.linked_post} />
                      ) : (
                        /* For post-related types with no resolvable post */
                        ['like', 'comment', 'mention', 'moderation_decision', 'report_outcome'].includes(n.type) && (
                          <div className="mt-3 px-3 py-2 rounded-lg border border-dashed border-slate-200 bg-white/60 text-xs text-slate-400 italic">
                            [The related post is no longer available]
                          </div>
                        )
                      )}
                    </div>

                    {/* Mark as read */}
                    {!n.is_read && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="flex-shrink-0 p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {notifications.length === 0 && (
            <div className="py-20 flex flex-col items-center text-slate-400 gap-3">
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                <Bell className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-500">You're all caught up!</p>
              <p className="text-xs text-slate-400">New likes, comments and mentions will appear here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}