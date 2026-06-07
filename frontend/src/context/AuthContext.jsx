import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On app load, try to restore session from stored token
  useEffect(() => {
    const token = localStorage.getItem('giantek_token');
    const storedUser = localStorage.getItem('giantek_user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('giantek_token');
        localStorage.removeItem('giantek_user');
      }
    }
    setLoading(false);
  }, []);

  // Login: store token and user, update axios default headers
  const login = useCallback((token, userData) => {
    localStorage.setItem('giantek_token', token);
    localStorage.setItem('giantek_user', JSON.stringify(userData));
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  }, []);

  // Logout: clear all stored data
  const logout = useCallback(() => {
    localStorage.removeItem('giantek_token');
    localStorage.removeItem('giantek_user');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  }, []);

  // Refresh user info from server (e.g., after password change)
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
      localStorage.setItem('giantek_user', JSON.stringify(data));
    } catch {
      logout();
    }
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
