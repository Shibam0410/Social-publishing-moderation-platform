import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCommunity, getCommunityMembers, getPosts } from '../services/api';
import PostCard from '../components/PostCard';
import { Users, FileText } from 'lucide-react';

export default function CommunityPage({ user }) {
  const { id } = useParams();
  const [community, setCommunity] = useState(null);
  const [activeTab, setActiveTab] = useState('feeds'); // 'feeds' | 'members'
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [commRes, memRes, postRes] = await Promise.all([
          getCommunity(id),
          getCommunityMembers(id),
          getPosts(1, 50, id)
        ]);
        setCommunity(commRes.community);
        setMembers(memRes.members || []);
        setPosts(postRes.posts || []);
      } catch (err) {
        setError(err.message || 'Error fetching community data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-t-2 border-primary rounded-full"></div></div>;
  if (error) return <div className="p-8 text-center text-red-500 font-medium">{error}</div>;
  if (!community) return <div className="p-8 text-center text-slate-500">Community not found.</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 py-8">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">c/{community.name}</h1>
        <p className="text-slate-600 mb-4">{community.description || 'No description provided.'}</p>
        <div className="flex gap-4 text-sm font-medium text-slate-500">
          <span className="flex items-center gap-1"><Users className="h-4 w-4"/> {community.member_count} Members</span>
          {community.is_private && <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs ml-auto">Private</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('feeds')}
          className={`pb-3 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'feeds' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <FileText className="h-4 w-4" /> Feeds
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'members' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Users className="h-4 w-4" /> Members
        </button>
      </div>

      {/* Content */}
      <div className="animate-fade-in-up">
        {activeTab === 'feeds' && (
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500">
                No posts in this community yet.
              </div>
            ) : (
              posts.map(post => <PostCard key={post.id} post={post} user={user} />)
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-100">
            {members.length === 0 ? (
              <div className="p-6 text-center text-slate-500">No members found.</div>
            ) : (
              members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gradient-to-tr from-blue-100 to-primary/20 rounded-full flex items-center justify-center font-bold text-primary">
                      {member.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{member.username}</div>
                      <div className="text-xs text-slate-500">Joined {new Date(member.joined_at.replace(' ', 'T') + 'Z').toLocaleDateString()}</div>
                    </div>
                  </div>
                  {member.role === 'moderator' && (
                    <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded-full">
                      Moderator
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
