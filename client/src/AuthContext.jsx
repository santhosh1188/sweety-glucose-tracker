import { createContext, useContext, useState } from 'react';
import { api, setToken } from './api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sweety_user')); } catch { return null; }
  });

  async function authenticate(path, body) {
    const data = await api(path, { method: 'POST', body });
    setToken(data.token);
    localStorage.setItem('sweety_user', JSON.stringify(data.user));
    setUser(data.user);
  }

  const value = {
    user,
    login: (email, password) => authenticate('/auth/login', { email, password }),
    register: (name, email, password) => authenticate('/auth/register', { name, email, password }),
    logout: () => {
      setToken(null);
      localStorage.removeItem('sweety_user');
      setUser(null);
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}