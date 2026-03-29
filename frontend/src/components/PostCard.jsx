import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Heart, ThumbsDown, MessageCircle, Bookmark, AlertTriangle, MoreHorizontal, Share2, X, Flag, Repeat } from 'lucide-react';
import CommentSection from './CommentSection';
import { toggleLike, toggleDislike, toggleBookmark, reportPost, votePoll, repostPost } from '../services/api';

// Safely parse dates from SQLite ("2024-01-01 12:00:00") or ISO format
function safeDate(str) {
  if (!str) return null;
  // Already ISO format (contains T)
  if (String(str).includes('T')) return new Date(str);
  // SQLite format: replace space with T and append Z
  return new Date(String(str).replace(' ', 'T') + 'Z');
}

// Report reasons matching the platform's moderation categories
const REPORT_REASONS = [
  { value: 'spam',           label: 'Spam',           desc: 'Unsolicited or repetitive content' },
  { value: 'misinformation', label: 'Misinformation', desc: 'False or misleading information' },
  { value: 'harassment',     label: 'Harassment',     desc: 'Targeted abuse or bullying' },
  { value: 'hate speech',    label: 'Hate Speech',    desc: 'Content promoting hatred or discrimination' },
  { value: 'nsfw content',   label: 'NSFW',           desc: 'Inappropriate adult content' },
];

