import { useState, useEffect } from 'react';
import { getAuditLogs, getActionTypes, getDeletionRequests, submitDeletionRequest, resolveDeletionRequest, exportDataBlob } from '../services/api';
import { Shield, Download, FileText, Trash2, Check, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Compliance({ user }) {
  const [activeTab, setActiveTab] = useState('audit');
  
  // Audit State
  const [logs, setLogs] = useState([]);
  const [actionTypes, setActionTypes] = useState({});
  const [filterAction, setFilterAction] = useState('');
  
  // Deletion State
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeTab, filterAction]);

  useEffect(() => {
    getActionTypes().then(r => setActionTypes(r.action_types || {})).catch(console.error);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'audit') {
        const data = await getAuditLogs(filterAction, '', 50, 1);
        setLogs(data.logs || []);
      } else if (activeTab === 'deletions') {
        const data = await getDeletionRequests('PENDING'); // Just show pending for admin
        setDeletionRequests(data.requests || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const blob = await exportDataBlob(user.id, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my_data_export_${new Date().toISOString()}.${format}`;
      a.click();
    } catch (err) {
      alert('Export failed');
    }
  };

  const handleResolveDeletion = async (id, decision) => {
    try {
      await resolveDeletionRequest(id, decision, 'Admin action');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center">
            <Shield className="h-6 w-6 text-indigo-500 mr-2" /> Compliance & Audit Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1">GDPR controls and operational transparency logs</p>
        </div>
      </div>

      <div className="flex space-x-4 mb-6">
        <button 
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab==='audit' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          Audit Logs
        </button>
        <button 
          onClick={() => setActiveTab('deletions')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab==='deletions' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          Deletion Requests
        </button>
        <button 
          onClick={() => setActiveTab('export')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab==='export' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          My Data Export
        </button>
      </div>

      {activeTab === 'audit' && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-end">
            <select 
              value={filterAction} 
              onChange={(e) => setFilterAction(e.target.value)}
              className="input w-64 text-sm"
            >
              <option value="">All Actions</option>
              {Object.keys(actionTypes).map(a => <option key={a} value={a}>{a} - {actionTypes[a]}</option>)}
            </select>
          </div>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">User Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan="4" className="px-6 py-4 text-center">Loading logs...</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="text-sm">
                  <td className="px-6 py-3 text-slate-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-6 py-3 font-medium text-slate-900">
                    {log.admin_email || '—'} <span className="text-xs text-slate-500 ml-1">({log.actor_role})</span>
                  </td>
                  <td className="px-6 py-3 text-slate-700">
                    {log.admin_name || 'System'}
                  </td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-1 bg-slate-100 rounded text-slate-700 font-mono text-xs">{log.action}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'deletions' && (
        <div className="card p-0 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
             <thead className="bg-slate-50">
               <tr>
                 <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">User</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Reason</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Requested</th>
                 <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
               </tr>
             </thead>
             <tbody className="bg-white divide-y divide-slate-200">
               {loading ? (
                  <tr><td colSpan="4" className="px-6 py-4 text-center">Loading requests...</td></tr>
               ) : deletionRequests.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">No pending deletion requests.</td></tr>
               ) : deletionRequests.map(req => (
                 <tr key={req.id} className="text-sm max-h-16">
                    <td className="px-6 py-3 text-slate-900 font-medium">{req.username}</td>
                    <td className="px-6 py-3 text-slate-600 w-1/2">{req.reason || 'No reason provided'}</td>
                    <td className="px-6 py-3 text-slate-500">{formatDistanceToNow(new Date(req.created_at))} ago</td>
                    <td className="px-6 py-3 text-right">
                      <button onClick={() => handleResolveDeletion(req.id, 'APPROVED')} className="p-1 text-green-600 hover:bg-green-50 rounded mx-1" title="Approve Deletion">
                        <Check className="h-5 w-5" />
                      </button>
                      <button onClick={() => handleResolveDeletion(req.id, 'REJECTED')} className="p-1 text-red-600 hover:bg-red-50 rounded mx-1" title="Reject Deletion">
                        <XCircle className="h-5 w-5" />
                      </button>
                    </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
      )}

      {activeTab === 'export' && (
        <div className="card bg-white p-8 text-center max-w-xl mx-auto mt-8">
          <FileText className="h-16 w-16 text-indigo-200 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Export Your Data</h2>
          <p className="text-slate-500 mb-8">Download a complete copy of your personal data, posts, and engagement metrics in your preferred format.</p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button onClick={() => handleExport('json')} className="btn bg-slate-800 hover:bg-slate-900 flex items-center justify-center">
              <Download className="h-4 w-4 mr-2" /> JSON Format
            </button>
            <button onClick={() => handleExport('csv')} className="btn bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center">
              <Download className="h-4 w-4 mr-2" /> CSV Export
            </button>
          </div>
        </div>
      )}

    </div>
  );
}