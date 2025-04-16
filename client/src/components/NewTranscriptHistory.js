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
      
      console.log('Authentication token exists:', !!authToken);
      
      if (!authToken) {
        redirectToLogin('No authentication token found');
        return;
      }
      
      // Decode token to check expiration
      try {
        const payload = parseJwt(authToken);
        const tokenExp = payload.exp * 1000;
        const currentTime = Date.now();
        
        console.log('Token expiration:', new Date(tokenExp).toLocaleString());
        console.log('Current time:', new Date(currentTime).toLocaleString());
        console.log('Token valid for:', Math.round((tokenExp - currentTime) / 60000), 'minutes');
        
        if (currentTime > tokenExp) {
          console.error('Authentication token expired');
          redirectToLogin('Authentication token expired');
          return;
        }
        
        console.log('JWT token payload:', payload);
        
        // Set user from token payload
        setUser({
          id: payload.userId || payload.id,
          email: payload.email,
          isMasterAdmin: payload.isMasterAdmin || false,
          role: payload.role || 'user',
          organizationId: payload.organizationId
        });
        
        console.log('User set from token:', payload.email, 'isMasterAdmin:', payload.isMasterAdmin);
      } catch (err) {
        console.error('Error parsing token:', err);
        redirectToLogin('Invalid authentication token');
        return;
      }
      
      // Get organization from localStorage or fallback to API
      const orgData = localStorage.getItem('selectedOrganization');
      console.log('Organization data exists in localStorage:', !!orgData);
      
      if (orgData) {
        try {
          const parsedOrg = JSON.parse(orgData);
          console.log('Parsed organization data:', parsedOrg);
          
          setOrganization({
            _id: parsedOrg._id || parsedOrg.id,
            id: parsedOrg.id || parsedOrg._id,
            name: parsedOrg.name,
            code: parsedOrg.code
          });
          
          console.log('Organization set from localStorage:', parsedOrg.name);
        } catch (err) {
          console.error('Error parsing organization data:', err);
          await fetchOrganizationFromAPI(authToken);
        }
      } else {
        console.log('No organization in localStorage, fetching from API...');
        await fetchOrganizationFromAPI(authToken);
      }
      
      // Attempt to fetch transcripts right away
      await fetchTranscripts();
    } catch (err) {
      console.error('Error initializing component:', err);
      setError('Failed to initialize. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };
  
  // Helper to parse JWT with more robust error handling
  const parseJwt = (token) => {
    try {
      // Handle tokens that might have Bearer prefix
      if (token.startsWith('Bearer ')) {
        token = token.slice(7);
      }
      
      // Split the token and get the payload part
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('Invalid JWT format: Expected 3 parts but got', parts.length);
        throw new Error('Invalid token format - not a valid JWT');
      }
      
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      
      // Add padding if needed
      const padding = '='.repeat((4 - base64.length % 4) % 4);
      const padded = base64 + padding;
      
      try {
        // First try the standard browser atob method
        const rawPayload = atob(padded);
        const jsonPayload = decodeURIComponent(
          Array.from(rawPayload).map(c => 
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
          ).join('')
        );
        
        return JSON.parse(jsonPayload);
      } catch (innerErr) {
        // Fallback to Buffer if available (Node.js environment)
        console.error('atob failed, trying fallback:', innerErr);
        if (typeof Buffer !== 'undefined') {
          const buff = Buffer.from(padded, 'base64');
          return JSON.parse(buff.toString('utf8'));
        }
        throw innerErr;
      }
    } catch (err) {
      console.error('Error parsing JWT:', err);
      throw new Error('Invalid token format: ' + err.message);
    }
  };
  
  // Fetch organization from API 
  const fetchOrganizationFromAPI = async (token) => {
    try {
      console.log('Fetching organization from API...');
      const response = await axios.get('/api/auth/me', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      console.log('API response for organization:', response.data);
      
      if (response.data && response.data.user && response.data.user.organization) {
        const org = response.data.user.organization;
        setOrganization({
          _id: org._id || org.id,
          id: org.id || org._id,
          name: org.name,
          code: org.code
        });
        
        // Save to localStorage
        localStorage.setItem('selectedOrganization', JSON.stringify(org));
        console.log('Organization saved to localStorage:', org.name);
      } else if (response.data && response.data.organization) {
        const org = response.data.organization;
        setOrganization({
          _id: org._id || org.id,
          id: org.id || org._id,
          name: org.name,
          code: org.code
        });
        
        // Save to localStorage
        localStorage.setItem('selectedOrganization', JSON.stringify(org));
        console.log('Organization saved to localStorage:', org.name);
      } else {
        console.error('No organization data in API response:', response.data);
        throw new Error('No organization data returned from API');
      }
    } catch (err) {
      console.error('Error fetching organization:', err);
      if (err.response) {
        console.error('Response status:', err.response.status);
        console.error('Response data:', err.response.data);
      }
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

  // Add a fallback method to try direct API request without going through checkIfMasterOrganization logic
  const fetchTranscriptsWithFallback = async () => {
    try {
      console.log('Attempting to fetch transcripts with fallback method...');
      const authToken = localStorage.getItem('auth_token');
      
      if (!authToken) {
        setError('Authentication token is missing. Please log in again.');
        return;
      }
      
      // Get API base URL
      const apiBaseUrl = getApiBaseUrl();
      console.log('Using API base URL for fallback:', apiBaseUrl);
      
      // Direct API call without complex filters
      const url = `${apiBaseUrl}/api/transcripts?page=1&limit=10`;
      
      console.log('Fallback fetch URL:', url);
      
      // Add debug output
      try {
        // Try to get user ID from token
        const payload = parseJwt(authToken);
        console.log('JWT Payload for fallback request:', payload);
        
        if (payload.exp) {
          const expTime = new Date(payload.exp * 1000);
          const now = new Date();
          console.log('Token expiration time:', expTime.toLocaleString());
          console.log('Current time:', now.toLocaleString());
          console.log('Token valid for:', Math.round((expTime - now) / 60000), 'minutes');
        }
      } catch (err) {
        console.error('Could not parse token for debug output:', err);
      }
      
      // Make the request with retries
      const makeApiCall = async () => {
        return await axios.get(url, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'application/json'
          },
          timeout: 15000 // 15 second timeout for fallback
        });
      };
      
      console.log('Making fallback API call with retry...');
      const response = await retryWithBackoff(makeApiCall);
      
      console.log('Fallback API response:', response.data);
      
      // Process whatever data we get
      if (response.data.transcripts && Array.isArray(response.data.transcripts)) {
        setTranscripts(response.data.transcripts);
        setFilteredTranscripts(response.data.transcripts);
        setTotalPages(response.data.pagination?.pages || response.data.totalPages || 1);
        setError(null); // Clear any previous errors
      } else if (response.data.data && Array.isArray(response.data.data)) {
        setTranscripts(response.data.data);
        setFilteredTranscripts(response.data.data);
        setTotalPages(response.data.totalPages || response.data.meta?.totalPages || 1);
        setError(null); // Clear any previous errors
      } else {
        console.error('Unexpected data format in fallback response:', response.data);
        setError('Received data but in an unexpected format. Please try refreshing the page.');
      }
    } catch (err) {
      console.error('Fallback method also failed:', err);
      
      if (err.response) {
        setError(`Fallback API call failed with status ${err.response.status}: ${err.response.statusText}`);
        console.error('Fallback response data:', err.response.data);
      } else if (err.request) {
        setError('No response received from server during fallback request. The server may be offline.');
      } else {
        setError('All methods to fetch data failed. Please try logging out and logging in again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Add a method to check the API server status
  const checkApiStatus = async () => {
    try {
      console.log('Checking API server status...');
      
      // Make a simple request to check if the API is responding
      const response = await axios.get('/api/health', {
        timeout: 5000 // 5 second timeout
      });
      
      console.log('API health check response:', response.data);
      
      if (response.status === 200) {
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('API health check failed:', err);
      return false;
    }
  };

  // Add a method to retry the API call with exponential backoff
  const retryWithBackoff = async (apiCallFn, maxRetries = 3) => {
    let retries = 0;
    let lastError;
    
    while (retries < maxRetries) {
      try {
        const delay = Math.pow(2, retries) * 1000; // Exponential backoff: 1s, 2s, 4s
        
        if (retries > 0) {
          console.log(`Retry attempt ${retries}/${maxRetries} after ${delay}ms delay...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        return await apiCallFn();
      } catch (err) {
        lastError = err;
        retries++;
        console.log(`API call failed (attempt ${retries}/${maxRetries}):`, err.message);
      }
    }
    
    console.error(`All ${maxRetries} retry attempts failed. Last error:`, lastError);
    throw lastError;
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
      
      // Check if API is responsive first
      const apiIsUp = await checkApiStatus();
      if (!apiIsUp) {
        setError('API server may be down or unreachable. Please try again later.');
        setLoading(false);
        return;
      }
      
      // Check if Master Organization
      const isMasterOrg = checkIfMasterOrganization();
      console.log('Is master organization check:', isMasterOrg);
      
      // Get API base URL
      const apiBaseUrl = getApiBaseUrl();
      console.log('Using API base URL:', apiBaseUrl);
      
      // Construct URL
      let url = `${apiBaseUrl}/api/transcripts?page=${page}&limit=10`;
      
      // Add organization filter based on master org status
      if (!isMasterOrg && organization && organization._id) {
        url += `&organizationId=${organization._id}`;
        console.log('Adding organization filter:', organization._id, organization.name);
      } else if (isMasterOrg) {
        console.log('Using master org context - not filtering by organization');
        url += '&isMasterOrg=true';
      }
      
      // Set up headers
      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/json'
      };
      
      // Make the request with retry mechanism
      console.log('Fetching transcripts:', url);
      console.log('Request headers:', headers);
      
      const makeApiCall = async () => {
        return await axios.get(url, { 
          headers,
          timeout: 10000 // 10 second timeout
        });
      };
      
      const response = await retryWithBackoff(makeApiCall);
      
      // Verify content type
      const contentType = response.headers['content-type'];
      console.log('Response content type:', contentType);
      
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Received non-JSON response:', contentType);
        throw new Error('Server returned non-JSON response');
      }
      
      // Process response
      console.log('API response:', response.data);
      
      if (response.data.transcripts && Array.isArray(response.data.transcripts)) {
        setTranscripts(response.data.transcripts);
        setFilteredTranscripts(response.data.transcripts);
        setTotalPages(response.data.pagination?.pages || response.data.totalPages || 1);
        
        // Extract unique organization names for filtering
        if (isMasterOrg) {
          const orgNames = [...new Set(
            response.data.transcripts
              .filter(t => t.organizationId && t.organizationId.name)
              .map(t => t.organizationId.name)
          )];
          setOrganizations(orgNames);
          console.log('Extracted organization names for filtering:', orgNames);
        }
      } else if (response.data.data && Array.isArray(response.data.data)) {
        // Handle alternative response format
        setTranscripts(response.data.data);
        setFilteredTranscripts(response.data.data);
        setTotalPages(response.data.totalPages || response.data.meta?.totalPages || 1);
        
        // Extract unique organization names for filtering
        if (isMasterOrg) {
          const orgNames = [...new Set(
            response.data.data
              .filter(t => t.organizationId && t.organizationId.name)
              .map(t => t.organizationId.name)
          )];
          setOrganizations(orgNames);
          console.log('Extracted organization names for filtering:', orgNames);
        }
      } else {
        console.error('Unexpected API response format:', response.data);
        throw new Error('Unexpected API response format');
      }
    } catch (err) {
      console.error('Error fetching transcripts:', err);
      
      // Handle specific error types
      if (err.response) {
        console.error('Error response status:', err.response.status);
        console.error('Error response data:', err.response.data);
        
        if (err.response.status === 401 || err.response.status === 403) {
          // Try to refresh the token or login again
          console.log('Authentication error, attempting fallback...');
          await fetchTranscriptsWithFallback();
        } else {
          setError(`API error: ${err.response.status} ${err.response.statusText}`);
        }
      } else if (err.request) {
        console.error('No response received:', err.request);
        setError('No response received from server. Please check your connection.');
      } else if (err.message.includes('non-JSON')) {
        console.log('Non-JSON response, attempting fallback...');
        await fetchTranscriptsWithFallback();
      } else {
        setError(err.message || 'Failed to fetch transcripts');
      }
    } finally {
      setLoading(false);
    }
  };

  // Check if the current organization is the master organization
  const checkIfMasterOrganization = () => {
    console.log('====== MASTER ORG CHECK ======');
    
    if (!organization) {
      console.log('No current organization selected');
      return false;
    }
    
    console.log('Checking if master org selected:', organization);
    
    // Get the organization name and code in lowercase for comparison
    const orgName = organization.name ? organization.name.toLowerCase() : '';
    const orgCode = organization.code ? organization.code.toLowerCase() : '';
    const orgId = organization._id || organization.id || '';
    
    console.log('Organization details - Name:', orgName, 'Code:', orgCode, 'ID:', orgId);
    
    // Check for Master Organization by multiple properties
    const isMasterByCode = orgCode === 'master-org' || orgCode === 'master' || orgCode.includes('master');
    const isMasterByName = orgName.includes('master') || orgName === 'master organization' || orgName.includes('nectar desk');
    
    // Hard-coded known Master Org IDs - can be updated based on your environment
    const knownMasterOrgIds = ['64d5ece33f7443afa6b684d2', '67f6a38454aeb791d5665e59', '67f6a38454aeb791d5665e58'];
    const isMasterById = knownMasterOrgIds.includes(orgId);
    
    // Check if user is master admin
    const isMasterAdmin = user && user.isMasterAdmin === true;
    
    const result = isMasterByCode || isMasterByName || isMasterById || isMasterAdmin;
    console.log('Is master organization?', result);
    console.log('Checks: By code:', isMasterByCode, '| By name:', isMasterByName, '| By ID:', isMasterById, '| Is master admin:', isMasterAdmin);
    
    return result;
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

  // Get the API base URL
  const getApiBaseUrl = () => {
    // Check for environment variables first
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }
    
    // Otherwise, derive from current URL
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    // If running locally, use a standard port for API
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:3001`;
    }
    
    // For production, assume API is on the same host
    return `${protocol}//${hostname}`;
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
          <div className="error-details">
            <strong>Debug Information:</strong>
            <ul>
              <li>User authenticated: {user ? 'Yes' : 'No'}</li>
              <li>Organization loaded: {organization ? 'Yes' : 'No'}</li>
              <li>Master admin: {user && user.isMasterAdmin ? 'Yes' : 'No'}</li>
              <li>Organization name: {organization ? organization.name : 'None'}</li>
              <li>Time: {new Date().toLocaleString()}</li>
            </ul>
          </div>
          <div className="error-actions">
            <button className="refresh-button" onClick={fetchTranscripts}>
              Retry Fetch
            </button>
            <button className="alternative-button" onClick={fetchTranscriptsWithFallback}>
              Try Alternative Method
            </button>
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