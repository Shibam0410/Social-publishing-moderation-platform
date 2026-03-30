import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPost } from '../services/api';
import PostCard from '../components/PostCard';
import { ArrowLeft } from 'lucide-react';

export default function PostDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getPost(id);
        setPost(data.post);
      } catch (err) {
        setError(err.message || 'Post not found or no longer available.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {loading && (
        <div className="text-center py-16 text-slate-400">Loading post…</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 text-center">
          <p className="font-semibold mb-1">Post Unavailable</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {post && !loading && (
        <PostCard post={post} user={user} />
      )}
    </div>
  );
}
