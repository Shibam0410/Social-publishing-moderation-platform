import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCommunities, joinCommunity, leaveCommunity, getCommunityRequests, approveCommunityRequest, rejectCommunityRequest } from '../services/api';
import { Users, Shield, Plus, X, Lock } from 'lucide-react';

export default function Communities({ user }) {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create community modal state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', is_private: false });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit community modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: '', name: '', description: '' });
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState('');

  // Requests modal state
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [activeCommunity, setActiveCommunity] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    try {
      const data = await getCommunities();
      setCommunities(data.communities || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLeave = async (comm) => {
    try {
      if (comm.user_is_member) {
        await leaveCommunity(comm.id);
      } else if (!comm.user_request_pending) {
        await joinCommunity(comm.id);
      }
      loadCommunities();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!form.name.trim()) return setCreateError('Community name is required.');
    setCreating(true);
    try {
      // @ts-ignore
      await import('../services/api').then(m => m.createCommunity(form.name.trim(), form.description.trim(), form.is_private));
      setForm({ name: '', description: '', is_private: false });
      setShowModal(false);
      loadCommunities(); // refresh list
    } catch (err) {
      setCreateError(err.message || 'Failed to create community.');
    } finally {
      setCreating(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    if (!editForm.name.trim()) return setEditError('Community name is required.');
    setEditing(true);
    try {
      // @ts-ignore
      await import('../services/api').then(m => m.editCommunity(editForm.id, editForm.name.trim(), editForm.description.trim()));
      setShowEditModal(false);
      loadCommunities();
    } catch (err) {
      setEditError(err.message || 'Failed to edit community.');
    } finally {
      setEditing(false);
    }
  };
  
  const openEditModal = (comm) => {
    setEditForm({ id: comm.id, name: comm.name, description: comm.description || '' });
    setEditError('');
    setShowEditModal(true);
  };

  const openRequestsModal = async (comm) => {
    setActiveCommunity(comm);
    setShowRequestsModal(true);
    setLoadingRequests(true);
    try {
      const data = await getCommunityRequests(comm.id);
      setRequests(data.requests || []);
    } catch (err) {
      alert('Failed to load requests');
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      await approveCommunityRequest(activeCommunity.id, userId);
      setRequests(prev => prev.filter(r => r.id !== userId));
    } catch (err) { alert(err.message); }
  };

  const handleReject = async (userId) => {
    try {
      await rejectCommunityRequest(activeCommunity.id, userId);
      setRequests(prev => prev.filter(r => r.id !== userId));
    } catch (err) { alert(err.message); }
  };

  if (loading) return <div className="p-8 text-center">Loading communities...</div>;

  return (
    <div className="max-w-5xl mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Communities</h1>
          <p className="text-sm text-slate-500 mt-1">Discover and join topic-based groups</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setCreateError(''); }}
          className="btn flex items-center bg-primary text-white hover:bg-blue-600 shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" /> Create Community
        </button>
      </div>

      {/* ── Create Community Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Create a Community</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Community Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. React Developers"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description <span className="text-slate-400 text-xs">(optional)</span>
                </label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="What is this community about?"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_private"
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mr-2"
                  checked={form.is_private}
                  onChange={e => setForm({ ...form, is_private: e.target.checked })}
                />
                <label htmlFor="is_private" className="text-sm text-slate-700 font-medium">
                  Make Community Private
                </label>
              </div>
              <p className="text-xs text-slate-500 mt-0 pt-0 ml-6">
                Only approved members can view posts in private communities.
              </p>

              {createError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {createError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-blue-600 transition disabled:opacity-60"
                >
                  {creating ? 'Creating...' : 'Create Community'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Community Modal ── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Edit Community</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Community Name <span className="text-red-500">*</span></label>
                <input type="text" className="input" value={editForm.name} onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea className="input resize-none" rows={3} value={editForm.description} onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))} />
              </div>
              {editError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{editError}</div>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition">Cancel</button>
                <button type="submit" disabled={editing} className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-blue-600 transition disabled:opacity-60">{editing ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Community Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {communities.map(comm => (
          <div key={comm.id} className="card bg-white flex flex-col">
              <div className="flex flex-col flex-1">
                <div className="flex items-start justify-between">
                  <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold mb-4 text-lg">
                    {comm.name?.[0]?.toUpperCase() || 'C'}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {comm.is_private && (
                       <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                         <Lock className="h-3 w-3 mr-1" /> Private
                       </span>
                    )}
                    {comm.moderation_policy === 'STRICT' && (
                       <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                         <Shield className="h-3 w-3 mr-1" /> Strict
                       </span>
                    )}
                  </div>
                </div>
              <Link to={`/community/${comm.id}`} className="block mt-2 hover:opacity-80 transition-opacity">
                <h3 className="text-lg font-bold text-slate-900 mb-1 hover:underline">{comm.name}</h3>
                <p className="text-sm text-slate-600 line-clamp-2 mb-4 h-10">
                  {comm.description || 'A vibrant community for discussion.'}
                </p>
              </Link>
              
              <div className="flex items-center text-sm text-slate-500 mb-6">
                <Users className="h-4 w-4 mr-1.5" />
                <span>{comm.member_count || 1} members</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => handleJoinLeave(comm)}
                disabled={comm.user_request_pending}
                className={`flex-1 py-2 rounded-md font-medium text-sm transition-colors ${
                  comm.user_is_member 
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200' 
                    : comm.user_request_pending
                    ? 'bg-amber-100 text-amber-700 border border-amber-200 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-blue-600 shadow-sm'
                }`}
              >
                {comm.user_is_member ? 'Leave' : comm.user_request_pending ? 'Requested' : comm.is_private ? 'Request to Join' : 'Join'}
              </button>

              {(user?.role === 'admin' || comm.user_role === 'moderator') && (
                <>
                  {comm.is_private && (
                    <button 
                      onClick={() => openRequestsModal(comm)}
                      className="px-3 py-2 rounded-md font-medium text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
                      title="Manage Requests"
                    >
                      Requests
                    </button>
                  )}
                  <button 
                    onClick={() => openEditModal(comm)}
                    className="px-3 py-2 rounded-md font-medium text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
                    title="Edit Community"
                  >
                    Edit
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {communities.length === 0 && (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-xl">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No Communities Yet</h3>
          <p className="text-slate-500 mt-1">Be the first to create one!</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 btn inline-flex items-center bg-primary text-white hover:bg-blue-600"
          >
            <Plus className="h-4 w-4 mr-2" /> Create Community
          </button>
        </div>
      )}

      {/* ── Manage Requests Modal ── */}
      {showRequestsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Join Requests</h2>
                <p className="text-xs text-slate-500">{activeCommunity?.name}</p>
              </div>
              <button onClick={() => setShowRequestsModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {loadingRequests ? (
                <div className="text-center text-slate-500 py-4">Loading requests...</div>
              ) : requests.length === 0 ? (
                <div className="text-center text-slate-500 py-8">No pending requests.</div>
              ) : (
                <ul className="space-y-4">
                  {requests.map(req => (
                    <li key={req.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{req.username}</p>
                        <p className="text-xs text-slate-500">{req.email}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Requested on {new Date(req.requested_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(req.id)} className="px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors">Approve</button>
                        <button onClick={() => handleReject(req.id)} className="px-3 py-1.5 text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 rounded transition-colors">Reject</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}