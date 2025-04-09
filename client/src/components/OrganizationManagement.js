import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './OrganizationManagement.css';

const OrganizationManagement = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  
  useEffect(() => {
    // Simple fetch function for testing
    const fetchOrgs = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/master-admin/organizations');
        setOrganizations(response.data);
        setError('');
      } catch (err) {
        setError('Failed to fetch organizations. Please try again.');
        console.error('Error fetching organizations:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrgs();
  }, []);

  return (
    <div className="organization-management">
      <div className="org-header">
        <h2>Organizations</h2>
        <button className="button-primary">Add New Organization</button>
      </div>
      
      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}
      
      {error && (
        <div className="error-message">{error}</div>
      )}
      
      <div className="organizations-table">
        {loading ? (
          <div className="loading-indicator">Loading organizations...</div>
        ) : organizations.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map(org => (
                <tr key={org._id}>
                  <td>{org.name}</td>
                  <td>{org.code}</td>
                  <td>
                    <span className={`status-indicator ${org.active ? 'active' : 'inactive'}`}>
                      {org.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <button className="action-button edit">Edit</button>
                      <button className={`action-button ${org.active ? 'deactivate' : 'activate'}`}>
                        {org.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-data">No organizations found.</div>
        )}
      </div>
    </div>
  );
};

export default OrganizationManagement; 