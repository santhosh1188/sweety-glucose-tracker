import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card auth" onSubmit={onSubmit} noValidate>
      <h1>{isLogin ? 'Log in' : 'Create your account'}</h1>
      {error && <p className="error" role="alert">{error}</p>}
      {!isLogin && (
        <label>Name<input value={form.name} onChange={set('name')} autoComplete="name" /></label>
      )}
      <label>Email<input type="email" value={form.email} onChange={set('email')} autoComplete="email" /></label>
      <label>
        Password
        <input type="password" value={form.password} onChange={set('password')}
          autoComplete={isLogin ? 'current-password' : 'new-password'} />
      </label>
      <button className="primary" disabled={busy}>{busy ? 'Please wait…' : isLogin ? 'Log in' : 'Sign up'}</button>
      <p className="muted">
        {isLogin ? <>New here? <Link to="/register">Create an account</Link></> : <>Already registered? <Link to="/login">Log in</Link></>}
      </p>
    </form>
  );
}