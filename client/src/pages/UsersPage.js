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
  const [organization, setOrganization] = useState(null);
  
  // Fetch users data
  useEffect(() => {
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
    
    fetchUsers();
  }, [organizationId]);
  
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
                      <button className="action-button" title="Reset Password">
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
      
      {/* Additional styling */}
      <style jsx>{`
        .page-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: var(--spacing-lg);
        }
        
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--spacing-lg);
        }
        
        .page-header h1 {
          margin: 0;
          margin-bottom: var(--spacing-xs);
        }
        
        .organization-context {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          color: var(--apple-mid-gray);
          margin: 0;
        }
        
        .users-container {
          background-color: var(--card-background);
          border-radius: var(--border-radius-md);
          box-shadow: var(--shadow-md);
          overflow: hidden;
        }
        
        .users-table {
          width: 100%;
        }
        
        .table-header {
          display: flex;
          background-color: var(--background-secondary);
          border-bottom: 1px solid var(--border-color);
          font-weight: 500;
          font-size: 14px;
        }
        
        .header-cell {
          padding: 16px;
          color: var(--apple-mid-gray);
        }
        
        .table-row {
          display: flex;
          border-bottom: 1px solid var(--border-color);
          transition: background-color var(--transition-fast);
        }
        
        .table-row:last-child {
          border-bottom: none;
        }
        
        .table-row:hover {
          background-color: var(--background-secondary);
        }
        
        .inactive-row {
          opacity: 0.6;
        }
        
        .cell {
          padding: 16px;
          display: flex;
          align-items: center;
        }
        
        .name-cell {
          flex: 3;
          min-width: 200px;
        }
        
        .role-cell, .status-cell {
          flex: 1;
          min-width: 100px;
        }
        
        .login-cell {
          flex: 2;
          min-width: 180px;
        }
        
        .actions-cell {
          flex: 1;
          min-width: 150px;
          justify-content: flex-end;
        }
        
        .user-info {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }
        
        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: var(--primary-color);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 500;
          font-size: 14px;
        }
        
        .user-details {
          display: flex;
          flex-direction: column;
        }
        
        .user-name {
          font-weight: 500;
          margin-bottom: 2px;
        }
        
        .user-email {
          font-size: 13px;
          color: var(--apple-mid-gray);
        }
        
        .status-indicator {
          display: inline-flex;
          align-items: center;
          font-size: 14px;
        }
        
        .status-indicator:before {
          content: "";
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 6px;
        }
        
        .status-indicator.active:before {
          background-color: var(--success-color);
        }
        
        .status-indicator.inactive:before {
          background-color: var(--apple-mid-gray);
        }
        
        .actions-buttons {
          display: flex;
          gap: 8px;
        }
        
        .action-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: var(--border-radius-sm);
          color: var(--apple-mid-gray);
          background-color: transparent;
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .action-button:hover {
          background-color: var(--apple-light-gray);
          color: var(--primary-color);
        }
        
        .empty-state {
          padding: var(--spacing-xl);
          text-align: center;
          color: var(--apple-mid-gray);
        }
        
        .empty-state p {
          margin-bottom: var(--spacing-md);
        }
        
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-xl);
          text-align: center;
          color: var(--apple-mid-gray);
        }
        
        .spinner {
          margin-bottom: var(--spacing-md);
        }
      `}</style>
    </div>
  );
};

export default UsersPage; 