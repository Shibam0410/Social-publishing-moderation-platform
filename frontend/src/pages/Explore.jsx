import { useState, useEffect } from 'react';
import { searchPosts, followUser, unfollowUser, searchUsers } from '../services/api';
import PostCard from '../components/PostCard';
import { Search, TrendingUp, Users, Filter, UserPlus, UserMinus } from 'lucide-react';

export default function Explore({ user }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [userResults, setUserResults] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', minEngagement: 0, language: 'all' });

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const [postData, userData] = await Promise.all([
        searchPosts({ 
          q: query, 
          minEngagement: filters.minEngagement,
          language: filters.language,
          startDate: filters.startDate ? new Date(filters.startDate).toISOString() : '',
          endDate: filters.endDate ? new Date(filters.endDate).toISOString() : ''
        }),
        searchUsers(query)
      ]);
      setResults(postData.posts || []);
      setUserResults(userData.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async (uId, isFollowing) => {
    try {
      if (isFollowing) {
        await unfollowUser(uId);
        setUserResults(prev => prev.map(p => p.id === uId ? { ...p, isFollowing: false, followers: p.followers - 1 } : p));
      } else {
        await followUser(uId);
        setUserResults(prev => prev.map(p => p.id === uId ? { ...p, isFollowing: true, followers: p.followers + 1 } : p));
      }
    } catch (err) { alert(err.message || 'Failed to toggle follow'); }
  };

  const [trendingTopics, setTrendingTopics] = useState([]);
  const [trendingCommunities, setTrendingCommunities] = useState([]);

  useEffect(() => {
    // Fetch stats to get real trending topics and communities
    import('../services/api').then(m => m.getPlatformSummary()).then(data => {
      setTrendingTopics(data.summary?.trending_topics || []);
      setTrendingCommunities(data.summary?.trending_communities || []);
    }).catch(console.error);
  }, []);

  return (
    <div className="max-w-7xl mx-auto py-6 flex flex-col md:flex-row gap-6">
      
      {/* Main Content */}
      <div className="flex-1">
        <div className="mb-8">
          <form onSubmit={handleSearch} className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-lg"
              placeholder="Search posts, topics, or people..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="absolute inset-y-1.5 right-1.5 btn py-1 px-4 text-sm rounded-lg">
              Search
            </button>
          </form>
          
          <button onClick={() => setShowFilters(!showFilters)} className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 mt-3 transition-colors">
            <Filter className="h-4 w-4" /> {showFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
          </button>

          {showFilters && (
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
                <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="w-full input bg-white py-1.5 px-3 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">End Date</label>
                <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="w-full input bg-white py-1.5 px-3 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Language</label>
                <select value={filters.language} onChange={e => setFilters({...filters, language: e.target.value})} className="w-full input bg-white py-1.5 px-3 text-sm">
                  <option value="all">Any Language</option>
                  <option value="en">English (en)</option>
                  <option value="es">Spanish (es)</option>
                  <option value="fr">French (fr)</option>
                  <option value="de">German (de)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Min. Engagement</label>
                <input type="number" min="0" value={filters.minEngagement} onChange={e => setFilters({...filters, minEngagement: e.target.value})} placeholder="Likes + Comments" className="w-full input bg-white py-1.5 px-3 text-sm" />
              </div>
            </div>
          )}
        </div>

        {searched ? (
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">Search Results <span className="text-slate-400 font-normal text-base">"{query}"</span></h2>
            
            {/* Tabs */}
            <div className="flex space-x-6 mb-6 border-b border-slate-200">
              <button 
                className={`pb-3 font-semibold text-sm transition-colors ${activeTab === 'posts' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-800'}`}
                onClick={() => setActiveTab('posts')}
              >
                Posts ({results.length})
              </button>
              <button 
                className={`pb-3 font-semibold text-sm transition-colors ${activeTab === 'users' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-800'}`}
                onClick={() => setActiveTab('users')}
              >
                People ({userResults.length})
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-t-2 border-primary rounded-full"></div></div>
            ) : activeTab === 'posts' ? (
              results.length > 0 ? (
                <div className="space-y-4">
                  {results.map(post => <PostCard key={post.id} post={post} user={user} />)}
                </div>
              ) : (
                <div className="bg-white p-12 rounded-2xl text-center border border-slate-200 shadow-sm">
                  <p className="text-slate-500 text-lg">No posts found containing '{query}'.</p>
                </div>
              )
            ) : (
              userResults.length > 0 ? (
                <div className="space-y-3">
                  {userResults.map(u => (
                    <div key={u.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm hover:shadow transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg text-primary bg-indigo-50 border border-indigo-100">
                           {u.username?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="text-base font-bold text-slate-900 leading-tight">
                            {[u.first_name, u.last_name].filter(Boolean).join(' ') || u.username}
                          </div>
                          <div className="text-sm text-slate-500 mb-1">@{u.username}</div>
                          <div className="flex space-x-4 text-xs font-medium text-slate-500 mt-1">
                            <span><strong className="text-slate-800">{u.followers || 0}</strong> Followers</span>
                            <span><strong className="text-slate-800">{u.following || 0}</strong> Following</span>
                          </div>
                        </div>
                      </div>
                      
                      {user?.id !== u.id && (
                        <button 
                          onClick={() => handleToggleFollow(u.id, u.isFollowing)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold text-sm transition-all border ${u.isFollowing ? 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200' : 'bg-primary text-white hover:bg-blue-600 border-transparent shadow-sm hover:shadow'}`}
                        >
                          {u.isFollowing ? <><UserMinus className="w-4 h-4"/> Unfollow</> : <><UserPlus className="w-4 h-4"/> Follow</>}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-12 rounded-2xl text-center border border-slate-200 shadow-sm">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-lg">No users found matching '{query}'.</p>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-primary/10 to-indigo-50 rounded-2xl p-8 border border-primary/10">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Discover what's happening</h2>
            <p className="text-slate-600 mb-6">Search for keywords, explore trending topics, or find your friends.</p>
              {trendingTopics.map(t => (
                <button 
                  key={t.hashtag} 
                  onClick={() => { setQuery(t.hashtag); setTimeout(() => handleSearch(), 0) }}
                  className="px-4 py-2 bg-white rounded-full text-sm font-medium text-primary shadow-sm hover:shadow transition-shadow border border-slate-200"
                >
                  {t.hashtag}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Sidebar sidebar */}
      <div className="w-full md:w-80 space-y-6">
        <div className="card bg-white">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-primary" /> Trending Topics
          </h3>
          <ul className="space-y-3">
            {trendingTopics.length > 0 ? trendingTopics.map((t, i) => (
              <li key={t.hashtag} className="flex justify-between items-center cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded transition-colors" onClick={() => { setQuery(t.hashtag); setTimeout(() => handleSearch(), 0) }}>
                <span className="font-medium text-slate-800">{t.hashtag}</span>
                <span className="text-xs text-slate-500">{t.use_count} posts</span>
              </li>
            )) : <li className="text-sm text-slate-400 italic">No trending topics yet</li>}
          </ul>
        </div>
        
        <div className="card bg-white">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2 text-primary" /> Trending Communities
          </h3>
          <ul className="space-y-3">
            {trendingCommunities.length > 0 ? trendingCommunities.map((c) => (
              <li key={c.id} className="flex justify-between items-center hover:bg-slate-50 p-2 -mx-2 rounded transition-colors">
                <span className="font-medium text-slate-800 truncate max-w-[150px]" title={c.name}>{c.name}</span>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{c.member_count} members</span>
              </li>
            )) : <li className="text-sm text-slate-400 italic">No trending communities yet</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}