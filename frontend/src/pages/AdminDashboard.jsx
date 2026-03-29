import { useState, useEffect } from 'react';
import { adminGetUsers, adminWarnUser, adminSuspendUser, adminBanUser, adminRestoreUser, adminChangeRole } from '../services/api';
import { Shield, UserX, AlertCircle, RefreshCw, Key } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [changingRole, setChangingRole] = useState({}); // { [userId]: true/false }

  const ROLES = ['user', 'creator', 'moderator', 'senior_moderator', 'admin', 'compliance_officer', 'analyst'];

  useEffect(() => {
    loadUsers();
  }, []);

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

  const handleRoleChange = async (userId, newRole) => {
    if (!newRole) return;
    setChangingRole(prev => ({ ...prev, [userId]: true }));
    try {
      await adminChangeRole(userId, newRole);
      await loadUsers();
    } catch (err) {
      alert(err.message || 'Failed to change role');
    } finally {
      setChangingRole(prev => ({ ...prev, [userId]: false }));
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto py-6">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center">
            <Shield className="h-6 w-6 text-primary mr-2" /> Admin Control Panel
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage users, roles, and platform access</p>
        </div>
        
        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">Loading users...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">No users found.</td></tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0">
                          {u.username[0].toUpperCase()}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-slate-900">{u.username}</div>
                          <div className="text-sm text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={u.role}
                        disabled={changingRole[u.id]}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="text-xs font-semibold rounded px-2 py-1 border border-indigo-200 bg-indigo-50 text-indigo-800 cursor-pointer hover:bg-indigo-100 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-50"
                        title="Change role"
                      >
                        {ROLES.map(r => (
                          <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        u.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                        u.status === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                        u.status === 'TEMP_SUSPENDED' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {u.created_at ? formatDistanceToNow(new Date(u.created_at), { addSuffix: true }) : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {u.status !== 'ACTIVE' && (
                          <button onClick={() => handleAction(u.id, 'restore')} className="text-green-600 hover:text-green-900 bg-green-50 p-1.5 rounded" title="Restore User">
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => handleAction(u.id, 'warn')} className="text-yellow-600 hover:text-yellow-900 bg-yellow-50 p-1.5 rounded" title="Issue Warning">
                          <AlertCircle className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleAction(u.id, 'suspend')} className="text-orange-600 hover:text-orange-900 bg-orange-50 p-1.5 rounded" title="Temporarily Suspend">
                          <Key className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleAction(u.id, 'ban')} className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded" title="Permanently Ban">
                          <UserX className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}