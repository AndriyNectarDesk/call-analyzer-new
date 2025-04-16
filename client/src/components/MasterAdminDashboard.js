import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './MasterAdminDashboard.css';
import MasterAdminManagement from './MasterAdminManagement';

const MasterAdminDashboard = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    activeOrganizations: 0,
    totalUsers: 0,
    totalTranscripts: 0,
    totalApiKeys: 0
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      // Use environment variable for API URL if available
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setLoading(false);
        return;
      }
      
      console.log('Using token:', token);
      
      // Debug token by decoding it (this doesn't verify it)
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('Token payload:', payload);
          console.log('Token expiry:', new Date(payload.exp * 1000).toLocaleString());
          console.log('Current time:', new Date().toLocaleString());
          console.log('Is token expired:', payload.exp * 1000 < Date.now());
        }
      } catch (tokenError) {
        console.error('Error decoding token:', tokenError);
      }
      
      console.log('Making API request to:', `${apiUrl}/api/master-admin/organizations`);
      
      const response = await axios.get(`${apiUrl}/api/master-admin/organizations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('API Response:', response.data);
      
      // Get user counts for each organization sequentially
      const orgsWithCounts = [];
      let totalApiKeys = 0;
      
      for (const org of response.data) {
        try {
          console.log(`Fetching stats for organization ${org._id}`);
          const statsResponse = await axios.get(`${apiUrl}/api/master-admin/organizations/${org._id}/stats`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          console.log(`Stats for organization ${org._id}:`, statsResponse.data);
          orgsWithCounts.push({
            ...org,
            actualUserCount: statsResponse.data.currentUserCount || 0,
            actualTranscriptCount: statsResponse.data.currentTranscriptCount || 0,
            apiKeyCount: statsResponse.data.activeApiKeyCount || 0
          });
          
          // Add to total API key count
          totalApiKeys += (statsResponse.data.activeApiKeyCount || 0);
        } catch (statsError) {
          console.error(`Error fetching stats for organization ${org._id}:`, statsError);
          // If stats fetch fails, add organization with default counts
          orgsWithCounts.push({
            ...org,
            actualUserCount: 0,
            actualTranscriptCount: 0,
            apiKeyCount: 0
          });
        }
      }
      
      setOrganizations(orgsWithCounts);
      
      // Calculate stats
      const activeOrgs = orgsWithCounts.filter(org => org.active || org.isActive).length;
      const organizationUsers = orgsWithCounts.reduce((sum, org) => sum + (org.actualUserCount || 0), 0);
      const totalTranscripts = orgsWithCounts.reduce((sum, org) => sum + (org.actualTranscriptCount || 0), 0);
      
      setStats({
        totalOrganizations: response.data.length,
        activeOrganizations: activeOrgs,
        totalUsers: organizationUsers,
        totalTranscripts,
        totalApiKeys
      });
    } catch (err) {
      console.error('Full error object:', err);
      let errorMessage = 'Failed to fetch organizations: ';
      
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMessage += `Server responded with ${err.response.status}: ${err.response.data?.message || err.response.data?.error || JSON.stringify(err.response.data)}`;
        console.error('Response data:', err.response.data);
        console.error('Response status:', err.response.status);
        console.error('Response headers:', err.response.headers);
        
        if (err.response.status === 401) {
          errorMessage += '. Your session may have expired. Please try logging out and back in.';
          
          // Automatically redirect to login
          localStorage.removeItem('auth_token');
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      } else if (err.request) {
        // The request was made but no response was received
        errorMessage += 'No response received from server. Please check your internet connection.';
        console.error('Request:', err.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage += err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationClick = (org) => {
    setSelectedOrganization(org);
    navigate(`/organizations/${org._id}`);
  };

  const getSubscriptionBadge = (tier, status) => {
    const tierColors = {
      free: 'gray',
      basic: 'blue',
      pro: 'purple',
      enterprise: 'green'
    };

    const statusColors = {
      active: 'green',
      trial: 'yellow',
      expired: 'red',
      cancelled: 'gray'
    };

    return (
      <div className="subscription-badge">
        <span className={`tier-badge ${tierColors[tier]}`}>{tier}</span>
        <span className={`status-badge ${statusColors[status]}`}>{status}</span>
      </div>
    );
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="master-admin-dashboard">
      <div className="dashboard-header">
        <h1>Master Admin Dashboard</h1>
        <div className="dashboard-tabs">
          <button 
            className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`tab-button ${activeTab === 'admins' ? 'active' : ''}`}
            onClick={() => setActiveTab('admins')}
          >
            Master Admins
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <>
          <div className="stats-container">
            <div className="stat-card">
              <h3>Total Organizations</h3>
              <p>{stats.totalOrganizations}</p>
            </div>
            <div className="stat-card">
              <h3>Active Organizations</h3>
              <p>{stats.activeOrganizations}</p>
            </div>
            <div className="stat-card">
              <h3>Total Users</h3>
              <p>{stats.totalUsers}</p>
            </div>
            <div className="stat-card">
              <h3>Total Transcripts</h3>
              <p>{stats.totalTranscripts}</p>
            </div>
            <div className="stat-card">
              <h3>Total API Keys</h3>
              <p>{stats.totalApiKeys}</p>
            </div>
          </div>

          <div className="organizations-list">
            <h2>Organizations</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact Email</th>
                    <th>Subscription</th>
                    <th>Users</th>
                    <th>Transcripts</th>
                    <th>API Keys</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map(org => (
                    <tr 
                      key={org._id} 
                      onClick={() => handleOrganizationClick(org)}
                      className="clickable-row"
                    >
                      <td>{org.name}</td>
                      <td>{org.contactEmail}</td>
                      <td>
                        {getSubscriptionBadge(org.subscriptionTier, org.subscriptionStatus)}
                      </td>
                      <td>{org.actualUserCount || 0}</td>
                      <td>{org.actualTranscriptCount || 0}</td>
                      <td>{org.apiKeyCount || 0}</td>
                      <td>
                        <span className={`status-indicator ${org.active ? 'active' : 'inactive'}`}>
                          {org.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'admins' && (
        <MasterAdminManagement />
      )}
    </div>
  );
};

export default MasterAdminDashboard; 