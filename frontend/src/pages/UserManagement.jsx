import { useState, useEffect } from 'react';
import { adminGetUsers, adminUpdateUser, adminInviteUser, adminWarnUser, adminSuspendUser, adminBanUser, adminRestoreUser } from '../services/api';
import { Users, UserPlus, Edit2, Check, X, AlertCircle, Key, UserX, RefreshCw, Mail, Shield, Copy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ROLES = ['user', 'creator', 'moderator', 'senior_moderator', 'admin', 'compliance_officer', 'analyst'];

const ROLE_LABELS = {
  user:               'Normal User',
  creator:            'Verified Creator',
  moderator:          'Community Moderator',
  senior_moderator:   'Senior Moderator',
  admin:              'Admin',
  compliance_officer: 'Compliance Officer',
  analyst:            'Analyst',
};

const STATUS_COLORS = {
  ACTIVE: 'bg-green-100 text-green-800',
  WARNING: 'bg-yellow-100 text-yellow-800',
  TEMP_SUSPENDED: 'bg-orange-100 text-orange-800',
  PERMANENTLY_BANNED: 'bg-red-100 text-red-800',
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Invite modal state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'user' });
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteError, setInviteError] = useState('');

  // Inline edit state
  const [editing, setEditing] = useState({});
  const [editValues, setEditValues] = useState({});
  const [saving, setSaving] = useState({});

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminGetUsers();
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Invite ────────────────────────────────────────────────────────────────
  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    setInviting(true);
    try {
      const resp = await adminInviteUser(inviteForm.email, inviteForm.role);
      setInviteSuccess(resp.message || `Invite sent to ${inviteForm.email}!`);
      setInviteForm({ email: '', role: 'user' });
    } catch (err) {
      setInviteError(err.message || 'Failed to send invite.');
    } finally {
      setInviting(false);
    }
  };

  // ── Inline Edit ───────────────────────────────────────────────────────────
  const startEdit = (u) => {
    setEditing(prev => ({ ...prev, [u.id]: true }));
    setEditValues(prev => ({ ...prev, [u.id]: { email: u.email, role: u.role } }));
  };
  const cancelEdit = (id) => setEditing(prev => ({ ...prev, [id]: false }));

  const saveEdit = async (userId) => {
    const vals = editValues[userId];
    if (!vals) return;
    setSaving(prev => ({ ...prev, [userId]: true }));
    try {
      await adminUpdateUser(userId, { email: vals.email, role: vals.role });
      await loadUsers();
      setEditing(prev => ({ ...prev, [userId]: false }));
    } catch (err) {
      alert(err.message || 'Failed to update user.');
    } finally {
      setSaving(prev => ({ ...prev, [userId]: false }));
    }
  };

  // ── Account Actions ───────────────────────────────────────────────────────
  const handleAction = async (userId, actionName) => {
    const reason = ['warn', 'suspend', 'ban'].includes(actionName)
      ? prompt(`Enter reason for ${actionName}:`)
      : null;
    if (['warn', 'suspend', 'ban'].includes(actionName) && !reason) return;
    try {
      if (actionName === 'warn') await adminWarnUser(userId, reason);
      else if (actionName === 'suspend') await adminSuspendUser(userId, reason);
      else if (actionName === 'ban') await adminBanUser(userId, reason);
      else if (actionName === 'restore') await adminRestoreUser(userId);
      loadUsers();
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center">
            <Users className="h-6 w-6 text-primary mr-2" /> User Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">View all users, manage roles and email addresses, or invite new users.</p>
        </div>
        <div className="flex gap-3 items-center w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search name, email or ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="input text-sm flex-1 sm:w-64"
          />
          <button
            onClick={() => { setShowInvite(true); setInviteError(''); setInviteSuccess(''); }}
            className="btn bg-primary text-white hover:bg-blue-600 flex items-center whitespace-nowrap shadow-sm"
          >
            <UserPlus className="h-4 w-4 mr-2" /> Invite User
          </button>
        </div>
      </div>

      {/* ── Invite Modal ───────────────────────────────────────────────────── */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center">
                  <Mail className="h-5 w-5 text-primary mr-2" /> Invite New User
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">An email invitation will be sent with a 10-minute signup link.</p>
              </div>
              <button onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    className="input pl-9"
                    placeholder="newuser@example.com"
                    value={inviteForm.email}
                    onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Assign Role <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select
                    className="input pl-9 appearance-none"
                    value={inviteForm.role}
                    onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r}>{ROLE_LABELS[r] || r.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
              {inviteSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-md text-sm flex items-start">
                  <Check className="h-4 w-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                  {inviteSuccess}
                </div>
              )}
              {inviteError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-sm">{inviteError}</div>
              )}
              <div className="bg-blue-50 border border-blue-100 rounded-md px-3 py-2 text-xs text-blue-700">
                The invited user will receive an email with a signup link that expires in <strong>10 minutes</strong>.
                They will be automatically assigned the selected role upon account creation.
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowInvite(false); setInviteSuccess(''); setInviteError(''); }}
                  className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-60"
                >
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── User Table ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <span className="text-sm text-slate-500">{filtered.length} user{filtered.length !== 1 ? 's' : ''} {searchTerm && `matching "${searchTerm}"`}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['User', 'User ID', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-10 text-center text-slate-400">Loading users...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-10 text-center text-slate-400">No users found.</td></tr>
              ) : filtered.map((u) => {
                const isEditingRow = editing[u.id];
                const vals = editValues[u.id] || {};
                return (
                  <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${isEditingRow ? 'bg-blue-50/50' : ''}`}>
                    {/* User */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                          {u.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{u.username}</div>
                          {(u.first_name || u.last_name) && (
                            <div className="text-xs text-slate-400">{[u.first_name, u.last_name].filter(Boolean).join(' ')}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* User ID */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded" title={u.id}>
                          {u.id.slice(0, 8)}…
                        </span>
                        <button
                          onClick={() => navigator.clipboard.writeText(u.id)}
                          className="text-slate-300 hover:text-slate-500"
                          title="Copy full ID"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    {/* Email */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isEditingRow ? (
                        <input
                          type="email"
                          className="input text-xs py-1 w-48"
                          value={vals.email}
                          onChange={e => setEditValues(p => ({ ...p, [u.id]: { ...vals, email: e.target.value } }))}
                        />
                      ) : (
                        <span className="text-slate-600">{u.email}</span>
                      )}
                    </td>
                    {/* Role */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isEditingRow ? (
                        <select
                          className="text-xs font-semibold rounded px-2 py-1 border border-indigo-200 bg-indigo-50 text-indigo-800 focus:outline-none"
                          value={vals.role}
                          onChange={e => setEditValues(p => ({ ...p, [u.id]: { ...vals, role: e.target.value } }))}
                        >
                          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r] || r.replace(/_/g, ' ')}</option>)}
                        </select>
                      ) : (
                        <span className="px-2 py-0.5 inline-flex text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 capitalize">
                          {ROLE_LABELS[u.role] || u.role.replace(/_/g, ' ')}
                        </span>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full ${STATUS_COLORS[u.status] || 'bg-slate-100 text-slate-800'}`}>
                        {u.status}
                      </span>
                    </td>
                    {/* Joined */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-400">
                      {u.created_at ? formatDistanceToNow(new Date(u.created_at.replace(' ', 'T') + 'Z'), { addSuffix: true }) : '—'}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {isEditingRow ? (
                          <>
                            <button onClick={() => saveEdit(u.id)} disabled={saving[u.id]} className="p-1.5 rounded bg-green-50 text-green-600 hover:text-green-900" title="Save">
                              {saving[u.id] ? <span className="text-xs">…</span> : <Check className="h-4 w-4" />}
                            </button>
                            <button onClick={() => cancelEdit(u.id)} className="p-1.5 rounded bg-slate-100 text-slate-500 hover:text-slate-700" title="Cancel">
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <button onClick={() => startEdit(u)} className="p-1.5 rounded bg-indigo-50 text-indigo-600 hover:text-indigo-900" title="Edit email / role">
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        {u.status !== 'ACTIVE' && (
                          <button onClick={() => handleAction(u.id, 'restore')} className="p-1.5 rounded bg-green-50 text-green-600 hover:text-green-900" title="Restore">
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => handleAction(u.id, 'warn')} className="p-1.5 rounded bg-yellow-50 text-yellow-600 hover:text-yellow-900" title="Warn">
                          <AlertCircle className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleAction(u.id, 'suspend')} className="p-1.5 rounded bg-orange-50 text-orange-600 hover:text-orange-900" title="Suspend">
                          <Key className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleAction(u.id, 'ban')} className="p-1.5 rounded bg-red-50 text-red-600 hover:text-red-900" title="Permanently Ban">
                          <UserX className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
