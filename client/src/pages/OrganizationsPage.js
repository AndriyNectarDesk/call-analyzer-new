import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

const ApiKeyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15.75 6H9.75L8.25 7.5H3.75C3.35218 7.5 2.97064 7.65804 2.68934 7.93934C2.40804 8.22064 2.25 8.60218 2.25 9V14.25C2.25 14.6478 2.40804 15.0294 2.68934 15.3107C2.97064 15.592 3.35218 15.75 3.75 15.75H14.25C14.6478 15.75 15.0294 15.592 15.3107 15.3107C15.592 15.0294 15.75 14.6478 15.75 14.25V6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 12C6.82843 12 7.5 11.3284 7.5 10.5C7.5 9.67157 6.82843 9 6 9C5.17157 9 4.5 9.67157 4.5 10.5C4.5 11.3284 5.17157 12 6 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9.75 2.25L12.75 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.75 15.75V14.25C12.75 13.4544 12.4339 12.6913 11.8713 12.1287C11.3087 11.5661 10.5456 11.25 9.75 11.25H3.75C2.95435 11.25 2.19129 11.5661 1.62868 12.1287C1.06607 12.6913 0.75 13.4544 0.75 14.25V15.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6.75 8.25C8.40685 8.25 9.75 6.90685 9.75 5.25C9.75 3.59315 8.40685 2.25 6.75 2.25C5.09315 2.25 3.75 3.59315 3.75 5.25C3.75 6.90685 5.09315 8.25 6.75 8.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17.25 15.75V14.25C17.2495 13.5853 17.0283 12.9396 16.621 12.4142C16.2138 11.8889 15.6436 11.5137 15 11.3475" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 2.3475C12.6453 2.51273 13.2173 2.88803 13.6257 3.41439C14.0342 3.94075 14.2559 4.58804 14.2559 5.25425C14.2559 5.92046 14.0342 6.56775 13.6257 7.09411C13.2173 7.62047 12.6453 7.99577 12 8.1625" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const OrganizationsPage = () => {
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Fetch organizations data
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setIsLoading(true);
        
        const apiUrl = process.env.REACT_APP_API_URL || '';
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
          setError('Authentication token not found. Please log in again.');
          setIsLoading(false);
          return;
        }
        
        // Call the same endpoint as the Master Admin Dashboard to ensure consistency
        const response = await axios.get(`${apiUrl}/api/master-admin/organizations`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('Organizations API response:', response.data);
        setOrganizations(response.data);
        setIsLoading(false);
      } catch (err) {
        console.error('Full error:', err);
        let errorMessage = 'Failed to load organizations';
        
        if (err.response) {
          errorMessage += `: ${err.response.status} - ${err.response.data?.message || err.response.data?.error || JSON.stringify(err.response.data)}`;
        }
        
        setError(errorMessage);
        setIsLoading(false);
      }
    };
    
    fetchOrganizations();
  }, []);
  
  // Format date as MM/DD/YYYY
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };
  
  // Helper function to get badge class based on subscription tier
  const getTierBadgeClass = (tier) => {
    if (!tier) return 'secondary';
    
    switch (tier.toLowerCase()) {
      case 'premium':
      case 'enterprise':
        return 'success';
      case 'professional':
      case 'business':
        return 'primary';
      case 'basic':
        return 'secondary';
      case 'trial':
        return 'warning';
      default:
        return 'secondary';
    }
  };
  
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Organizations</h1>
        <Link to="/organizations/new" className="button">
          <PlusIcon /> New Organization
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
          <p>Loading organizations...</p>
        </div>
      ) : (
        <div className="organizations-container">
          <div className="organizations-table">
            <div className="table-header">
              <div className="header-cell name-cell">Organization</div>
              <div className="header-cell tier-cell">Tier</div>
              <div className="header-cell users-cell">Users</div>
              <div className="header-cell date-cell">Created</div>
              <div className="header-cell actions-cell">Actions</div>
            </div>
            
            {organizations.length === 0 ? (
              <div className="empty-state">
                <p>No organizations found</p>
                <Link to="/organizations/new" className="button button-secondary">
                  Create your first organization
                </Link>
              </div>
            ) : (
              organizations.map(org => (
                <div key={org._id} className="table-row">
                  <div className="cell name-cell">
                    <Link to={`/organizations/${org._id}`} className="org-name-link">
                      <span className="org-name">{org.name}</span>
                      <span className="org-code">{org.code}</span>
                    </Link>
                  </div>
                  <div className="cell tier-cell">
                    <span className={`badge badge-${getTierBadgeClass(org.subscriptionTier)}`}>
                      {org.subscriptionTier || 'free'}
                    </span>
                  </div>
                  <div className="cell users-cell">
                    {org.usageStats?.totalUsers || 0}
                  </div>
                  <div className="cell date-cell">
                    {formatDate(org.createdAt)}
                  </div>
                  <div className="cell actions-cell">
                    <div className="actions-buttons">
                      <Link to={`/organizations/${org._id}/edit`} className="action-button" title="Edit Organization">
                        <EditIcon />
                      </Link>
                      <Link to={`/organizations/${org._id}/api-keys`} className="action-button" title="Manage API Keys">
                        <ApiKeyIcon />
                      </Link>
                      <Link to={`/organizations/${org._id}/users`} className="action-button" title="Manage Users">
                        <UsersIcon />
                      </Link>
                      <Link to={`/organizations/${org._id}`} className="action-button" title="View Details">
                        <ChevronRightIcon />
                      </Link>
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
          align-items: center;
          margin-bottom: var(--spacing-lg);
        }
        
        .page-header h1 {
          margin: 0;
        }
        
        .organizations-container {
          background-color: var(--card-background);
          border-radius: var(--border-radius-md);
          box-shadow: var(--shadow-md);
          overflow: hidden;
        }
        
        .organizations-table {
          width: 100%;
          border-collapse: collapse;
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
        
        .cell {
          padding: 16px;
          display: flex;
          align-items: center;
        }
        
        .name-cell {
          flex: 3;
          min-width: 200px;
        }
        
        .tier-cell, .users-cell, .date-cell {
          flex: 1;
          min-width: 100px;
        }
        
        .actions-cell {
          flex: 1;
          min-width: 150px;
          justify-content: flex-end;
        }
        
        .org-name-link {
          display: flex;
          flex-direction: column;
          color: var(--apple-black);
          text-decoration: none;
        }
        
        .org-name {
          font-weight: 500;
          margin-bottom: 4px;
        }
        
        .org-code {
          font-size: 13px;
          color: var(--apple-mid-gray);
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

export default OrganizationsPage;