export default function PostCard({ post, user }) {
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(post.user_has_liked || false);
  const [likeCount, setLikeCount] = useState(post.stats?.likes || post.like_count || 0);
  const [disliked, setDisliked] = useState(post.user_has_disliked || false);
  const [dislikeCount, setDislikeCount] = useState(post.dislike_count || 0);
  const [bookmarked, setBookmarked] = useState(post.user_has_bookmarked || false);
  const [showMenu, setShowMenu] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Poll state
  const [localPoll, setLocalPoll] = useState(post.poll);
  
  // Repost state
  const [reposting, setReposting] = useState(false);

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  const handleLike = async () => {
    if (!user) return alert('Please log in.');
    try {
      await toggleLike(post.id);
      setLiked(!liked);
      setLikeCount(liked ? Math.max(0, likeCount - 1) : likeCount + 1);
      
      // If we are liking, we must remove dislike
      if (!liked && disliked) {
        setDisliked(false);
        setDislikeCount(Math.max(0, dislikeCount - 1));
      }
    } catch (err) {
      console.error('Failed to like', err);
    }
  };

  const handleDislike = async () => {
    if (!user) return alert('Please log in.');
    try {
      await toggleDislike(post.id);
      setDisliked(!disliked);
      setDislikeCount(disliked ? Math.max(0, dislikeCount - 1) : dislikeCount + 1);
      
      // If we are disliking, we must remove like
      if (!disliked && liked) {
        setLiked(false);
        setLikeCount(Math.max(0, likeCount - 1));
      }
    } catch (err) {
      console.error('Failed to dislike', err);
    }
  };

  const handleBookmark = async () => {
    if (!user) return alert('Please log in.');
    try {
      await toggleBookmark(post.id);
      setBookmarked(!bookmarked);
    } catch (err) {
      console.error('Failed to bookmark', err);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      });
    } else {
      // Non-HTTPS fallback
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const handleRepost = async () => {
    if (!user) return alert('Please log in to repost.');
    if (post.original_post_id) return alert('Cannot repost a repost.');
    setReposting(true);
    try {
      // Repost using dedicated endpoint
      await repostPost(post.id);
      alert('Reposted successfully!');
    } catch (err) {
      alert(err.message || 'Failed to repost');
    } finally {
      setReposting(false);
    }
  };

  const handleVote = async (optionId) => {
    if (!user) return alert('Please login to vote.');
    
    // Optimistic or accurate update from backend response
    try {
      const res = await votePoll(post.id, optionId);
      
      setLocalPoll(prev => {
        let options = [...prev.options];
        const oldVoteId = prev.user_voted_option_id;
        
        if (res.action === 'unpolled') {
          return {
            ...prev,
            user_voted_option_id: null,
            options: options.map(opt => opt.id === optionId ? { ...opt, votes: Math.max(0, opt.votes - 1) } : opt)
          };
        } else if (res.action === 'changed') {
          return {
            ...prev,
            user_voted_option_id: optionId,
            options: options.map(opt => {
              if (opt.id === oldVoteId) return { ...opt, votes: Math.max(0, opt.votes - 1) };
              if (opt.id === optionId) return { ...opt, votes: opt.votes + 1 };
              return opt;
            })
          };
        } else {
          // voted
          return {
            ...prev,
            user_voted_option_id: optionId,
            options: options.map(opt => opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt)
          };
        }
      });
    } catch (err) {
      alert(err.message || 'Failed to vote');
    }
  };

  const openReportModal = () => {
    setShowMenu(false);
    setSelectedReason('');
    setReportDone(false);
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (!selectedReason) return;
    setReporting(true);
    try {
      await reportPost(post.id, selectedReason);
      setReportDone(true);
    } catch (err) {
      alert(err.message || 'Failed to report post');
    } finally {
      setReporting(false);
    }
  };

  return (
    <>
      <div className="card mb-4 bg-white hover:border-slate-300 transition-colors">
        {post.original_post_id && (
          <div className="text-xs text-slate-500 mb-3 flex items-center gap-1.5 font-medium ml-1">
             <Repeat className="h-3.5 w-3.5" /> <Link to={`/user/${post.author_name}`} className="hover:underline">{post.author_name}</Link> Reposted
          </div>
        )}
        
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-100 to-primary/20 flex items-center justify-center text-primary font-bold">
              {((post.original_post_id ? post.original_post?.author_name : post.author_name) || post.username || 'U')[0].toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-slate-900 flex items-center gap-2">
                <Link to={`/user/${(post.original_post_id ? post.original_post?.author_name : post.author_name) || post.username}`} className="hover:underline text-slate-900">
                  {(post.original_post_id ? post.original_post?.author_name : post.author_name) || post.username || 'Unknown User'}
                </Link>
                {post.author_role === 'creator' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">
                    ✓ Creator
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500">
                {(() => { const d = safeDate(post.created_at); return d ? formatDistanceToNow(d, { addSuffix: true }) : 'Recently'; })()}
              </div>
            </div>
            {post.community_name && (
              <Link to={`/community/${post.community_id}`} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer text-slate-800 ml-2">
                c/{post.community_name}
              </Link>
            )}
          </div>
          
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
              <MoreHorizontal className="h-5 w-5" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-10">
                <button
                  onClick={openReportModal}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  <Flag className="h-4 w-4" /> Report Post
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {(() => {
          // For image posts, content may be JSON with caption + base64 imageData
          if (post.post_type === 'image') {
            let caption = '';
            let imageData = '';
            try {
              const parsed = JSON.parse(post.content);
              caption = parsed.caption || '';
              imageData = parsed.imageData || '';
            } catch {
              // Not JSON — old-style text content
              caption = post.content || '';
            }
            return (
              <>
                {caption && (
                  <div className="prose prose-sm max-w-none text-slate-800 mb-3 whitespace-pre-wrap">{caption}</div>
                )}
                {imageData ? (
                  <img src={imageData} alt="Post image" className="w-full rounded-lg mb-4 max-h-96 object-contain bg-slate-50 border border-slate-100" />
                ) : (
                  <div className="w-full h-48 bg-slate-100 rounded-lg mb-4 flex items-center justify-center text-slate-400 border border-slate-200 text-sm">
                    [Image not available]
                  </div>
                )}
              </>
            );
          }
          if (post.content) {
            return <div className="prose prose-sm max-w-none text-slate-800 mb-4 whitespace-pre-wrap">{post.content}</div>;
          }
          return null;
        })()}

        {/* Original Post Embed (For Reposts) */}
        {post.original_post_id && post.original_post && (() => {
          const op = post.original_post;
          const authorInitial = (op.author_name || op.username || 'U')[0].toUpperCase();
          const authorName = op.author_name || op.username || 'Unknown';

          // Parse content: could be image JSON or plain text
          let opCaption = '';
          let opImageData = '';
          if (op.post_type === 'image') {
            try {
              const parsed = JSON.parse(op.content);
              opCaption = parsed.caption || '';
              opImageData = parsed.imageData || '';
            } catch {
              opCaption = op.content || '';
            }
          } else {
            opCaption = op.content || '';
          }

          return (
            <div className="border border-slate-200 rounded-xl p-4 mb-4 bg-slate-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
                  {authorInitial}
                </div>
                <Link to={`/user/${authorName}`} className="font-semibold text-slate-900 text-sm hover:underline">{authorName}</Link>
                <div className="text-xs text-slate-500">
                  {(() => { const d = safeDate(op.created_at); return d ? formatDistanceToNow(d, { addSuffix: true }) : 'Recently'; })()}
                </div>
              </div>
              {opCaption && (
                <div className="text-sm text-slate-800 whitespace-pre-wrap mb-2">{opCaption}</div>
              )}
              {opImageData && (
                <img src={opImageData} alt="Original post image" className="w-full rounded-lg max-h-60 object-contain bg-white border border-slate-100" />
              )}
              {op.post_type === 'poll' && (
                <div className="text-xs text-slate-500 italic mt-1">[Poll — open original post to vote]</div>
              )}
            </div>
          );
        })()}

        {/* Media placeholder if post_type is image/video but NOT handled above */}
        {post.post_type === 'video' && (
           <div className="w-full h-64 bg-slate-100 rounded-lg mb-4 flex items-center justify-center text-slate-400 border border-slate-200">
              [Attached video Media]
           </div>
        )}

        {/* Poll UI */}
        {post.post_type === 'poll' && localPoll && (
          <div className="border border-slate-200 rounded-lg p-4 mb-4 bg-white">
            <div className="font-semibold text-slate-900 mb-3">{localPoll.question}</div>
            <div className="space-y-2">
              {localPoll.options.map(opt => {
                const totalVotes = localPoll.options.reduce((sum, o) => sum + o.votes, 0);
                const percent = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
                const isVoted = localPoll.user_voted_option_id === opt.id;
                return (
                  <button 
                    key={opt.id}
                    onClick={() => handleVote(opt.id)}
                    className={`relative w-full text-left p-3 rounded-lg border flex justify-between items-center overflow-hidden z-0 transition-colors cursor-pointer hover:bg-slate-50 ${
                      isVoted ? 'border-primary ring-1 ring-primary/20' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {localPoll.user_voted_option_id && (
                      <div className="absolute inset-y-0 left-0 bg-primary/10 -z-10 transition-all duration-500" style={{ width: `${percent}%` }}></div>
                    )}
                    <span className={`font-medium text-sm z-10 flex-1 ${isVoted ? 'text-primary' : 'text-slate-700'}`}>{opt.option_text}</span>
                    {localPoll.user_voted_option_id && (
                      <span className="text-xs font-semibold text-slate-500 z-10 w-12 text-right">{percent}%</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-slate-500 mt-3 font-medium">
              {localPoll.options.reduce((sum, o) => sum + o.votes, 0)} total votes
            </div>
          </div>
        )}

        {/* Action Bar — Like | Comment | Repost | Share | Bookmark */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-slate-500">
          <div className="flex space-x-5">
            <button 
              onClick={handleLike} 
              className={`flex items-center space-x-1.5 transition-colors ${liked ? 'text-rose-500' : 'hover:text-rose-500'}`}
              title="Like"
            >
              <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
              <span className="text-sm font-medium">{likeCount}</span>
            </button>
            
            <button 
              onClick={handleDislike} 
              className={`flex items-center space-x-1.5 transition-colors ${disliked ? 'text-indigo-500' : 'hover:text-indigo-500'}`}
              title="Dislike"
            >
              <ThumbsDown className={`h-5 w-5 ${disliked ? 'fill-current' : ''}`} />
              <span className="text-sm font-medium">{dislikeCount}</span>
            </button>

            <button 
              onClick={() => setShowComments(!showComments)} 
              className="flex items-center space-x-1.5 hover:text-primary transition-colors"
              title="Comment"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-sm font-medium">{post.comment_count || post.stats?.comments || 0}</span>
            </button>

            <button 
              onClick={handleRepost}
              disabled={reposting || !!post.original_post_id}
              className="flex items-center space-x-1.5 hover:text-blue-500 transition-colors disabled:opacity-40"
              title="Repost"
            >
              <Repeat className="h-5 w-5" />
              <span className="text-sm font-medium hidden sm:inline">Repost</span>
            </button>

            <button 
              onClick={handleShare}
              className={`flex items-center space-x-1.5 transition-colors ${shareCopied ? 'text-emerald-600' : 'hover:text-emerald-500'}`}
              title="Share / Copy Link"
            >
              <Share2 className="h-5 w-5" />
              <span className="text-sm font-medium hidden sm:inline">{shareCopied ? 'Copied!' : 'Share'}</span>
            </button>
          </div>
          
          <button 
            onClick={handleBookmark} 
            className={`flex items-center transition-colors ${bookmarked ? 'text-primary' : 'hover:text-primary'}`}
            title="Bookmark"
          >
            <Bookmark className={`h-5 w-5 ${bookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Embedded Comments Section */}
        {showComments && <CommentSection postId={post.id} user={user} />}
      </div>

      {/* ── Report Modal ── */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowReportModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" /> Report Post
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Help us understand what's wrong with this post.</p>
              </div>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {reportDone ? (
              /* Success State */
              <div className="px-6 py-8 text-center">
                <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Report Submitted</h3>
                <p className="text-sm text-slate-500 mb-5">Thank you for helping keep VibeCast safe. Our moderators will review this post.</p>
                <button onClick={() => setShowReportModal(false)} className="btn w-full">Done</button>
              </div>
            ) : (
              /* Reason Selection */
              <div className="px-6 py-5 space-y-3">
                <p className="text-sm font-medium text-slate-700 mb-2">Select a reason:</p>
                {REPORT_REASONS.map(r => (
                  <label
                    key={r.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedReason === r.value 
                        ? 'border-red-400 bg-red-50' 
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report_reason"
                      value={r.value}
                      checked={selectedReason === r.value}
                      onChange={() => setSelectedReason(r.value)}
                      className="mt-0.5 accent-red-500"
                    />
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{r.label}</div>
                      <div className="text-xs text-slate-500">{r.desc}</div>
                    </div>
                  </label>
                ))}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitReport}
                    disabled={!selectedReason || reporting}
                    className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    {reporting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}