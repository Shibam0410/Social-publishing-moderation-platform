import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getModerationReports, getFlaggedPosts, setPostStatus, approvePost, removeModeratedPost, updateReportStatus, escalateReport, warnUser, suspendUser, banUser } from '../services/api';
import { ShieldAlert, Check, X, AlertTriangle, ArrowUpRight, UserMinus, UserX, MessageSquare, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function extractPreview(content, postType) {
  if (!content) return '[No content]';
  if (postType === 'image') {
    try {
      const parsed = JSON.parse(content);
      return parsed.caption ? `[Image] ${parsed.caption}` : '[Image Attachment]';
    } catch { return '[Image/Media]'; }
  }
  return content.length > 80 ? content.slice(0, 80) + '...' : content;
}

export default function ModerationDashboard({ user }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('SUBMITTED');
  const [filterReason, setFilterReason] = useState('ALL');

  useEffect(() => {
    loadReports();
  }, [filterStatus]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const resp = await getModerationReports(filterStatus);
      setReports(resp.reports || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (reportId, postId, targetUserId, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this post/report?`)) return;
    try {
      if (action === 'APPROVE_POST') {
        await approvePost(postId);
        await updateReportStatus(reportId, 'CLOSED');
      } else if (action === 'REMOVE_POST') {
        const reason = prompt('Reason for removal:');
        if (!reason) return;
        await removeModeratedPost(postId, reason);
        await updateReportStatus(reportId, 'DECISION');
      } else if (action === 'WARN_USER') {
        const reason = prompt('Warning message to user:');
        if (!reason) return;
        await warnUser(targetUserId, reason);
        await updateReportStatus(reportId, 'DECISION');
      } else if (action === 'SUSPEND_USER') {
        const reason = prompt('Reason for temporary suspension:');
        if (!reason) return;
        await suspendUser(targetUserId, reason);
        await removeModeratedPost(postId, reason);
        await updateReportStatus(reportId, 'DECISION');
      } else if (action === 'BAN_USER') {
        const reason = prompt('Reason for permanent ban:');
        if (!reason) return;
        await banUser(targetUserId, reason);
        await removeModeratedPost(postId, reason);
        await updateReportStatus(reportId, 'DECISION');
      } else if (action === 'ESCALATE') {
        await escalateReport(reportId);
      }
      loadReports();
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  const filteredReports = filterReason === 'ALL' ? reports : reports.filter(r => r.reason === filterReason);

  return (
    <div className="max-w-7xl mx-auto py-6">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center">
            <ShieldAlert className="h-6 w-6 text-red-500 mr-2" /> Moderation Queue
          </h1>
          <p className="text-sm text-slate-500 mt-1">Review flagged content and user reports</p>
        </div>
        
        <div className="flex gap-3">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input text-sm py-1.5"
          >
            <option value="SUBMITTED">Status: Submitted</option>
            <option value="AUTO_RISK_SCORING">Status: Auto Risk</option>
            <option value="MODERATOR_REVIEW">Status: Under Review</option>
            <option value="ESCALATED">Status: Escalated</option>
            <option value="DECISION">Status: Decision Made</option>
            <option value="CLOSED">Status: Closed</option>
          </select>

          <select 
            value={filterReason}
            onChange={(e) => setFilterReason(e.target.value)}
            className="input text-sm py-1.5"
          >
            <option value="ALL">Reason: All Categories</option>
            <option value="spam">Spam</option>
            <option value="hate speech">Hate Speech</option>
            <option value="harassment">Harassment</option>
            <option value="misinformation">Misinformation</option>
            <option value="nsfw content">NSFW</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Report Info</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Risk / Count</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category & Post</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">Loading queue...</td></tr>
              ) : filteredReports.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">Queue is empty for these filters. 🙌</td></tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900 truncate max-w-[200px]" title={report.reporter_name}>
                        Reported by: <span className="text-indigo-600">@{report.reporter_name}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {report.created_at ? formatDistanceToNow(new Date(report.created_at), { addSuffix: true }) : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          report.risk_score > 0.8 ? 'bg-red-100 text-red-800' : 
                          report.risk_score > 0.4 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          Risk: {(report.risk_score || 0).toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-slate-900 capitalize font-medium">{report.reason}</span>
                      </div>
                      <div className="mt-2 bg-slate-50 p-2 text-xs text-slate-700 rounded border border-slate-100 italic line-clamp-2" title={report.post_content}>
                        <MessageSquare className="inline h-3 w-3 mr-1 text-slate-400" /> 
                        {extractPreview(report.post_content, report.post_type)}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Posted by: {report.post_author_username ? `@${report.post_author_username}` : 'Unknown UI'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800">
                        {report.report_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link to={`/post/${report.post_id}`} target="_blank" className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded flex items-center justify-center flex-shrink-0" title="View Full Post">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                        <button onClick={() => handleAction(report.id, report.post_id, report.post_author_id, 'APPROVE_POST')} className="text-green-600 hover:text-green-900 bg-green-50 p-1.5 rounded flex-shrink-0" title="Approve Post & Close">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleAction(report.id, report.post_id, report.post_author_id, 'REMOVE_POST')} className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded flex-shrink-0" title="Remove Post">
                          <X className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleAction(report.id, report.post_id, report.post_author_id, 'WARN_USER')} className="text-amber-600 hover:text-amber-900 bg-amber-50 p-1.5 rounded flex-shrink-0" title="Warn Author">
                          <AlertTriangle className="h-4 w-4" />
                        </button>
                        {report.post_author_id && (
                          <>
                            <button onClick={() => handleAction(report.id, report.post_id, report.post_author_id, 'SUSPEND_USER')} className="text-orange-600 hover:text-orange-900 bg-orange-50 p-1.5 rounded flex-shrink-0" title="Suspend Author">
                              <UserMinus className="h-4 w-4" />
                            </button>
                            {['senior_moderator', 'admin'].includes(user.role) && (
                              <button onClick={() => handleAction(report.id, report.post_id, report.post_author_id, 'BAN_USER')} className="text-red-700 hover:text-red-900 bg-red-100 p-1.5 rounded flex-shrink-0" title="Permanently Ban Author">
                                <UserX className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                        {!['senior_moderator', 'admin'].includes(user.role) && (
                          <button onClick={() => handleAction(report.id, report.post_id, null, 'ESCALATE')} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-1.5 rounded flex-shrink-0" title="Escalate to Senior Mod">
                            <ArrowUpRight className="h-4 w-4" />
                          </button>
                        )}
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