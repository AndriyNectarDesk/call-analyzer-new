import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/appleDesign.css';

const MasterAdminManagement = () => {
  const [masterAdmins, setMasterAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  
  // Form data for new master admin
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: ''
  });
  
  // Password reset data
  const [resetData, setResetData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchMasterAdmins();
  }, []);

  const fetchMasterAdmins = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const token = localStorage.getItem('auth_token');
      
      const response = await axios.get(`${apiUrl}/api/master-admin/master-admins`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setMasterAdmins(response.data);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching master admins:', err);
      setError('Failed to load master admin users');
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleResetInputChange = (e) => {
    const { name, value } = e.target;
    setResetData({
      ...resetData,
      [name]: value
    });
  };

  const validateForm = () => {
    if (!formData.email || !formData.firstName || !formData.lastName) {
      setError('All fields are required');
      return false;
    }
    
    return true;
  };

  const validateResetForm = () => {
    if (!resetData.newPassword || resetData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    
    if (resetData.newPassword !== resetData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const token = localStorage.getItem('auth_token');
      
      const response = await axios.post(
        `${apiUrl}/api/master-admin/master-admins`,
        {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Add the new master admin to the list
      setMasterAdmins([...masterAdmins, response.data]);
      
      // Reset form and close modal
      setFormData({
        email: '',
        firstName: '',
        lastName: ''
      });
      setShowAddModal(false);
      
      // Show success message
      setSuccess('Master Admin invitation sent successfully');
      setTimeout(() => setSuccess(''), 3000);
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error creating master admin:', err);
      setError(err.response?.data?.message || 'Failed to create Master Admin user');
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateResetForm()) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const token = localStorage.getItem('auth_token');
      
      await axios.post(
        `${apiUrl}/api/master-admin/master-admins/${selectedAdmin._id}/reset-password`,
        {
          newPassword: resetData.newPassword
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Reset form and close modal
      setResetData({
        newPassword: '',
        confirmPassword: ''
      });
      setShowResetModal(false);
      setSelectedAdmin(null);
      
      // Show success message
      setSuccess('Password reset successfully');
      setTimeout(() => setSuccess(''), 3000);
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error resetting password:', err);
      setError(err.response?.data?.message || 'Failed to reset password');
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (admin) => {
    try {
      setIsLoading(true);
      setError('');
      
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const token = localStorage.getItem('auth_token');
      
      const response = await axios.put(
        `${apiUrl}/api/master-admin/master-admins/${admin._id}`,
        {
          isActive: !admin.isActive
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Update the admin in the list
      setMasterAdmins(masterAdmins.map(item => 
        item._id === admin._id ? response.data : item
      ));
      
      // Show success message
      setSuccess(`User ${response.data.isActive ? 'activated' : 'deactivated'} successfully`);
      setTimeout(() => setSuccess(''), 3000);
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error updating master admin status:', err);
      setError(err.response?.data?.message || 'Failed to update user status');
      setIsLoading(false);
    }
  };

  const openResetModal = (admin) => {
    setSelectedAdmin(admin);
    setResetData({
      newPassword: '',
      confirmPassword: ''
    });
    setShowResetModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="admin-management">
      <div className="page-header">
        <h1>Master Admin Management</h1>
        <button 
          className="button"
          onClick={() => setShowAddModal(true)}
        >
          Add Master Admin
        </button>
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
      
      {isLoading && !error ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {masterAdmins.map(admin => (
                  <tr key={admin._id} className={!admin.isActive ? 'inactive-row' : ''}>
                    <td>{admin.firstName} {admin.lastName}</td>
                    <td>{admin.email}</td>
                    <td>
                      <span className={`status-badge ${admin.isActive ? 'active' : 'inactive'}`}>
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{formatDate(admin.lastLogin)}</td>
                    <td className="actions-cell">
                      <button 
                        className="button button-small"
                        onClick={() => openResetModal(admin)}
                        title="Reset Password"
                      >
                        Reset Password
                      </button>
                      <button 
                        className={`button button-small ${admin.isActive ? 'button-warning' : 'button-success'}`}
                        onClick={() => handleToggleStatus(admin)}
                        title={admin.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {admin.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
                {masterAdmins.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-table-message">
                      No master admin users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Add Master Admin Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add Master Admin</h2>
              <button 
                className="modal-close"
                onClick={() => setShowAddModal(false)}
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="input"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    className="input"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    className="input"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group info-message">
                <p>An invitation email will be sent to this address with instructions to set a password.</p>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button"
                  className="button button-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending Invitation...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Reset Password Modal */}
      {showResetModal && selectedAdmin && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Reset Password</h2>
              <button 
                className="modal-close"
                onClick={() => setShowResetModal(false)}
              >
                &times;
              </button>
            </div>
            
            <p>Reset password for {selectedAdmin.firstName} {selectedAdmin.lastName}</p>
            
            <form onSubmit={handleResetSubmit}>
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  className="input"
                  value={resetData.newPassword}
                  onChange={handleResetInputChange}
                  disabled={isLoading}
                  required
                  minLength={8}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  className="input"
                  value={resetData.confirmPassword}
                  onChange={handleResetInputChange}
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div className="form-actions">
                <button 
                  type="button"
                  className="button button-secondary"
                  onClick={() => setShowResetModal(false)}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterAdminManagement; 