import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = () => {
    try {
      // Try to load user data from localStorage
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('user_data');
      const orgData = localStorage.getItem('selectedOrganization');

      if (!token) {
        setLoading(false);
        return;
      }

      // Parse user and organization data if available
      const user = userData ? JSON.parse(userData) : null;
      const org = orgData ? JSON.parse(orgData) : null;

      // Basic validation of token format
      if (token && token.split('.').length === 3) {
        setUser(user);
        setOrganization(org);
        setIsAuthenticated(true);
        
        // Additionally, validate token with the server if needed
        validateTokenWithServer(token);
      } else {
        logout(); // Clear invalid token
      }
    } catch (err) {
      console.error('Error loading auth data from storage:', err);
      setError('Failed to restore session');
      logout();
    } finally {
      setLoading(false);
    }
  };

  const validateTokenWithServer = async (token) => {
    try {
      // Optional: Make a lightweight call to validate the token
      const response = await axios.get('/api/auth/validate', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // If token is valid, ensure we have latest user/org data
      if (response.data?.valid) {
        if (response.data.user) {
          setUser(response.data.user);
          localStorage.setItem('user_data', JSON.stringify(response.data.user));
        }
        
        if (response.data.organization) {
          setOrganization(response.data.organization);
          localStorage.setItem('selectedOrganization', JSON.stringify(response.data.organization));
        }
      } else {
        logout(); // Token is invalid according to server
      }
    } catch (err) {
      // Token validation failed, but we'll still try to use stored data
      console.warn('Token validation failed, using cached data:', err);
    }
  };

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      
      if (response.data?.token) {
        localStorage.setItem('auth_token', response.data.token);
        
        if (response.data.user) {
          setUser(response.data.user);
          localStorage.setItem('user_data', JSON.stringify(response.data.user));
        }
        
        if (response.data.organization) {
          setOrganization(response.data.organization);
          localStorage.setItem('selectedOrganization', JSON.stringify(response.data.organization));
        }
        
        setIsAuthenticated(true);
        return true;
      } else {
        setError('Invalid response from server');
        return false;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Login failed';
      setError(errorMsg);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('selectedOrganization');
    setUser(null);
    setOrganization(null);
    setIsAuthenticated(false);
  };

  const switchOrganization = async (orgId) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return false;
      
      const response = await axios.get(`/api/organizations/${orgId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data) {
        setOrganization(response.data);
        localStorage.setItem('selectedOrganization', JSON.stringify(response.data));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error switching organization:', err);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        loading,
        error,
        isAuthenticated,
        login,
        logout,
        switchOrganization
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider; 