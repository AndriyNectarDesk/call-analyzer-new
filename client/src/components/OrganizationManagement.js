import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { FaEye, FaEdit, FaToggleOn, FaToggleOff } from 'react-icons/fa';
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
  
  // Form states
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    subscriptionTier: 'free',
    subscriptionStatus: 'active',
    maxUsers: 5,
    maxCalls: 100,
    apiAccess: false,
    active: true
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Organization name is required';
    }
    
    if (!formData.code.trim()) {
      errors.code = 'Organization code is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.code)) {
      errors.code = 'Code can only contain lowercase letters, numbers, and hyphens';
    }
    
    if (formData.maxUsers < 1) {
      errors.maxUsers = 'Maximum users must be at least 1';
    }
    
    if (formData.maxCalls < 1) {
      errors.maxCalls = 'Maximum calls must be at least 1';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Convert numeric string values to numbers
      const dataToSubmit = {
        ...formData,
        maxUsers: parseInt(formData.maxUsers),
        maxCalls: parseInt(formData.maxCalls)
      };
      
      // Prepare subscription data
      const subscriptionData = {
        tier: dataToSubmit.subscriptionTier,
        status: dataToSubmit.subscriptionStatus,
        features: {
          maxUsers: dataToSubmit.maxUsers,
          maxCalls: dataToSubmit.maxCalls,
          apiAccess: dataToSubmit.apiAccess
        }
      };
      
      let response;
      
      if (isEditing) {
        // Update existing organization
        response = await axios.put(`/api/master-admin/organizations/${editingId}`, {
          name: dataToSubmit.name,
          code: dataToSubmit.code,
          active: dataToSubmit.active
        });
        
        // Update subscription separately
        await axios.put(`/api/master-admin/organizations/${editingId}/subscription`, subscriptionData);
        
        setSuccessMessage('Organization updated successfully');
      } else {
        // Create new organization
        const newOrgData = {
          name: dataToSubmit.name,
          code: dataToSubmit.code,
          active: dataToSubmit.active,
          subscriptionTier: dataToSubmit.subscriptionTier,
          features: {
            maxUsers: dataToSubmit.maxUsers,
            maxCalls: dataToSubmit.maxCalls,
            apiAccess: dataToSubmit.apiAccess
          }
        };
        
        response = await axios.post('/api/master-admin/organizations', newOrgData);
        setSuccessMessage('Organization created successfully');
      }
      
      // Reset form and close modal
      resetForm();
      setShowModal(false);
      
      // Refresh organizations list
      fetchOrganizations();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'An error occurred. Please try again.';
      setError(errorMessage);
      console.error('Error submitting organization:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditOrganization = (org) => {
    setFormData({
      name: org.name,
      code: org.code,
      subscriptionTier: org.subscriptionTier || 'free',
      subscriptionStatus: org.subscriptionStatus || 'active',
      maxUsers: org.features?.maxUsers || 5,
      maxCalls: org.features?.maxCalls || 100,
      apiAccess: org.features?.apiAccess || false,
      active: org.active
    });
    
    setIsEditing(true);
    setEditingId(org._id);
    setShowModal(true);
  };

  const handleToggleStatus = async (org) => {
    try {
      setLoading(true);
      
      const newStatus = !org.active;
      await axios.put(`/api/master-admin/organizations/${org._id}/status`, {
        active: newStatus
      });
      
      setSuccessMessage(`Organization ${newStatus ? 'activated' : 'deactivated'} successfully`);
      
      // Refresh organizations list
      fetchOrganizations();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'An error occurred. Please try again.';
      setError(errorMessage);
      console.error('Error toggling organization status:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      subscriptionTier: 'free',
      subscriptionStatus: 'active',
      maxUsers: 5,
      maxCalls: 100,
      apiAccess: false,
      active: true
    });
    setFormErrors({});
    setIsEditing(false);
    setEditingId(null);
  };

  const handleAddNew = () => {
    resetForm();
    setShowModal(true);
  };

  const closeModal = () => {
    resetForm();
    setShowModal(false);
  };

  const filteredOrganizations = organizations.filter(org => {
    // Search filter
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          org.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'active' && org.active) || 
                          (statusFilter === 'inactive' && !org.active);
    
    // Tier filter
    const matchesTier = tierFilter === 'all' || org.subscriptionTier === tierFilter;
    
    return matchesSearch && matchesStatus && matchesTier;
  });

  // Clear success or error messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [successMessage]);
  
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="organization-management">
      <div className="org-header">
        <h2>Organizations</h2>
        <button className="button-primary" onClick={handleAddNew}>
          Add New Organization
        </button>
      </div>
      
      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}
      
      {error && (
        <div className="error-message">{error}</div>
      )}
      
      <div className="filter-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search organizations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <label htmlFor="status-filter">Status:</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="tier-filter">Tier:</label>
          <select
            id="tier-filter"
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>
      
      <div className="organizations-table">
        {loading ? (
          <div className="loading-indicator">Loading organizations...</div>
        ) : filteredOrganizations.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Subscription</th>
                <th>Users</th>
                <th>Created</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrganizations.map(org => (
                <tr key={org._id}>
                  <td>{org.name}</td>
                  <td>{org.code}</td>
                  <td>
                    <div className="subscription-badge">
                      <span className={`tier-badge ${org.subscriptionTier || 'free'}`}>
                        {org.subscriptionTier || 'Free'}
                      </span>
                      {org.subscriptionStatus && (
                        <span className={`status-badge ${org.subscriptionStatus}`}>
                          {org.subscriptionStatus}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {org.userCount || 0} / {org.features?.maxUsers || 'Unlimited'}
                  </td>
                  <td>
                    {org.createdAt 
                      ? formatDistanceToNow(new Date(org.createdAt), { addSuffix: true }) 
                      : 'Unknown'}
                  </td>
                  <td>
                    <span className={`status-indicator ${org.active ? 'active' : 'inactive'}`}>
                      {org.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <a 
                        href={`/organizations/${org._id}`} 
                        className="action-button view"
                        title="View details"
                      >
                        <FaEye />
                      </a>
                      <button 
                        className="action-button edit" 
                        onClick={() => handleEditOrganization(org)}
                        title="Edit organization"
                      >
                        <FaEdit />
                      </button>
                      <button 
                        className={`action-button ${org.active ? 'deactivate' : 'activate'}`} 
                        onClick={() => handleToggleStatus(org)}
                        title={org.active ? 'Deactivate organization' : 'Activate organization'}
                      >
                        {org.active ? <FaToggleOff /> : <FaToggleOn />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-data">
            No organizations found matching your filters.
          </div>
        )}
      </div>
      
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{isEditing ? 'Edit Organization' : 'Add New Organization'}</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Organization Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter organization name"
                />
                {formErrors.name && <div className="error-message">{formErrors.name}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="code">Organization Code</label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="Enter organization code (lowercase letters, numbers, and hyphens only)"
                  disabled={isEditing}
                />
                {formErrors.code && <div className="error-message">{formErrors.code}</div>}
              </div>
              
              <div className="form-check">
                <input
                  type="checkbox"
                  id="active"
                  name="active"
                  checked={formData.active}
                  onChange={handleInputChange}
                />
                <label htmlFor="active">Organization is active</label>
              </div>
              
              <h3>Subscription Details</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="subscriptionTier">Subscription Tier</label>
                  <select
                    id="subscriptionTier"
                    name="subscriptionTier"
                    value={formData.subscriptionTier}
                    onChange={handleInputChange}
                  >
                    <option value="free">Free</option>
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="subscriptionStatus">Subscription Status</label>
                  <select
                    id="subscriptionStatus"
                    name="subscriptionStatus"
                    value={formData.subscriptionStatus}
                    onChange={handleInputChange}
                  >
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              
              <h3>Features</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="maxUsers">Maximum Users</label>
                  <input
                    type="number"
                    id="maxUsers"
                    name="maxUsers"
                    value={formData.maxUsers}
                    onChange={handleInputChange}
                    min="1"
                    placeholder="Enter maximum users allowed"
                  />
                  {formErrors.maxUsers && <div className="error-message">{formErrors.maxUsers}</div>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="maxCalls">Maximum Calls</label>
                  <input
                    type="number"
                    id="maxCalls"
                    name="maxCalls"
                    value={formData.maxCalls}
                    onChange={handleInputChange}
                    min="1"
                    placeholder="Enter maximum calls allowed"
                  />
                  {formErrors.maxCalls && <div className="error-message">{formErrors.maxCalls}</div>}
                </div>
              </div>
              
              <div className="form-check">
                <input
                  type="checkbox"
                  id="apiAccess"
                  name="apiAccess"
                  checked={formData.apiAccess}
                  onChange={handleInputChange}
                />
                <label htmlFor="apiAccess">Allow API Access</label>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="button-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="button-primary">
                  {isEditing ? 'Update Organization' : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationManagement; 