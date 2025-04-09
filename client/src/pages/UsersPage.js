import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/appleDesign.css';

// Icons
const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.25 3.75H3.75C3.35218 3.75 2.97064 3.90804 2.68934 4.18934C2.40804 4.47064 2.25 4.85218 2.25 5.25V14.25C2.25 14.6478 2.40804 15.0294 2.68934 15.3107C2.97064 15.592 3.35218 15.75 3.75 15.75H12.75C13.1478 15.75 13.5294 15.592 13.8107 15.3107C14.092 15.0294 14.25 14.6478 14.25 14.25V9.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13.125 2.62501C13.4234 2.32663 13.8359 2.15991 14.25 2.15991C14.6641 2.15991 15.0766 2.32663 15.375 2.62501C15.6734 2.92339 15.8401 3.33589 15.8401 3.75001C15.8401 4.16414 15.6734 4.57664 15.375 4.87501L9 11.25L6 12L6.75 9.00001L13.125 2.62501Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.25 4.5H3.75H15.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 4.5V3C6 2.60218 6.15804 2.22064 6.43934 1.93934C6.72064 1.65804 7.10218 1.5 7.5 1.5H10.5C10.8978 1.5 11.2794 1.65804 11.5607 1.93934C11.842 2.22064 12 2.60218 12 3V4.5M14.25 4.5V15C14.25 15.3978 14.092 15.7794 13.8107 16.0607C13.5294 16.342 13.1478 16.5 12.75 16.5H5.25C4.85218 16.5 4.47064 16.342 4.18934 16.0607C3.90804 15.7794 3.75 15.3978 3.75 15V4.5H14.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ResetIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.5 1.5V6.75H11.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14.7822 10.875C14.2173 12.4792 13.0526 13.8042 11.5274 14.5926C10.0022 15.3811 8.23106 15.5784 6.56789 15.1453C4.90472 14.7122 3.47198 13.6778 2.56927 12.2403C1.66656 10.8028 1.36164 9.07096 1.7156 7.40872C2.06955 5.74649 3.05345 4.2845 4.43833 3.31167C5.82321 2.33885 7.51329 1.92664 9.17891 2.15186C10.8445 2.37709 12.3605 3.22325 13.4261 4.52417C14.4917 5.82509 15.031 7.48677 14.9441 9.17997" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UsersPage = () => {
  const { organizationId } = useParams();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [organization, setOrganization] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState(null);
  const [resetUserName, setResetUserName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  
  // Fetch users data
  useEffect(() => {
    fetchUsers();
  }, [organizationId]);
  
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setIsLoading(false);
        return;
      }
      
      // Fetch organization details and users from the master-admin endpoint
      const response = await axios.get(`${apiUrl}/api/master-admin/organizations/${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Organization and users data:', response.data);
      
      if (response.data.organization) {
        setOrganization(response.data.organization);
      }
      
      if (response.data.users) {
        setUsers(response.data.users);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Full error:', err);
      let errorMessage = 'Failed to load users';
      
      if (err.response) {
        errorMessage += `: ${err.response.status} - ${err.response.data?.message || err.response.data?.error || JSON.stringify(err.response.data)}`;
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };
  
  const handleOpenResetModal = (userId, firstName, lastName) => {
    setResetUserId(userId);
    setResetUserName(`${firstName} ${lastName}`);
    setNewPassword('');
    setConfirmPassword('');
    setResetError('');
    setShowResetModal(true);
  };
  
  const handleCloseResetModal = () => {
    setShowResetModal(false);
    setResetUserId(null);
    setResetUserName('');
    setNewPassword('');
    setConfirmPassword('');
    setResetError('');
  };
  
  const handleResetPassword = async () => {
    if (!newPassword) {
      setResetError('Password is required');
      return;
    }
    
    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }
    
    setResetLoading(true);
    setResetError('');
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const token = localStorage.getItem('auth_token');
      
      await axios.post(
        `${apiUrl}/api/master-admin/organizations/${organizationId}/users/${resetUserId}/reset-password`,
        { newPassword },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      setShowResetModal(false);
      setSuccess(`Password for ${resetUserName} has been reset`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (err) {
      console.error('Error resetting password:', err);
      let errorMessage = 'Failed to reset password';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setResetError(errorMessage);
    } finally {
      setResetLoading(false);
    }
  };
  
  // Format date as MM/DD/YYYY HH:MM AM/PM
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    
    return `${formattedDate} ${hours}:${minutes} ${ampm}`;
  };
  
  // Get role badge class
  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin':
        return 'primary';
      case 'manager':
        return 'success';
      default:
        return 'secondary';
    }
  };
  
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Users</h1>
          {organization && (
            <p className="organization-context">
              {organization.name} 
              <span className={`badge badge-${organization.subscriptionTier === 'enterprise' ? 'success' : 'primary'}`}>
                {organization.subscriptionTier || 'free'}
              </span>
            </p>
          )}
        </div>
        <Link to={`/organizations/${organizationId}/users/new`} className="button">
          <PlusIcon /> Add User
        </Link>
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
      
      {isLoading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading users...</p>
        </div>
      ) : (
        <div className="users-container">
          <div className="users-table">
            <div className="table-header">
              <div className="header-cell name-cell">User</div>
              <div className="header-cell role-cell">Role</div>
              <div className="header-cell status-cell">Status</div>
              <div className="header-cell login-cell">Last Login</div>
              <div className="header-cell actions-cell">Actions</div>
            </div>
            
            {users.length === 0 ? (
              <div className="empty-state">
                <p>No users found</p>
                <Link to={`/organizations/${organizationId}/users/new`} className="button button-secondary">
                  Add your first user
                </Link>
              </div>
            ) : (
              users.map(user => (
                <div key={user._id} className={`table-row ${!user.isActive ? 'inactive-row' : ''}`}>
                  <div className="cell name-cell">
                    <div className="user-info">
                      <div className="user-avatar">
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </div>
                      <div className="user-details">
                        <div className="user-name">{user.firstName} {user.lastName}</div>
                        <div className="user-email">{user.email}</div>
                      </div>
                    </div>
                  </div>
                  <div className="cell role-cell">
                    <span className={`badge badge-${getRoleBadgeClass(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                  <div className="cell status-cell">
                    <span className={`status-indicator ${user.isActive ? 'active' : 'inactive'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="cell login-cell">
                    {formatDate(user.lastLogin)}
                  </div>
                  <div className="cell actions-cell">
                    <div className="actions-buttons">
                      <Link to={`/organizations/${organizationId}/users/${user._id}/edit`} className="action-button" title="Edit User">
                        <EditIcon />
                      </Link>
                      <button 
                        className="action-button" 
                        title="Reset Password" 
                        onClick={() => handleOpenResetModal(user._id, user.firstName, user.lastName)}
                      >
                        <ResetIcon />
                      </button>
                      <button className="action-button danger" title="Deactivate User">
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Reset Password</h2>
              <button className="modal-close" onClick={handleCloseResetModal}>×</button>
            </div>
            <div className="modal-body">
              <p>Enter a new password for <strong>{resetUserName}</strong>:</p>
              
              {resetError && (
                <div className="error-message">
                  {resetError}
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input"
                  placeholder="Enter new password"
                  disabled={resetLoading}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                  placeholder="Confirm new password"
                  disabled={resetLoading}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="button button-secondary" 
                onClick={handleCloseResetModal}
                disabled={resetLoading}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="button" 
                onClick={handleResetPassword}
                disabled={resetLoading}
              >
                {resetLoading ? (
                  <>
                    <span className="spinner-small"></span>
                    <span>Resetting...</span>
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Additional CSS */}
      <style jsx>{`
        .success-message {
          background-color: rgba(52, 199, 89, 0.1);
          border-radius: var(--border-radius-md);
          color: var(--success-color);
          padding: 12px 16px;
          margin-bottom: 20px;
          animation: fadeIn 0.3s ease-out;
        }
        
        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .modal {
          background: var(--card-background);
          border-radius: var(--border-radius-lg);
          box-shadow: var(--shadow-lg);
          width: 100%;
          max-width: 500px;
          animation: modalFadeIn 0.3s;
        }
        
        @keyframes modalFadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-bottom: 1px solid var(--border-color);
        }
        
        .modal-header h2 {
          margin: 0;
          font-size: 18px;
        }
        
        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: var(--text-muted);
        }
        
        .modal-body {
          padding: 24px;
        }
        
        .modal-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        
        .spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
          margin-right: 8px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default UsersPage; 