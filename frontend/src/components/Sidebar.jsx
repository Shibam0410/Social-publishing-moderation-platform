import { Link, useLocation } from 'react-router-dom';
import { ShieldAlert, Shield, FileCheck, BarChart3, Users, TrendingUp } from 'lucide-react';

export default function Sidebar({ user }) {
  const location = useLocation();
  
  const isAdminOrMod = ['admin', 'moderator', 'senior_moderator', 'compliance_officer', 'analyst'].includes(user?.role);
  const isCreator = user?.role === 'creator';

  if (!user || (!isAdminOrMod && !isCreator)) return null;

  // Creator sees only their own analytics
  const creatorItems = [
    { name: 'Creator Analytics', path: '/creator-analytics', icon: TrendingUp, roles: ['creator'] },
  ];

  // Staff/Admin dashboard items
  const staffItems = [
    { name: 'Moderation',      path: '/moderation',       icon: ShieldAlert, roles: ['admin', 'moderator', 'senior_moderator'] },
    { name: 'User Management', path: '/user-management',  icon: Users,       roles: ['admin'] },
    { name: 'Admin',           path: '/admin',            icon: Shield,      roles: ['admin'] },
    { name: 'Compliance',      path: '/compliance',       icon: FileCheck,   roles: ['admin', 'compliance_officer'] },
    { name: 'Analytics',       path: '/analytics',        icon: BarChart3,   roles: ['admin', 'analyst', 'senior_moderator'] },
  ];

  const navSource = isCreator ? creatorItems : staffItems;
  const visibleItems = navSource.filter(item => item.roles.includes(user.role));
  
  if (visibleItems.length === 0) return null;

  const ROLE_LABELS = {
    user:               'Normal User',
    creator:            'Verified Creator',
    moderator:          'Community Moderator',
    senior_moderator:   'Senior Moderator',
    admin:              'Admin',
    compliance_officer: 'Compliance Officer',
    analyst:            'Analyst',
  };

  return (
    <div className="w-16 md:w-64 bg-surface border-r border-slate-200 flex-shrink-0 flex flex-col pt-6 h-full">
      <div className="px-4 pb-4 hidden md:block">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {isCreator ? 'Creator Hub' : 'Dashboard'}
        </h2>
      </div>
      <nav className="flex-1 px-2 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center px-2 md:px-3 py-3 md:py-2 text-sm font-medium rounded-md transition-colors ${
                isActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="h-6 w-6 md:h-5 md:w-5 flex-shrink-0" />
              <span className="hidden md:ml-3 md:block">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-200 hidden md:block">
        <div className="text-xs text-slate-500">
          Role: <span className="font-semibold text-slate-700">{ROLE_LABELS[user.role] || user.role}</span>
        </div>
      </div>
    </div>
  );
}