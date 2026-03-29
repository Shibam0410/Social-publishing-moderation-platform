import { useState, useEffect } from 'react';
import { getNotifications, markNotificationRead } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, AlertTriangle, ShieldCheck, Check, Bell, AtSign } from 'lucide-react';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    switch(type) {
      case 'like': return <Heart className="h-5 w-5 text-rose-500" />;
      case 'comment': return <MessageCircle className="h-5 w-5 text-blue-500" />;
      case 'mention': return <AtSign className="h-5 w-5 text-purple-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'moderation_decision': 
      case 'report_outcome': return <ShieldCheck className="h-5 w-5 text-indigo-500" />;
      default: return <Bell className="h-5 w-5 text-slate-500" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications</h1>
      </div>

      {loading ? (
        <div className="p-8 text-center">Loading...</div>
      ) : (
        <div className="bg-white card divide-y divide-slate-100 p-0">
          {notifications.map(n => (
            <div 
              key={n.id} 
              className={`p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
            >
              <div className="mt-1 bg-white p-2 rounded-full shadow-sm ring-1 ring-slate-100">
                {getIcon(n.type)}
              </div>
              <div className="flex-1">
                <p className={`text-sm ${!n.is_read ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
                  {n.content}
                </p>
                <div className="text-xs text-slate-400 mt-1">
                  {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ''}
                </div>
              </div>
              {!n.is_read && (
                <button 
                  onClick={() => markAsRead(n.id)}
                  className="p-2 text-primary hover:bg-primary/10 rounded-full"
                  title="Mark as read"
                >
                  <Check className="h-5 w-5" />
                </button>
              )}
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              You're all caught up!
            </div>
          )}
        </div>
      )}
    </div>
  );
}