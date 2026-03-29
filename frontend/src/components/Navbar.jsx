import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Users, PlusSquare, Bell, User, LogOut, TrendingUp } from 'lucide-react';

export default function Navbar({ user, onLogout }) {
  const location = useLocation();
  
  const navItems = [
    { name: 'Home',         path: '/',             icon: Home },
    { name: 'Explore',      path: '/explore',       icon: Compass },
    { name: 'Communities',  path: '/communities',   icon: Users },
    { name: 'Create',       path: '/create-post',   icon: PlusSquare },
    { name: 'Notifications',path: '/notifications', icon: Bell },
    // Creator Analytics only visible to creators
    ...(user?.role === 'creator' ? [{ name: 'Analytics', path: '/creator-analytics', icon: TrendingUp }] : []),
  ];

  const ROLE_BADGE = {
    admin:              { label: 'Admin',     color: 'bg-violet-100 text-violet-700' },
    creator:            { label: '✓ Creator', color: 'bg-amber-100 text-amber-700' },
    moderator:          { label: 'Mod',       color: 'bg-blue-100 text-blue-700' },
    senior_moderator:   { label: 'Sr. Mod',   color: 'bg-blue-100 text-blue-700' },
    compliance_officer: { label: 'Compliance',color: 'bg-teal-100 text-teal-700' },
    analyst:            { label: 'Analyst',   color: 'bg-slate-100 text-slate-700' },
  };
  const badge = ROLE_BADGE[user?.role];

  return (
    <nav className="bg-surface border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-primary tracking-tight">VibeCast</span>
            </Link>
          </div>
          
          <div className="hidden sm:flex sm:space-x-8 items-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`inline-flex flex-col items-center justify-center px-1 pt-1 pb-2 border-b-2 text-sm font-medium ${
                    isActive ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="text-xs">{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center space-x-4">
            <Link 
              to="/profile" 
              className={`flex items-center space-x-2 text-sm font-medium ${location.pathname === '/profile' ? 'text-primary' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 overflow-hidden">
                <User className="h-5 w-5" />
              </div>
              <div className="hidden md:flex flex-col items-start leading-none">
                <span className="text-sm font-medium">{user.username}</span>
                {badge && (
                  <span className={`mt-0.5 text-xs px-1.5 py-0.5 rounded font-semibold ${badge.color}`}>{badge.label}</span>
                )}
              </div>
            </Link>
            
            <button 
              onClick={onLogout}
              className="text-slate-500 hover:text-red-500 p-2 rounded-full hover:bg-slate-100 transition"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile nav placeholder - full implementation would have a bottom bar or hamburger */}
      <div className="sm:hidden flex overflow-x-auto border-t border-slate-100 py-2 px-4 space-x-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
             <Link key={item.name} to={item.path} className={`flex flex-col items-center p-1 ${isActive ? 'text-primary' : 'text-slate-500'}`}>
               <Icon className="h-6 w-6" />
             </Link>
          )
        })}
      </div>
    </nav>
  );
}