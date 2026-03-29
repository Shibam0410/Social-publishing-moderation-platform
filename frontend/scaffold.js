import fs from 'fs';

fs.mkdirSync('src/pages', { recursive: true });
fs.mkdirSync('src/components', { recursive: true });

const pages = ['LoginPage', 'SignupPage', 'HomeFeed', 'CreatePost', 'Explore', 'Communities', 'Notifications', 'Profile', 'ModerationDashboard', 'AdminDashboard', 'Compliance', 'Analytics'];
pages.forEach(p => {
  fs.writeFileSync(`src/pages/${p}.jsx`, `export default function ${p}() { return <div className="p-6"><h2 className="text-2xl font-bold">${p}</h2></div>; }`);
});

const components = ['Navbar', 'Sidebar', 'PostCard', 'CommentSection', 'NotificationItem', 'AnalyticsChart'];
components.forEach(c => {
  fs.writeFileSync(`src/components/${c}.jsx`, `export default function ${c}() { return <div>${c}</div>; }`);
});

console.log('Scaffold complete!');
