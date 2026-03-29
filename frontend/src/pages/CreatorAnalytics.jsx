import { useState, useEffect } from 'react';
import { getPosts, getPostMetrics } from '../services/api';
import { BarChart3, TrendingUp, Heart, MessageCircle, Bookmark, Star, Eye } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Rectangle } from 'recharts';

export default function CreatorAnalytics({ user }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPosts(1, 20)
      .then(data => {
        // Filter to only the logged-in creator's posts
        const mine = (data.posts || []).filter(
          p => p.user_id === user?.id || p.author_name === user?.username
        );
        setPosts(mine);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const totalLikes     = posts.reduce((s, p) => s + (p.stats?.likes || 0), 0);
  const totalComments  = posts.reduce((s, p) => s + (p.stats?.comments || 0), 0);
  const totalPosts     = posts.length;
  const avgEngagement  = totalPosts > 0 ? ((totalLikes + totalComments) / totalPosts).toFixed(1) : '0';

  // Engagement bar chart data — top 5 posts
  const topPostsData = [...posts]
    .sort((a, b) => ((b.stats?.likes || 0) + (b.stats?.comments || 0)) - ((a.stats?.likes || 0) + (a.stats?.comments || 0)))
    .slice(0, 5)
    .map((p, i) => ({
      name: `Post ${i + 1}`,
      label: p.content?.slice(0, 30) + (p.content?.length > 30 ? '…' : ''),
      likes: p.stats?.likes || 0,
      comments: p.stats?.comments || 0,
      total: (p.stats?.likes || 0) + (p.stats?.comments || 0),
    }));

  // Simulated follower growth trend (7 days)
  const followerData = Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    followers: Math.max(1, Math.floor(Math.random() * 8) + i * 2),
  }));

  // Time-of-day heatmap
  const timeOfDayData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i < 10 ? '0'+i : i}:00`,
    interactions: 0
  }));

  posts.forEach(p => {
    if (!p.created_at) return;
    const date = new Date(p.created_at.replace(' ', 'T') + 'Z');
    const h = date.getHours();
    timeOfDayData[h].interactions += (p.stats?.likes || 0) + (p.stats?.comments || 0) + 1;
  });

  const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  if (loading) return <div className="p-8 text-center text-slate-500">Loading your analytics...</div>;

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-amber-500" />
          Creator Analytics
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Track your content performance and audience engagement — only visible to you.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Posts',       value: totalPosts,     icon: Star,           color: 'border-amber-400',    bg: 'bg-amber-50',   text: 'text-amber-600' },
          { label: 'Total Likes',        value: totalLikes,     icon: Heart,          color: 'border-rose-400',     bg: 'bg-rose-50',    text: 'text-rose-600' },
          { label: 'Total Comments',     value: totalComments,  icon: MessageCircle,  color: 'border-blue-400',     bg: 'bg-blue-50',    text: 'text-blue-600' },
          { label: 'Avg Engagement',     value: avgEngagement,  icon: TrendingUp,     color: 'border-emerald-400',  bg: 'bg-emerald-50', text: 'text-emerald-600' },
        ].map(({ label, value, icon: Icon, color, bg, text }) => (
          <div key={label} className={`card bg-white p-5 border-l-4 ${color}`}>
            <div className={`inline-flex items-center px-2 py-1 rounded-lg ${bg} ${text} text-xs font-semibold mb-2`}>
              <Icon className="h-3.5 w-3.5 mr-1" />{label}
            </div>
            <div className="text-3xl font-bold text-slate-900">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Performing Posts */}
        <div className="card bg-white p-6">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" /> Top Performing Posts
          </h3>
          {topPostsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topPostsData} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={6} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  formatter={(val, name) => [val, name === 'likes' ? '❤️ Likes' : '💬 Comments']}
                />
                <Bar dataKey="likes" stackId="a" fill="#6366f1" radius={[0,0,0,0]} />
                <Bar dataKey="comments" stackId="a" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm italic">
              Post some content to see your analytics here.
            </div>
          )}
        </div>

        {/* Follower Growth */}
        <div className="card bg-white p-6">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" /> Follower Growth (7d)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={followerData} margin={{ top: 10, right: 0, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="gradFollowers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={6} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
              <Area type="monotone" dataKey="followers" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#gradFollowers)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Time-of-day heatmap */}
        <div className="card bg-white p-6 md:col-span-2">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Eye className="h-4 w-4 text-blue-500" /> Time-of-Day Engagement Heatmap
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={timeOfDayData} margin={{ top: 10, right: 0, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={6} interval={(index) => index % 3 === 0} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} formatter={(val) => [val, 'Interactions']} />
              <Bar dataKey="interactions" fill="#818cf8" radius={[4, 4, 0, 0]} activeBar={<Rectangle fill="#6366f1" stroke="none" />} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Post List with per-post metrics */}
      <div className="card bg-white">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Eye className="h-4 w-4 text-slate-400" />
          <h3 className="font-bold text-slate-900">Your Posts</h3>
          <span className="text-xs text-slate-400 ml-1">({posts.length} total)</span>
        </div>
        {posts.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-400 italic text-sm">
            You haven't published any posts yet. Start creating!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {posts.map((p, i) => (
              <div key={p.id} className="px-6 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{p.content?.slice(0, 80) || '—'}</div>
                  {p.community_name && (
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                      c/{p.community_name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm shrink-0">
                  <span className="flex items-center gap-1 text-rose-500 font-semibold">
                    <Heart className="h-4 w-4" /> {p.stats?.likes || 0}
                  </span>
                  <span className="flex items-center gap-1 text-blue-500 font-semibold">
                    <MessageCircle className="h-4 w-4" /> {p.stats?.comments || 0}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                    {p.status || 'PUBLISHED'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
