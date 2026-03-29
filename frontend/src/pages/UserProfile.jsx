import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserProfile, followUser, unfollowUser, getPosts } from '../services/api';
import PostCard from '../components/PostCard';
import { User, Grid, Users } from 'lucide-react';

export default function UserProfile({ currentUser }) {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (currentUser && currentUser.username === username) {
      navigate('/profile');
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const pData = await getUserProfile(username);
        setProfile(pData.profile);
        
        // Fetch globally and filter for this user
        const postData = await getPosts(1, 100);
        setPosts((postData.posts || []).filter(p => p.author_name === username));
      } catch (err) {
        setError(err.message || 'Error loading profile');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [username, currentUser, navigate]);

  const handleToggleFollow = async () => {
    if (!currentUser) return navigate('/login');
    if (!profile) return;
    
    setActionLoading(true);
    try {
      if (profile.isFollowing) {
        await unfollowUser(profile.id);
        setProfile({ ...profile, isFollowing: false, followers: profile.followers - 1 });
      } else {
        await followUser(profile.id);
        setProfile({ ...profile, isFollowing: true, followers: profile.followers + 1 });
      }
    } catch (err) {
      alert(err.message || 'Failed to toggle follow');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-t-2 border-primary rounded-full"></div></div>;
  if (error) return <div className="p-8 text-center text-red-500 font-medium">{error}</div>;
  if (!profile) return <div className="p-8 text-center text-slate-500">User not found.</div>;

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="card bg-white mb-6 p-0 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
        <div className="px-6 pb-6 relative">
          <div className="flex justify-between items-end">
            <div className="-mt-12 h-24 w-24 rounded-full border-4 border-white bg-white flex items-center justify-center overflow-hidden shadow-sm">
              <div className="h-full w-full bg-slate-200 flex items-center justify-center text-slate-500">
                <User className="h-12 w-12" />
              </div>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={handleToggleFollow}
                disabled={actionLoading}
                className={`btn flex items-center ${profile.isFollowing ? 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200' : 'bg-primary text-white hover:bg-blue-600'}`}
              >
                {profile.isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            </div>
          </div>
          
          <div className="mt-4">
            <h1 className="text-2xl font-bold text-slate-900">{[profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username}</h1>
            <p className="text-slate-500 text-sm">@{profile.username}</p>
            <div className="mt-4 flex space-x-6 text-sm">
              <div><span className="font-bold text-slate-900">{profile.following || 0}</span> <span className="text-slate-500">Following</span></div>
              <div><span className="font-bold text-slate-900">{profile.followers || 0}</span> <span className="text-slate-500">Followers</span></div>
              <div className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                Role: {profile.role?.replace(/_/g, ' ')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 mb-6">
         <h2 className="text-lg font-bold text-slate-900 pb-3 inline-block border-b-2 border-primary">Posts</h2>
      </div>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
            <Grid className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="mt-1 text-sm text-slate-500">No posts yet.</p>
          </div>
        ) : (
          posts.map(post => <PostCard key={post.id} post={post} user={currentUser} />)
        )}
      </div>
    </div>
  );
}
