import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/appleDesign.css';

const Settings = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settings, setSettings] = useState({
    darkMode: false,
    emailNotifications: true,
    apiAccess: false
  });
  const [user, setUser] = useState(null);
  const [currentOrganization, setCurrentOrganization] = useState(null);

  useEffect(() => {
    // Get current organization from localStorage
    try {
      const savedOrg = localStorage.getItem('selectedOrganization');
      if (savedOrg) {
        setCurrentOrganization(JSON.parse(savedOrg));
      }
    } catch (e) {
      console.error('Error loading organization from localStorage:', e);
    }
    
    fetchUserSettings();
  }, []);
  
  // Listen for changes to the "Only Blooms" setting
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'onlyBlooms' || e.key === 'selectedOrganization') {
        // Refresh data when the setting changes
        fetchUserSettings();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const fetchUserSettings = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        setError('Authentication required');
        setIsLoading(false);
        return;
      }
      
      const apiUrl = process.env.REACT_APP_API_URL || '';
      
      // Check if "Only Blooms" is active
      const onlyBloomsActive = localStorage.getItem('onlyBlooms') === 'true';
      let url = `${apiUrl}/api/settings`;
      
      // If Only Blooms is active and we have a current organization, add the organizationId parameter
      if (onlyBloomsActive && currentOrganization?.id) {
        url += `?organizationId=${currentOrganization.id}`;
      }
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data) {
        // If there are actual settings saved, use them
        setSettings(response.data.settings || settings);
        setUser(response.data.user);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load settings. Please refresh and try again.');
      setIsLoading(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        setError('Authentication required');
        setIsLoading(false);
        return;
      }
      
      const apiUrl = process.env.REACT_APP_API_URL || '';
      
      // Check if "Only Blooms" is active
      const onlyBloomsActive = localStorage.getItem('onlyBlooms') === 'true';
      let url = `${apiUrl}/api/settings`;
      
      // If Only Blooms is active and we have a current organization, add the organizationId parameter
      if (onlyBloomsActive && currentOrganization?.id) {
        url += `?organizationId=${currentOrganization.id}`;
      }
      
      const requestData = { settings };
      
      // Add organizationId to the request body if Only Blooms is active
      if (onlyBloomsActive && currentOrganization?.id) {
        requestData.organizationId = currentOrganization.id;
      }
      
      await axios.post(url, requestData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Settings</h1>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {success && (
        <div className="success-message">
          {success}
        </div>
      )}
      
      <div className="card settings-card">
        <div className="settings-section">
          <h2>User Settings</h2>
          
          {user && (
            <div className="user-profile-section">
              <div className="user-info-display">
                <div className="info-item">
                  <strong>Name:</strong> {user.firstName} {user.lastName}
                </div>
                <div className="info-item">
                  <strong>Email:</strong> {user.email}
                </div>
                <div className="info-item">
                  <strong>Role:</strong> {user.role}
                </div>
              </div>
            </div>
          )}
          
          <div className="form-group setting-item">
            <label className="setting-label">
              <span>Dark Mode</span>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.darkMode}
                  onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                  disabled={isLoading}
                />
                <span className="toggle-slider"></span>
              </div>
            </label>
            <p className="setting-description">Enable dark mode for the interface</p>
          </div>
          
          <div className="form-group setting-item">
            <label className="setting-label">
              <span>Email Notifications</span>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                  disabled={isLoading}
                />
                <span className="toggle-slider"></span>
              </div>
            </label>
            <p className="setting-description">Receive email notifications for important events</p>
          </div>
          
          <div className="form-group setting-item">
            <label className="setting-label">
              <span>API Access</span>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.apiAccess}
                  onChange={(e) => handleSettingChange('apiAccess', e.target.checked)}
                  disabled={isLoading}
                />
                <span className="toggle-slider"></span>
              </div>
            </label>
            <p className="setting-description">Enable API access for this account</p>
          </div>
        </div>
        
        <div className="form-actions">
          <button
            className="button"
            onClick={saveSettings}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
      
      <div className="section-divider"></div>
      
      <div className="card">
        <div className="settings-section">
          <h2>Application Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <strong>Version:</strong> 1.0.0
            </div>
            <div className="info-item">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </div>
            <div className="info-item">
              <strong>Support:</strong> <a href="mailto:support@nectardesk.ai">support@nectardesk.ai</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 