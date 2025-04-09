import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/appleDesign.css';

const NewOrganizationPage = () => {
  const navigate = useNavigate();
  const [organization, setOrganization] = useState({
    name: '',
    code: '',
    contactEmail: '',
    description: '',
    subscriptionTier: 'basic'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Auto-generate code from name if code field is empty
    if (name === 'name' && !organization.code) {
      const code = value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20);
      
      setOrganization(prevState => ({
        ...prevState,
        [name]: value,
        code
      }));
    } else {
      setOrganization(prevState => ({
        ...prevState,
        [name]: value
      }));
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!organization.name) {
      setError('Organization name is required');
      return;
    }
    
    if (!organization.code) {
      setError('Organization code is required');
      return;
    }
    
    if (!organization.contactEmail) {
      setError('Contact email is required');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Would be replaced with actual API call in real implementation
      // const response = await fetch('/api/organizations', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify(organization)
      // });
      // 
      // if (!response.ok) {
      //   throw new Error('Failed to create organization');
      // }
      // 
      // const data = await response.json();
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect to organizations list
      navigate('/organizations');
    } catch (err) {
      setError(err.message || 'Failed to create organization');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>New Organization</h1>
        <Link to="/organizations" className="button button-subtle">
          Cancel
        </Link>
      </div>
      
      <div className="form-container">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-card">
            <div className="form-section">
              <h2>Organization Information</h2>
              
              <div className="form-group">
                <label htmlFor="name">Organization Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="input"
                  value={organization.name}
                  onChange={handleChange}
                  placeholder="Enter organization name"
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="code">
                  Organization Code * 
                  <span className="field-hint">(Used for API and identification)</span>
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  className="input"
                  value={organization.code}
                  onChange={handleChange}
                  placeholder="Enter organization code"
                  disabled={isLoading}
                  pattern="[a-z0-9]+"
                  title="Lowercase letters and numbers only, no spaces or special characters"
                  required
                />
                <span className="field-description">
                  Lowercase letters and numbers only, no spaces or special characters
                </span>
              </div>
              
              <div className="form-group">
                <label htmlFor="contactEmail">Contact Email *</label>
                <input
                  type="email"
                  id="contactEmail"
                  name="contactEmail"
                  className="input"
                  value={organization.contactEmail}
                  onChange={handleChange}
                  placeholder="Enter contact email"
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  className="textarea"
                  value={organization.description}
                  onChange={handleChange}
                  placeholder="Enter organization description"
                  disabled={isLoading}
                  rows="4"
                />
              </div>
            </div>
          </div>
          
          <div className="form-card">
            <div className="form-section">
              <h2>Subscription Details</h2>
              
              <div className="form-group">
                <label htmlFor="subscriptionTier">Subscription Tier</label>
                <select
                  id="subscriptionTier"
                  name="subscriptionTier"
                  className="select"
                  value={organization.subscriptionTier}
                  onChange={handleChange}
                  disabled={isLoading}
                >
                  <option value="trial">Trial (14 days)</option>
                  <option value="basic">Basic</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              
              <div className="subscription-features">
                {organization.subscriptionTier === 'trial' && (
                  <ul className="feature-list">
                    <li>14-day access to all features</li>
                    <li>5 users maximum</li>
                    <li>Standard support</li>
                    <li>1,000 transcripts per month</li>
                  </ul>
                )}
                
                {organization.subscriptionTier === 'basic' && (
                  <ul className="feature-list">
                    <li>10 users maximum</li>
                    <li>Standard support</li>
                    <li>5,000 transcripts per month</li>
                    <li>Basic analytics</li>
                  </ul>
                )}
                
                {organization.subscriptionTier === 'professional' && (
                  <ul className="feature-list">
                    <li>50 users maximum</li>
                    <li>Priority support</li>
                    <li>20,000 transcripts per month</li>
                    <li>Advanced analytics</li>
                    <li>Custom call types</li>
                  </ul>
                )}
                
                {organization.subscriptionTier === 'enterprise' && (
                  <ul className="feature-list">
                    <li>Unlimited users</li>
                    <li>Dedicated support</li>
                    <li>Unlimited transcripts</li>
                    <li>Premium analytics</li>
                    <li>Custom call types</li>
                    <li>White-label solution</li>
                    <li>API access</li>
                  </ul>
                )}
              </div>
            </div>
          </div>
          
          <div className="form-actions">
            <Link to="/organizations" className="button button-subtle">
              Cancel
            </Link>
            <button
              type="submit"
              className="button"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-small"></span>
                  <span>Creating...</span>
                </>
              ) : (
                'Create Organization'
              )}
            </button>
          </div>
        </form>
      </div>
      
      {/* Additional styling */}
      <style jsx>{`
        .page-container {
          max-width: 800px;
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
        
        .form-container {
          margin-bottom: var(--spacing-xxl);
        }
        
        .form-card {
          background-color: var(--card-background);
          border-radius: var(--border-radius-md);
          box-shadow: var(--shadow-md);
          margin-bottom: var(--spacing-lg);
          overflow: hidden;
        }
        
        .form-section {
          padding: var(--spacing-lg);
        }
        
        .form-section h2 {
          font-size: 18px;
          margin-top: 0;
          margin-bottom: var(--spacing-lg);
          padding-bottom: var(--spacing-xs);
          border-bottom: 1px solid var(--border-color);
        }
        
        .form-group {
          margin-bottom: var(--spacing-md);
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
        }
        
        .field-hint {
          font-weight: normal;
          font-size: 13px;
          color: var(--apple-mid-gray);
          margin-left: 8px;
        }
        
        .field-description {
          font-size: 13px;
          color: var(--apple-mid-gray);
          margin-top: 6px;
          display: block;
        }
        
        .subscription-features {
          margin-top: var(--spacing-md);
        }
        
        .feature-list {
          list-style-type: none;
          padding: 0;
          margin: 0;
        }
        
        .feature-list li {
          padding: 8px 0;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
        }
        
        .feature-list li:last-child {
          border-bottom: none;
        }
        
        .feature-list li:before {
          content: "✓";
          color: var(--success-color);
          margin-right: 8px;
          font-weight: bold;
        }
        
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--spacing-md);
          margin-top: var(--spacing-lg);
        }
        
        .spinner-small {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: 8px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default NewOrganizationPage; 