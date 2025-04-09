import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './OrganizationDetails.css';

const OrganizationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchOrganizationDetails();
  }, [id]);

  const fetchOrganizationDetails = async () => {
    try {
      const response = await axios.get(`/api/master-admin/organizations/${id}`);
      setOrganization(response.data.organization);
      setUsers(response.data.users);
    } catch (err) {
      setError('Failed to fetch organization details');
      console.error('Error fetching organization details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubscription = async (updates) => {
    try {
      await axios.put(`/api/master-admin/organizations/${id}/subscription`, updates);
      fetchOrganizationDetails();
    } catch (err) {
      setError('Failed to update subscription');
      console.error('Error updating subscription:', err);
    }
  };

  const handleUpdateFeatures = async (updates) => {
    try {
      await axios.put(`/api/master-admin/organizations/${id}/features`, updates);
      fetchOrganizationDetails();
    } catch (err) {
      setError('Failed to update features');
      console.error('Error updating features:', err);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!organization) return <div className="error">Organization not found</div>;

  return (
    <div className="organization-details">
      <div className="header">
        <button onClick={() => navigate('/master-admin')} className="back-button">
          ← Back to Dashboard
        </button>
        <h1>{organization.name}</h1>
      </div>

      <div className="tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button 
          className={activeTab === 'settings' ? 'active' : ''}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="overview-tab">
          <div className="info-section">
            <h2>Organization Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Contact Email</label>
                <p>{organization.contactEmail}</p>
              </div>
              <div className="info-item">
                <label>Status</label>
                <p className={`status ${organization.active ? 'active' : 'inactive'}`}>
                  {organization.active ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className="info-item">
                <label>Created At</label>
                <p>{new Date(organization.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div className="subscription-section">
            <h2>Subscription Details</h2>
            <div className="subscription-info">
              <div className="subscription-item">
                <label>Tier</label>
                <p className={`tier ${organization.subscriptionTier}`}>
                  {organization.subscriptionTier}
                </p>
              </div>
              <div className="subscription-item">
                <label>Status</label>
                <p className={`status ${organization.subscriptionStatus}`}>
                  {organization.subscriptionStatus}
                </p>
              </div>
              <div className="subscription-item">
                <label>Period</label>
                <p>
                  {organization.subscriptionPeriod?.startDate 
                    ? new Date(organization.subscriptionPeriod.startDate).toLocaleDateString()
                    : 'Not set'} - 
                  {organization.subscriptionPeriod?.endDate 
                    ? new Date(organization.subscriptionPeriod.endDate).toLocaleDateString()
                    : 'Not set'}
                </p>
              </div>
            </div>
          </div>

          <div className="usage-section">
            <h2>Usage Statistics</h2>
            <div className="usage-grid">
              <div className="usage-item">
                <label>Total Users</label>
                <p>{organization.usageStats?.totalUsers || 0}</p>
              </div>
              <div className="usage-item">
                <label>Total Transcripts</label>
                <p>{organization.usageStats?.totalTranscripts || 0}</p>
              </div>
              <div className="usage-item">
                <label>API Calls</label>
                <p>{organization.usageStats?.apiCalls || 0}</p>
              </div>
              <div className="usage-item">
                <label>Last Active</label>
                <p>
                  {organization.usageStats?.lastActive 
                    ? new Date(organization.usageStats.lastActive).toLocaleString()
                    : 'Never'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="users-tab">
          <h2>Organization Users</h2>
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id}>
                    <td>{user.firstName} {user.lastName}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      <span className={`status ${user.isActive ? 'active' : 'inactive'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {user.lastLogin 
                        ? new Date(user.lastLogin).toLocaleString()
                        : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="settings-tab">
          <h2>Organization Settings</h2>
          <div className="settings-section">
            <h3>Features</h3>
            <div className="features-grid">
              <div className="feature-item">
                <label>Max Users</label>
                <input 
                  type="number" 
                  value={organization.features.maxUsers}
                  onChange={(e) => handleUpdateFeatures({
                    ...organization.features,
                    maxUsers: parseInt(e.target.value)
                  })}
                />
              </div>
              <div className="feature-item">
                <label>Max Transcripts</label>
                <input 
                  type="number" 
                  value={organization.features.maxTranscripts}
                  onChange={(e) => handleUpdateFeatures({
                    ...organization.features,
                    maxTranscripts: parseInt(e.target.value)
                  })}
                />
              </div>
              <div className="feature-item">
                <label>API Access</label>
                <input 
                  type="checkbox" 
                  checked={organization.features.apiAccess}
                  onChange={(e) => handleUpdateFeatures({
                    ...organization.features,
                    apiAccess: e.target.checked
                  })}
                />
              </div>
              <div className="feature-item">
                <label>Custom Branding</label>
                <input 
                  type="checkbox" 
                  checked={organization.features.customBranding}
                  onChange={(e) => handleUpdateFeatures({
                    ...organization.features,
                    customBranding: e.target.checked
                  })}
                />
              </div>
              <div className="feature-item">
                <label>Advanced Analytics</label>
                <input 
                  type="checkbox" 
                  checked={organization.features.advancedAnalytics}
                  onChange={(e) => handleUpdateFeatures({
                    ...organization.features,
                    advancedAnalytics: e.target.checked
                  })}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationDetails; 