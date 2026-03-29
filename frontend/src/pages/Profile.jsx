import { useState, useEffect } from 'react';
import { getPosts, getBookmarks, updateProfile, getFollowers, getFollowing, getUserProfile, setupMFA, verifyMFA } from '../services/api';
import PostCard from '../components/PostCard';
import { User, Settings, Grid, Bookmark as BookmarkIcon, MessageSquare, Mail, Users, Image, BarChart3, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Profile({ user, onUpdateUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('posts');
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fullProfile, setFullProfile] = useState(null);

  useEffect(() => {
    getUserProfile(user.username).then(data => setFullProfile(data.profile)).catch(console.error);
  }, [user.username]);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: user.username || '',
    first_name: user.first_name || '',
    last_name: user.last_name || '',
  });
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  // MFA Setup State
  const [mfaQrUrl, setMfaQrUrl] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState('');

  useEffect(() => {
    loadContent(activeTab);
  }, [activeTab]);

  const loadContent = async (tab) => {
    setLoading(true);
    try {
      if (tab === 'posts') {
        const data = await getPosts(1, 20);
        setContent(data.posts?.filter(p => p.author_name === user.username) || []);
      } else if (tab === 'bookmarks') {
        const data = await getBookmarks();
        setContent(data.bookmarks || []);
      } else if (tab === 'media') {
        const data = await getPosts(1, 40);
        setContent(data.posts?.filter(p => p.author_name === user.username && ['image', 'video'].includes(p.post_type)) || []);
      } else if (tab === 'followers') {
        const data = await getFollowers(user.id);
        setContent(data.followers || []);
      } else if (tab === 'following') {
        const data = await getFollowing(user.id);
        setContent(data.following || []);
      } else {
        setContent([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveError('');
    setSaving(true);
    try {
      const resp = await updateProfile(editForm.username, editForm.first_name, editForm.last_name);
      onUpdateUser(resp.user, resp.token);
      setIsEditing(false);
    } catch (err) {
      setSaveError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSetupMFA = async () => {
    setMfaError('');
    try {
      const data = await setupMFA();
      setMfaQrUrl(data.qrCodeUrl);
      setMfaSecret(data.secret);
    } catch (err) {
      setMfaError(err.message || 'Failed to setup MFA');
    }
  };

  const handleVerifyMFA = async () => {
    setMfaError('');
    setMfaSuccess('');
    try {
      await verifyMFA(mfaCode);
      setMfaSuccess('MFA Enabled Successfully!');
      setMfaQrUrl('');
      // Update local user state
      onUpdateUser({ ...user, mfa_enabled: 1 }, null);
    } catch (err) {
      setMfaError(err.message || 'Invalid code');
    }
  };

  const tabs = [
    { id: 'posts', label: 'Posts', icon: Grid },
    { id: 'media', label: 'Media', icon: Image },
    { id: 'bookmarks', label: 'Bookmarks', icon: BookmarkIcon },
    { id: 'followers', label: 'Followers', icon: Users },
    { id: 'following', label: 'Following', icon: User },
  ];

  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;

  return (
    <div className="max-w-4xl mx-auto py-6">
      
      {/* Profile Header Block */}
      <div className="card bg-white mb-6 p-0 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
        <div className="px-6 pb-6 relative">
          <div className="flex justify-between items-end">
            <div className="-mt-12 h-24 w-24 rounded-full border-4 border-white bg-white flex items-center justify-center overflow-hidden shadow-sm">
              <div className="h-full w-full bg-slate-200 flex items-center justify-center text-slate-500">
                <User className="h-12 w-12" />
              </div>
            </div>
            <div className="flex space-x-3">
              {['creator', 'admin', 'analyst', 'moderator'].includes(user.role) && (
                <Link to="/creator/analytics" className="btn bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 flex items-center shadow-sm">
                  <BarChart3 className="h-4 w-4 mr-2" /> Analytics
                </Link>
              )}
              <button 
                onClick={() => { setIsEditing(!isEditing); setSaveError(''); }}
                className={`btn flex items-center ${isEditing ? 'bg-slate-100 text-slate-600 border border-slate-300' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'}`}
              >
                <Settings className="h-4 w-4 mr-2" /> {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
          </div>
          
          <div className="mt-4">
            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-3 max-w-sm mt-2 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Username <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="input py-1 text-sm bg-white"
                    value={editForm.username}
                    onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">First Name</label>
                  <input
                    type="text"
                    className="input py-1 text-sm bg-white"
                    value={editForm.first_name}
                    placeholder="Optional"
                    onChange={e => setEditForm({ ...editForm, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Last Name</label>
                  <input
                    type="text"
                    className="input py-1 text-sm bg-white"
                    value={editForm.last_name}
                    placeholder="Optional"
                    onChange={e => setEditForm({ ...editForm, last_name: e.target.value })}
                  />
                </div>

                {/* Email — read-only for non-admins */}
                <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 flex items-start space-x-2">
                  <Mail className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800">Email: {user.email}</p>
                    <p className="text-xs text-amber-700 mt-0.5">To change your email, please contact an Admin.</p>
                  </div>
                </div>

                {/* MFA Section */}
                <div className={`border rounded-md px-3 py-3 ${user.mfa_enabled ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center space-x-2 mb-2">
                    {user.mfa_enabled ? (
                      <ShieldCheck className="h-5 w-5 text-green-600" />
                    ) : (
                      <ShieldAlert className="h-5 w-5 text-slate-500" />
                    )}
                    <h3 className="text-sm font-semibold text-slate-800">Two-Factor Authentication</h3>
                  </div>
                  
                  {user.mfa_enabled ? (
                    <p className="text-xs text-green-700">MFA is currently active for your account.</p>
                  ) : (
                    <div>
                      {!mfaQrUrl ? (
                        <>
                          <p className="text-xs text-slate-600 mb-2">Enhance your security by enabling MFA via an authenticator app.</p>
                          <button type="button" onClick={handleSetupMFA} className="btn py-1 text-xs bg-white text-slate-700 hover:bg-slate-100">Setup MFA</button>
                        </>
                      ) : (
                        <div className="space-y-3 bg-white p-3 rounded border border-slate-200">
                          <p className="text-xs text-slate-600">Scan this QR code with your authenticator app (e.g., Google Authenticator, Authy).</p>
                          <img src={mfaQrUrl} alt="MFA QR Code" className="mx-auto border border-slate-100 p-1 rounded-sm" />
                          <p className="text-[10px] text-center text-slate-500 break-all font-mono">Manual key: {mfaSecret}</p>
                          
                          <div>
                            <input 
                              type="text" 
                              maxLength={6} 
                              placeholder="Enter 6-digit code" 
                              className="input py-1 text-sm text-center tracking-widest font-mono"
                              value={mfaCode}
                              onChange={e => setMfaCode(e.target.value)}
                            />
                            <button type="button" onClick={handleVerifyMFA} className="btn w-full mt-2 py-1 text-sm bg-primary text-white">Verify Code</button>
                          </div>
                        </div>
                      )}
                      {mfaError && <p className="text-xs text-red-500 mt-2">{mfaError}</p>}
                      {mfaSuccess && <p className="text-xs text-green-600 mt-2">{mfaSuccess}</p>}
                    </div>
                  )}
                </div>

                {saveError && <div className="text-red-500 text-xs font-medium">{saveError}</div>}
                <button
                  type="submit"
                  disabled={saving}
                  className="btn bg-primary hover:bg-blue-600 text-white py-2 text-sm w-full mt-2 font-semibold shadow-sm transition-colors disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-slate-900">{displayName}</h1>
                <p className="text-slate-500 text-sm">@{user.username}</p>
                <p className="text-slate-500 text-sm">{user.email}</p>
                <div className="mt-4 flex space-x-6 text-sm">
                  <div><span className="font-bold text-slate-900">{fullProfile?.following || 0}</span> <span className="text-slate-500">Following</span></div>
                  <div><span className="font-bold text-slate-900">{fullProfile?.followers || 0}</span> <span className="text-slate-500">Followers</span></div>
                  <div className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                    Role: {user.role?.replace(/_/g, ' ')}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  isActive ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className={`h-4 w-4 mr-2 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div>
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading {activeTab}...</div>
        ) : content.length > 0 ? (
          <div className="space-y-4">
            {['followers', 'following'].includes(activeTab) ? (
              content.map(u => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gradient-to-tr from-blue-100 to-indigo-100 rounded-full flex items-center justify-center text-primary font-bold">
                       {u.username?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <Link to={`/user/${u.username}`} className="font-semibold text-slate-900 hover:underline">{[u.first_name, u.last_name].filter(Boolean).join(' ') || u.username}</Link>
                      <div className="text-xs text-slate-500">@{u.username}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              content.map(post => (
                <PostCard key={post.id} post={post} user={user} />
              ))
            )}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
            <Grid className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-slate-900">No {activeTab} yet</h3>
            <p className="mt-1 text-sm text-slate-500">When you post or interact, it will show up here.</p>
          </div>
        )}
      </div>
    </div>
  );
}