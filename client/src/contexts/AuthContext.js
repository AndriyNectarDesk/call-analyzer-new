import React, { createContext, useState, useEffect } from 'react';
import axiosInstance from '../axiosConfig';

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

  const loadUserFromStorage = async () => {
    try {
      console.log('Loading user from storage...');
      // Try to load user data from localStorage
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('user_data');
      const orgData = localStorage.getItem('selectedOrganization');

      console.log('Token exists:', !!token);
      console.log('User data exists:', !!userData);
      console.log('Organization data exists:', !!orgData);

      if (!token) {
        setLoading(false);
        return;
      }

      // Parse user and organization data if available
      const user = userData ? JSON.parse(userData) : null;
      const org = orgData ? JSON.parse(orgData) : null;

      console.log('Parsed user:', user ? { email: user.email, id: user._id } : 'No user data');
      console.log('Parsed organization:', org ? { name: org.name, id: org._id } : 'No org data');

      // Basic validation of token format
      if (token && token.split('.').length === 3) {
        // Set user and org from storage first
        if (user) setUser(user);
        if (org) setOrganization(org);
        setIsAuthenticated(true);
        
        // Then try to fetch fresh data from server
        await fetchCurrentUser(token);
        
        // If we have organization in storage but couldn't get user data,
        // still try to refresh organization data
        if (!user && org && org._id) {
          await fetchOrganizationInfo(org._id);
        }
      } else {
        console.log('Invalid token format, logging out');
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

  const fetchCurrentUser = async (token) => {
    try {
      console.log('Fetching current user from server...');
      const response = await axiosInstance.get('/api/auth/me');
      
      if (response.data && response.data._id) {
        console.log('User data received from server:', response.data.email);
        setUser(response.data);
        localStorage.setItem('user_data', JSON.stringify(response.data));
        
        // Also fetch organization info if we have an org ID from the user
        if (response.data.organizationId) {
          await fetchOrganizationInfo(response.data.organizationId);
        } else {
          console.warn('User has no organization ID');
          // Try to load from localStorage as fallback
          const orgData = localStorage.getItem('selectedOrganization');
          if (orgData) {
            const org = JSON.parse(orgData);
            if (org && org._id) {
              await fetchOrganizationInfo(org._id);
            }
          }
        }
        return true;
      } else {
        console.warn('Invalid user data received from server');
        return false;
      }
    } catch (err) {
      console.error('Error fetching current user:', err);
      // Don't logout if this fails, just use cached data
      return false;
    }
  };
  
  const fetchOrganizationInfo = async (orgId) => {
    try {
      if (!orgId) {
        console.warn('No organization ID available');
        return false;
      }
      
      console.log('Fetching organization info for ID:', orgId);
      const response = await axiosInstance.get(`/api/organizations/${orgId}`);
      
      if (response.data && response.data._id) {
        console.log('Organization data received from server:', response.data.name);
        setOrganization(response.data);
        localStorage.setItem('selectedOrganization', JSON.stringify(response.data));
        return true;
      } else {
        console.warn('Invalid organization data received from server');
        return false;
      }
    } catch (err) {
      console.error('Error fetching organization info:', err);
      return false;
    }
  };

  // Get the user's organizations (for users who might belong to multiple orgs)
  const fetchUserOrganizations = async () => {
    try {
      console.log('Fetching user organizations...');
      const response = await axiosInstance.get('/api/user/organizations');
      
      if (response.data && Array.isArray(response.data)) {
        console.log('User organizations received:', response.data.length);
        return response.data;
      } else {
        console.warn('Invalid user organizations data received');
        return [];
      }
    } catch (err) {
      console.error('Error fetching user organizations:', err);
      return [];
    }
  };

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await axiosInstance.post('/api/auth/login', { email, password });
      
      if (response.data?.token) {
        localStorage.setItem('auth_token', response.data.token);
        
        if (response.data.user) {
          setUser(response.data.user);
          localStorage.setItem('user_data', JSON.stringify(response.data.user));
        }
        
        if (response.data.organization) {
          setOrganization(response.data.organization);
          localStorage.setItem('selectedOrganization', JSON.stringify(response.data.organization));
        } else if (response.data.user?.organizationId) {
          // If organization wasn't sent directly but user has an org ID,
          // fetch the organization details
          await fetchOrganizationInfo(response.data.user.organizationId);
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
      if (!orgId) return false;
      
      const response = await axiosInstance.get(`/api/organizations/${orgId}`);
      
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
        switchOrganization,
        refreshUser: () => fetchCurrentUser(localStorage.getItem('auth_token')),
        refreshOrganization: (orgId) => fetchOrganizationInfo(orgId),
        fetchUserOrganizations
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider; 