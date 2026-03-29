import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

// Pages
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HomeFeed from './pages/HomeFeed';
import CreatePost from './pages/CreatePost';
import Explore from './pages/Explore';
import Communities from './pages/Communities';
import CommunityPage from './pages/CommunityPage';
import UserProfile from './pages/UserProfile';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import ModerationDashboard from './pages/ModerationDashboard';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import Compliance from './pages/Compliance';
import Analytics from './pages/Analytics';
import CreatorAnalytics from './pages/CreatorAnalytics';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AcceptInvite from './pages/AcceptInvite';

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// API
import { getProfile } from './services/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const data = await getProfile();
          setUser(data.user);
        } catch (err) {
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const isAdminOrMod = user && ['admin', 'moderator', 'senior_moderator', 'compliance_officer', 'analyst'].includes(user.role);
  const isCreator = user?.role === 'creator';

  return (
    <Router>
      <div className="min-h-screen bg-background flex flex-col font-sans text-slate-900">
        {user && <Navbar user={user} onLogout={handleLogout} />}
        
        <div className="flex flex-1 overflow-hidden">
          {user && (isAdminOrMod || isCreator) && <Sidebar user={user} />}
          
          <main className="flex-1 overflow-y-auto w-full">
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={!user ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/" />} />
              <Route path="/signup" element={!user ? <SignupPage /> : <Navigate to="/" />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />

              {/* Protected Standard Routes */}
              <Route path="/" element={user ? <HomeFeed user={user} /> : <Navigate to="/login" />} />
              <Route path="/explore" element={user ? <Explore user={user} /> : <Navigate to="/login" />} />
              <Route path="/communities" element={user ? <Communities user={user} /> : <Navigate to="/login" />} />
              <Route path="/community/:id" element={user ? <CommunityPage user={user} /> : <Navigate to="/login" />} />
              <Route path="/create-post" element={user ? <CreatePost user={user} /> : <Navigate to="/login" />} />
              <Route path="/notifications" element={user ? <Notifications user={user} /> : <Navigate to="/login" />} />
              <Route path="/profile" element={user ? <Profile user={user} onUpdateUser={handleLogin} onLogout={handleLogout} /> : <Navigate to="/login" />} />
              <Route path="/user/:username" element={user ? <UserProfile currentUser={user} /> : <Navigate to="/login" />} />
              
              {/* Protected Dashboard Routes */}
              <Route path="/moderation" element={user && isAdminOrMod ? <ModerationDashboard user={user} /> : <Navigate to="/" />} />
              <Route path="/admin" element={user && isAdminOrMod ? <AdminDashboard user={user} /> : <Navigate to="/" />} />
              <Route path="/user-management" element={user && user.role === 'admin' ? <UserManagement user={user} /> : <Navigate to="/" />} />
              <Route path="/compliance" element={user && isAdminOrMod ? <Compliance user={user} /> : <Navigate to="/" />} />
              <Route path="/analytics" element={user && isAdminOrMod ? <Analytics user={user} /> : <Navigate to="/" />} />
              <Route path="/creator-analytics" element={user && (user.role === 'creator' || isAdminOrMod) ? <CreatorAnalytics user={user} /> : <Navigate to="/" />} />
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
