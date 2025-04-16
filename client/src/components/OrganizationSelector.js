import React, { useState, useEffect, useRef } from 'react';
import '../styles/appleDesign.css';

// Organization selector icon (building)
const BuildingIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 3V7C14 7.26522 13.8946 7.51957 13.7071 7.70711C13.5196 7.89464 13.2652 8 13 8H8M8 8V4C8 3.73478 8.10536 3.48043 8.29289 3.29289C8.48043 3.10536 8.73478 3 9 3H17C17.2652 3 17.5196 3.10536 17.7071 3.29289C17.8946 3.48043 18 3.73478 18 4V16C18 16.2652 17.8946 16.5196 17.7071 16.7071C17.5196 16.8946 17.2652 17 17 17H9C8.73478 17 8.48043 16.8946 8.29289 16.7071C8.10536 16.5196 8 16.2652 8 16V8ZM8 8H3C2.73478 8 2.48043 7.89464 2.29289 7.70711C2.10536 7.51957 2 7.26522 2 7V4C2 3.73478 2.10536 3.48043 2.29289 3.29289C2.48043 3.10536 2.73478 3 3 3H6C6.26522 3 6.51957 3.10536 6.70711 3.29289C6.89464 3.48043 7 3.73478 7 4V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Chevron down icon
const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const OrganizationSelector = ({ 
  currentOrganization, 
  organizations = [], 
  onSelectOrganization,
  isMasterAdmin = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle organization selection
  const handleSelect = (org) => {
    console.log('Organization selected:', org.name, org._id);
    if (onSelectOrganization) {
      onSelectOrganization(org);
    }
    setIsOpen(false);
  };

  if (!currentOrganization && organizations.length === 0) {
    return null;
  }

  return (
    <div className="org-selector-container" ref={dropdownRef}>
      <button 
        className="org-selector-button" 
        onClick={() => setIsOpen(!isOpen)}
        disabled={!isMasterAdmin && organizations.length <= 1}
      >
        <BuildingIcon />
        <span className="org-name">{currentOrganization?.name || 'Select Organization'}</span>
        {(isMasterAdmin || organizations.length > 1) && <ChevronDownIcon />}
      </button>
      
      {isOpen && (
        <div className="org-dropdown">
          {organizations.map((org) => (
            <div 
              key={org._id} 
              className={`org-option ${currentOrganization?._id === org._id ? 'active' : ''}`}
              onClick={() => handleSelect(org)}
            >
              <span className="org-option-name">{org.name}</span>
              {org.subscriptionTier && (
                <span className={`badge badge-${getTierBadgeClass(org.subscriptionTier)}`}>
                  {org.subscriptionTier}
                </span>
              )}
            </div>
          ))}
          
          {isMasterAdmin && (
            <>
              <div className="org-dropdown-divider"></div>
              <div className="org-option create-new" onClick={() => window.location.href = '/organizations/new'}>
                <span>+ Create New Organization</span>
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Additional styling */}
      <style jsx>{`
        .org-selector-container {
          position: relative;
          margin-right: var(--spacing-md);
        }
        
        .org-selector-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background-color: transparent;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-pill);
          color: var(--apple-black);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .org-selector-button:hover {
          background-color: var(--apple-light-gray);
        }
        
        .org-selector-button:disabled {
          opacity: 0.6;
          cursor: default;
        }
        
        .org-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          min-width: 220px;
          background-color: var(--card-background);
          border-radius: var(--border-radius-md);
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          z-index: 100;
          animation: dropdownFadeIn 0.2s ease-out;
        }
        
        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .org-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }
        
        .org-option:hover {
          background-color: var(--apple-light-gray);
        }
        
        .org-option.active {
          background-color: rgba(0, 113, 227, 0.1);
          color: var(--primary-color);
        }
        
        .org-dropdown-divider {
          height: 1px;
          background-color: var(--border-color);
          margin: 4px 0;
        }
        
        .create-new {
          color: var(--primary-color);
          font-weight: 500;
        }
        
        .badge {
          font-size: 10px;
          padding: 2px 6px;
        }
      `}</style>
    </div>
  );
};

// Helper function to get badge class based on subscription tier
const getTierBadgeClass = (tier) => {
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

export default OrganizationSelector; 