import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './MasterAdminDashboard.css';

const MasterAdminDashboard = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    activeOrganizations: 0,
    totalUsers: 0,
    totalTranscripts: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await axios.get('/api/master-admin/organizations');
      setOrganizations(response.data);
      
      // Calculate stats
      const activeOrgs = response.data.filter(org => org.active).length;
      const totalUsers = response.data.reduce((sum, org) => sum + (org.usageStats?.totalUsers || 0), 0);
      const totalTranscripts = response.data.reduce((sum, org) => sum + (org.usageStats?.totalTranscripts || 0), 0);
      
      setStats({
        totalOrganizations: response.data.length,
        activeOrganizations: activeOrgs,
        totalUsers,
        totalTranscripts
      });
    } catch (err) {
      setError('Failed to fetch organizations');
      console.error('Error fetching organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationClick = (org) => {
    setSelectedOrganization(org);
    navigate(`/master-admin/organizations/${org._id}`);
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
                  <td>{org.usageStats?.totalUsers || 0}</td>
                  <td>{org.usageStats?.totalTranscripts || 0}</td>
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
    </div>
  );
};

export default MasterAdminDashboard; 