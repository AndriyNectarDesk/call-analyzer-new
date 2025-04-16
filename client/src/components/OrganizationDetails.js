import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './OrganizationDetails.css';

const OrganizationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [users, setUsers] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState(null);
  const [keyLoading, setKeyLoading] = useState(false);

  useEffect(() => {
    fetchOrganizationDetails();
  }, [id]);

  const fetchOrganizationDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/api/master-admin/organizations/${id}`);
      setOrganization(response.data.organization);
      setUsers(response.data.users);
      
      try {
        // Fetch API keys separately 
        const statsResponse = await axios.get(`/api/master-admin/organizations/${id}/stats`);
        if (statsResponse.data && statsResponse.data.activeApiKeyCount !== undefined) {
          // If we have API key count data, we can show it in the UI
          setOrganization(prev => ({
            ...prev,
            apiKeyCount: statsResponse.data.activeApiKeyCount
          }));
        }
      } catch (statsErr) {
        console.error('Error fetching organization stats:', statsErr);
      }
    } catch (err) {
      console.error('Error fetching organization details:', err);
      if (err.response && err.response.status === 400 && err.response.data.message === 'Invalid organization ID format') {
        setError('Invalid organization ID format. Please check the URL and try again.');
      } else if (err.response && err.response.status === 404) {
        setError('Organization not found. It may have been deleted or you may not have permission to view it.');
      } else {
        setError('Failed to fetch organization details. Please try again later.');
      }
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
  
  const handleGenerateApiKey = async () => {
    if (!newKeyName) {
      setError('Please enter a name for the API key');
      return;
    }
    
    try {
      setKeyLoading(true);
      const response = await axios.post(`/api/master-admin/organizations/${id}/api-key`, {
        name: newKeyName
      });
      
      setGeneratedKey(response.data);
      setNewKeyName('');
      fetchOrganizationDetails();
    } catch (err) {
      setError('Failed to generate API key');
      console.error('Error generating API key:', err);
    } finally {
      setKeyLoading(false);
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
          className={activeTab === 'api-keys' ? 'active' : ''}
          onClick={() => setActiveTab('api-keys')}
        >
          API Keys
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
                <label>API Keys</label>
                <p>{organization.apiKeyCount || 0}</p>
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
      
      {activeTab === 'api-keys' && (
        <div className="api-keys-tab">
          <div className="api-keys-header">
            <h2>API Keys</h2>
            <button 
              className="generate-key-button"
              onClick={() => setShowNewKey(true)}
            >
              Generate New Key
            </button>
          </div>
          
          {showNewKey && (
            <div className="new-key-form">
              <h3>Generate New API Key</h3>
              <div className="form-group">
                <label>Key Name</label>
                <input 
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Enter a name for this API key"
                />
              </div>
              <div className="form-actions">
                <button 
                  className="cancel-button"
                  onClick={() => {
                    setShowNewKey(false);
                    setNewKeyName('');
                    setGeneratedKey(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="generate-button"
                  onClick={handleGenerateApiKey}
                  disabled={keyLoading || !newKeyName}
                >
                  {keyLoading ? 'Generating...' : 'Generate Key'}
                </button>
              </div>
              
              {generatedKey && (
                <div className="generated-key-display">
                  <p className="key-warning">Please copy this API key now. You won't be able to see it again!</p>
                  <div className="key-value">
                    <code>{generatedKey.key}</code>
                    <button 
                      className="copy-button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedKey.key);
                        alert('API key copied to clipboard');
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="api-keys-info">
            <p>
              This organization has <strong>{organization.apiKeyCount || 0}</strong> active API {organization.apiKeyCount === 1 ? 'key' : 'keys'}.
            </p>
            <p>
              API keys are used to authenticate requests to the API. For security reasons, we only show the full key value when it is first generated.
            </p>
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