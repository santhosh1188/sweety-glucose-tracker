import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import AuthPage from './pages/AuthPage';
import ReadingsPage from './pages/ReadingsPage';
import ReportsPage from './pages/ReportsPage';

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="navbar">
      <span className="brand">🩸 Sweety</span>
      {user && (
        <nav>
          <NavLink to="/" end>Readings</NavLink>
          <NavLink to="/reports">Reports</NavLink>
          <span className="who">{user.name}</span>
          <button className="link" onClick={logout}>Log out</button>
        </nav>
      )}
    </header>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main className="container">
          <Routes>
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route path="/" element={<Protected><ReadingsPage /></Protected>} />
            <Route path="/reports" element={<Protected><ReportsPage /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}