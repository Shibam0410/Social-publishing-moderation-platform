import { useState, useEffect } from 'react';
import { getPosts } from '../services/api';
import PostCard from '../components/PostCard';
import ErrorBoundary from '../components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

export default function HomeFeed({ user }) {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMoresPosts(1);
  }, []);

  const loadMoresPosts = async (pageToFetch) => {
    try {
      setLoading(true);
      const data = await getPosts(pageToFetch, 10, '', '');
      const fetchedPosts = data.posts || [];
      
      if (pageToFetch === 1) {
        setPosts(fetchedPosts);
      } else {
        setPosts(prev => [...prev, ...fetchedPosts]);
      }
      
      setHasMore(fetchedPosts.length === 10);
      setPage(pageToFetch);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="mb-6 border-b border-slate-200">
        <h2 className="pb-3 font-semibold text-xl text-slate-900 border-b-2 border-primary inline-block">
          Global Feed
        </h2>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 shadow-sm border border-red-100">
          Failed to load feed: {error}
        </div>
      )}

      <div className="space-y-4">
        {posts.map(post => (
          <ErrorBoundary key={post.id}>
            <PostCard post={post} user={user} />
          </ErrorBoundary>
        ))}
        
        {posts.length === 0 && !loading && !error && (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <h3 className="text-lg font-medium text-slate-900 mb-2">No posts yet</h3>
            <p className="text-slate-500">Follow communities or creators to see their posts here.</p>
          </div>
        )}
      </div>

      {hasMore && (
        <div className="mt-8 text-center">
          <button 
            onClick={() => loadMoresPosts(page + 1)}
            disabled={loading}
            className="btn bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-slate-900 inline-flex items-center"
          >
            {loading ? <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Loading...</> : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}