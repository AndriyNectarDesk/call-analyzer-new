import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './TranscriptHistory.css'; // Reuse existing CSS

function NewTranscriptHistory() {
  // State management
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterOrganization, setFilterOrganization] = useState('');
  const [filteredTranscripts, setFilteredTranscripts] = useState([]);
  const [organizations, setOrganizations] = useState([]);

  // Initialize component on mount
  useEffect(() => {
    initializeComponent();
  }, []);

  // Fetch data when page changes
  useEffect(() => {
    if (user && organization) {
      fetchTranscripts();
    }
  }, [page, user, organization]);

  // Filter transcripts when filter changes
  useEffect(() => {
    if (!filterOrganization) {
      setFilteredTranscripts(transcripts);
    } else {
      setFilteredTranscripts(
        transcripts.filter(t => t.organizationId && t.organizationId.name === filterOrganization)
      );
    }
  }, [filterOrganization, transcripts]);

  // Initialize component with authentication
  const initializeComponent = async () => {
    try {
      setLoading(true);
      const authToken = localStorage.getItem('auth_token');
      
      if (!authToken) {
        redirectToLogin('No authentication token found');
        return;
      }
      
      // Decode token to check expiration
      try {
        const payload = parseJwt(authToken);
        const tokenExp = payload.exp * 1000;
        
        if (Date.now() > tokenExp) {
          redirectToLogin('Authentication token expired');
          return;
        }
        
        // Set user from token payload
        setUser({
          id: payload.userId,
          email: payload.email,
          isMasterAdmin: payload.isMasterAdmin || false,
          role: payload.role || 'user',
          organizationId: payload.organizationId
        });
      } catch (err) {
        console.error('Error parsing token:', err);
        redirectToLogin('Invalid authentication token');
        return;
      }
      
      // Get organization from localStorage or fallback to API
      const orgData = localStorage.getItem('selectedOrganization');
      
      if (orgData) {
        try {
          const parsedOrg = JSON.parse(orgData);
          setOrganization({
            _id: parsedOrg._id || parsedOrg.id,
            id: parsedOrg.id || parsedOrg._id,
            name: parsedOrg.name,
            code: parsedOrg.code
          });
        } catch (err) {
          console.error('Error parsing organization data:', err);
          fetchOrganizationFromAPI(authToken);
        }
      } else {
        fetchOrganizationFromAPI(authToken);
      }
    } catch (err) {
      console.error('Error initializing component:', err);
      setError('Failed to initialize. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };
  
  // Helper to parse JWT
  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      return JSON.parse(jsonPayload);
    } catch (err) {
      console.error('Error parsing JWT:', err);
      throw new Error('Invalid token format');
    }
  };
  
  // Fetch organization from API 
  const fetchOrganizationFromAPI = async (token) => {
    try {
      const response = await axios.get('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data && response.data.organization) {
        const org = response.data.organization;
        setOrganization({
          _id: org._id || org.id,
          id: org.id || org._id,
          name: org.name,
          code: org.code
        });
        
        // Save to localStorage
        localStorage.setItem('selectedOrganization', JSON.stringify(org));
      } else {
        throw new Error('No organization data returned from API');
      }
    } catch (err) {
      console.error('Error fetching organization:', err);
      setError('Failed to fetch organization data. Please try logging in again.');
    }
  };

  // Redirect to login
  const redirectToLogin = (reason) => {
    console.warn(`Redirecting to login: ${reason}`);
    // Clear potentially invalid data
    localStorage.removeItem('auth_token');
    
    // Set error to inform user
    setError(`Authentication error: ${reason}. Please log in again.`);
    
    // Redirect after a short delay
    setTimeout(() => {
      window.location.href = '/login';
    }, 1500);
  };

  // Main function to fetch transcripts
  const fetchTranscripts = async () => {
    setLoading(true);
    try {
      const authToken = localStorage.getItem('auth_token');
      
      if (!authToken) {
        redirectToLogin('Missing authentication token');
        return;
      }
      
      // Check if Master Organization
      const isMasterOrg = checkIfMasterOrganization();
      
      // Construct URL
      let url = `/api/transcripts?page=${page}&limit=10`;
      
      // Add organization filter based on master org status
      if (!isMasterOrg && organization && organization._id) {
        url += `&organizationId=${organization._id}`;
      }
      
      // Set up headers
      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/json'
      };
      
      // Make the request
      console.log('Fetching transcripts:', url);
      const response = await axios.get(url, { headers });
      
      // Verify content type
      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }
      
      // Process response
      console.log('API response:', response.data);
      
      if (response.data.transcripts && Array.isArray(response.data.transcripts)) {
        setTranscripts(response.data.transcripts);
        setTotalPages(response.data.pagination?.pages || 1);
        
        // Extract unique organization names for filtering
        if (isMasterOrg) {
          const orgNames = [...new Set(
            response.data.transcripts
              .filter(t => t.organizationId && t.organizationId.name)
              .map(t => t.organizationId.name)
          )];
          setOrganizations(orgNames);
        }
      } else if (response.data.data && Array.isArray(response.data.data)) {
        // Handle alternative response format
        setTranscripts(response.data.data);
        setTotalPages(response.data.totalPages || response.data.meta?.totalPages || 1);
        
        // Extract unique organization names for filtering
        if (isMasterOrg) {
          const orgNames = [...new Set(
            response.data.data
              .filter(t => t.organizationId && t.organizationId.name)
              .map(t => t.organizationId.name)
          )];
          setOrganizations(orgNames);
        }
      } else {
        throw new Error('Unexpected API response format');
      }
    } catch (err) {
      console.error('Error fetching transcripts:', err);
      
      // Handle specific error types
      if (err.response) {
        if (err.response.status === 401 || err.response.status === 403) {
          redirectToLogin('Authentication failed');
        } else {
          setError(`API error: ${err.response.status} ${err.response.statusText}`);
        }
      } else if (err.message.includes('non-JSON')) {
        setError('Server returned an invalid response. This might be due to an authentication issue.');
      } else {
        setError(err.message || 'Failed to fetch transcripts');
      }
    } finally {
      setLoading(false);
    }
  };

  // Check if the current organization is the master organization
  const checkIfMasterOrganization = () => {
    if (!organization) return false;
    
    const orgName = (organization.name || '').toLowerCase();
    const orgCode = (organization.code || '').toLowerCase();
    const orgId = organization._id || organization.id || '';
    
    // Check various indicators of master organization
    const isMasterByName = orgName.includes('master') || 
                          orgName === 'master organization' ||
                          orgName.includes('nectar desk');
    const isMasterByCode = orgCode === 'master-org' || 
                          orgCode === 'master' || 
                          orgCode.includes('master');
    const knownMasterOrgIds = ['64d5ece33f7443afa6b684d2', '67f6a38454aeb791d5665e59'];
    const isMasterById = knownMasterOrgIds.includes(orgId);
    
    return isMasterByName || isMasterByCode || isMasterById || (user && user.isMasterAdmin);
  };

  // Handle refresh button
  const handleRefresh = () => {
    window.location.reload();
  };

  // Handle logout button
  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('selectedOrganization');
    window.location.href = '/login';
  };

  // Get human-readable call type label
  const getCallTypeLabel = (type) => {
    switch(type) {
      case 'flower': return 'Flower Shop';
      case 'hearing': return 'Hearing Aid Clinic';
      case 'auto': return 'Auto-detected';
      default: return type || 'Auto-detected';
    }
  };
  
  // Get badge class for call type
  const getCallTypeBadgeClass = (type) => {
    switch(type) {
      case 'flower': return 'badge-flower';
      case 'hearing': return 'badge-hearing';
      default: return 'badge-auto';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading transcripts...</p>
      </div>
    );
  }

  // Render component
  return (
    <div className="history-container">
      <div className="welcome-banner">
        <div>
          <h3>Welcome to the New Transcript History</h3>
          <p>This is our improved history page with better performance and reliability. We've rebuilt it from the ground up to provide a better experience.</p>
        </div>
        <Link to="/history" className="old-version-link">Return to classic version</Link>
      </div>
      <h2>Transcript History</h2>
      
      {/* Organization filter for master organization */}
      {checkIfMasterOrganization() && organizations.length > 0 && (
        <div className="filter-controls">
          <div className="filter-group">
            <label htmlFor="organizationFilter"><strong>Filter by Organization:</strong></label>
            <select 
              id="organizationFilter" 
              value={filterOrganization} 
              onChange={(e) => setFilterOrganization(e.target.value)}
              className="organization-filter"
            >
              <option value="">All Organizations ({organizations.length} orgs available)</option>
              {organizations.map(org => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <div className="error-actions">
            <button className="refresh-button" onClick={handleRefresh}>
              Refresh Page
            </button>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      )}
      
      {/* Empty state */}
      {!error && filteredTranscripts.length === 0 ? (
        <div>
          <p>No transcript analysis history found.</p>
          <button 
            className="refresh-button"
            onClick={fetchTranscripts}
          >
            Refresh Transcripts
          </button>
        </div>
      ) : (
        /* Transcript list */
        <div className="transcript-list">
          {filteredTranscripts.map(transcript => (
            <div key={transcript._id} className="transcript-card">
              <div className="card-header">
                <span className="date">
                  {new Date(transcript.createdAt).toLocaleString()}
                </span>
                <span className="score">
                  Overall Score: {transcript.analysis.scorecard.overallScore}/10
                </span>
                <span className="transcript-id">
                  ID: {transcript._id}
                </span>
                <span className={`source-badge ${
                  transcript.source === 'api' ? 'badge-api' : 
                  transcript.source === 'audio' ? 'badge-audio' : 
                  transcript.source === 'nectar-desk-webhook' ? 'badge-nectar-desk' : 
                  'badge-auto'
                }`}>
                  {
                    transcript.source === 'api' ? 'API' : 
                    transcript.source === 'audio' ? 'Audio Upload' : 
                    transcript.source === 'nectar-desk-webhook' ? 'NectarDesk' : 
                    'Web UI'
                  }
                </span>
                <span className={`call-type-badge ${getCallTypeBadgeClass(transcript.callType)}`}>
                  {getCallTypeLabel(transcript.callType)}
                </span>
                {/* Organization badge */}
                {transcript.organizationId && transcript.organizationId.name && (
                  <span className="organization-badge">
                    Org: {transcript.organizationId.name}
                  </span>
                )}
              </div>
              
              <div className="card-summary">
                <p>
                  <strong>
                    {transcript.callType === 'hearing' ? 'Patient:' : 'Customer:'}
                  </strong> {
                    transcript.callType === 'hearing' 
                      ? transcript.analysis.callSummary.patientName
                      : transcript.analysis.callSummary.customerName
                  }
                </p>
                <p>
                  <strong>Agent:</strong> {transcript.analysis.callSummary.agentName || 'Unknown'}
                </p>
                <p className="truncate">
                  {transcript.rawTranscript.substring(0, 150)}...
                </p>
              </div>
              
              <Link 
                to={`/transcript/${transcript._id}`} 
                className="view-button"
              >
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}
      
      {/* Pagination */}
      {filteredTranscripts.length > 0 && (
        <div className="history-footer">
          {filterOrganization && (
            <button className="clear-filter-button" onClick={() => setFilterOrganization('')}>
              Clear Filter
            </button>
          )}
          
          <div className="pagination-controls">
            <button 
              className="pagination-button" 
              onClick={() => {
                if (page > 1) {
                  setPage(page - 1);
                  window.scrollTo(0, 0);
                }
              }}
              disabled={page === 1}
            >
              Previous
            </button>
            
            <span className="pagination-info">
              Page {page} of {totalPages}
            </span>
            
            <button 
              className="pagination-button" 
              onClick={() => {
                if (page < totalPages) {
                  setPage(page + 1);
                  window.scrollTo(0, 0);
                }
              }}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NewTranscriptHistory; 