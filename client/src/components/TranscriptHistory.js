import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './TranscriptHistory.css';
import axios from 'axios';

function TranscriptHistory() {
  const [transcripts, setTranscripts] = useState([]);
  const [filteredTranscripts, setFilteredTranscripts] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [filterOrganization, setFilterOrganization] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Check if user is master admin
  const isMasterAdmin = currentUser?.isMasterAdmin || false;
  // Check if current organization is master organization
  const isMasterOrg = currentOrganization?.isMaster || false;
  
  // Get the current user from local storage on mount
  useEffect(() => {
    fetchUserContext();
    
    async function fetchUserContext() {
      try {
        const userData = localStorage.getItem('user_data');
        
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            setCurrentUser(parsedUser);
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
        
        const orgData = localStorage.getItem('selectedOrganization');
        
        if (orgData) {
          try {
            const parsedOrg = JSON.parse(orgData);
            
            // Ensure the organization object has the expected format
            const formattedOrg = {
              ...parsedOrg,
              _id: parsedOrg._id || parsedOrg.id,
              id: parsedOrg.id || parsedOrg._id
            };
            
            setCurrentOrganization(formattedOrg);
            
            // If organization is not identified as master yet, fetch its details
            if (formattedOrg._id && formattedOrg.isMaster === undefined) {
              try {
                const token = localStorage.getItem('auth_token');
                if (token) {
                  const response = await axios.get(`/api/organizations/${formattedOrg._id}`, {
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  });
                  
                  if (response.data && response.data.isMaster) {
                    // Update the current organization with the isMaster flag
                    setCurrentOrganization(prev => ({
                      ...prev,
                      isMaster: response.data.isMaster
                    }));
                    
                    // Update localStorage with isMaster flag
                    const updatedOrg = {
                      ...formattedOrg,
                      isMaster: response.data.isMaster
                    };
                    localStorage.setItem('selectedOrganization', JSON.stringify(updatedOrg));
                  }
                }
              } catch (err) {
                console.error('Error fetching organization details:', err);
              }
            }
          } catch (e) {
            console.error('Error parsing organization data:', e);
          }
        } else {
          // Try to get org ID from the auth token as fallback
          try {
            const token = localStorage.getItem('auth_token');
            if (token) {
              const base64Url = token.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
              }).join(''));
              
              const tokenData = JSON.parse(jsonPayload);
              
              if (tokenData.organizationId) {
                // Create minimal org object with the ID from the token
                setCurrentOrganization({
                  _id: tokenData.organizationId,
                  id: tokenData.organizationId,
                  name: 'Your Organization'
                });
                
                // Try to fetch organization details including isMaster status
                try {
                  const response = await axios.get(`/api/organizations/${tokenData.organizationId}`, {
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  });
                  
                  if (response.data) {
                    setCurrentOrganization(response.data);
                  }
                } catch (err) {
                  console.error('Error fetching organization details from token:', err);
                }
              }
            }
          } catch (e) {
            console.error('Error using JWT for organization fallback:', e);
          }
        }
        
        // Proceed even if we couldn't fully resolve the context
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user context:', err);
        setLoading(false);
      }
    }
  }, []);
  
  // Fetch available organizations for filtering if user is in the master organization
  useEffect(() => {
    if (isMasterOrg) {
      fetchOrganizations();
    }
  }, [isMasterOrg, currentOrganization]);
  
  // Fetch organizations for master admin users
  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      
      const response = await axios.get('/api/master-admin/organizations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data && Array.isArray(response.data)) {
        setOrganizations(response.data);
        console.log('Fetched organizations for filtering:', response.data.length);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };
  
  // Fetch transcripts when page changes or when user/organization context changes
  useEffect(() => {
    if (page && (currentUser || currentOrganization)) {
      fetchTranscripts();
    }
  }, [page, currentUser, currentOrganization]);
  
  // Decode and validate JWT token
  const decodeToken = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };
  
  // Check if token is expired
  const isTokenExpired = (decodedToken) => {
    if (!decodedToken || !decodedToken.exp) {
      return true; // If we can't verify expiration, assume it's expired
    }
    
    // Token expiration is in seconds, Date.now() is in milliseconds
    const currentTime = Date.now() / 1000;
    return decodedToken.exp < currentTime;
  };
  
  // The main transcript fetching function
  const fetchTranscripts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        setLoading(false);
        window.location.href = '/login'; // Redirect to login if no token
        return;
      }
      
      // Validate token format - basic check for JWT format (header.payload.signature)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.error('Invalid token format detected');
        setError('Invalid authentication token. Please log in again.');
        localStorage.removeItem('auth_token');
        setLoading(false);
        window.location.href = '/login';
        return;
      }
      
      // Debug the JWT token
      const decodedToken = decodeToken(token);
      console.log('Decoded token:', decodedToken);
      
      // Check if token is expired
      if (isTokenExpired(decodedToken)) {
        console.error('Token has expired');
        setError('Your session has expired. Please log in again.');
        localStorage.removeItem('auth_token');
        setLoading(false);
        window.location.href = '/login';
        return;
      }
      
      let url = `/api/transcripts?page=${page}&limit=10`;
      
      // Add search query if present
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      
      // Add organization filter if present
      if (filterOrganization) {
        url += `&organization=${encodeURIComponent(filterOrganization)}`;
      }
      
      // Add organization context headers
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      if (currentOrganization) {
        // Set the organization context header
        headers['X-Organization-Id'] = currentOrganization._id || currentOrganization.id;
        
        // Add organization name if available
        if (currentOrganization.name) {
          headers['X-Organization-Name'] = currentOrganization.name;
        }
        
        // For debugging - add isMaster flag if present
        if (currentOrganization.isMaster) {
          headers['X-Organization-Is-Master'] = 'true';
        }
      }
      
      console.log('Fetching transcripts URL:', url);
      console.log('Fetching transcripts with headers:', headers);
      console.log('Current organization:', currentOrganization);
      
      const response = await axios.get(url, { headers });
      
      // Add detailed response logging
      console.log('Full API Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      });
      
      // Validate response data structure
      if (!response.data) {
        throw new Error('Empty response received from server');
      }
      
      // Log the exact shape of the response data
      console.log('Response data structure:', {
        hasTranscripts: Boolean(response.data.transcripts),
        transcriptsIsArray: Array.isArray(response.data.transcripts),
        hasPagination: Boolean(response.data.pagination),
        paginationShape: response.data.pagination ? Object.keys(response.data.pagination) : null,
        dataShape: Object.keys(response.data)
      });
      
      // Handle different API response formats
      if (response.data.transcripts && Array.isArray(response.data.transcripts)) {
        console.log('Response format: transcripts array with data.transcripts');
        setTranscripts(response.data.transcripts);
        setTotalPages(response.data.pagination?.pages || 1);
      } else if (response.data.data && Array.isArray(response.data.data)) {
        console.log('Response format: data array with data.data');
        setTranscripts(response.data.data);
        setTotalPages(response.data.totalPages || response.data.meta?.totalPages || 1);
      } else if (Array.isArray(response.data)) {
        console.log('Response format: direct array');
        setTranscripts(response.data);
        setTotalPages(1);
      } else {
        console.error('Unexpected API response format:', response.data);
        setTranscripts([]);
        setTotalPages(1);
        setError('Unexpected API response format. Please check the console for details.');
      }
      
      // Update filtered transcripts based on current filter
      if (!filterOrganization) {
        setFilteredTranscripts(response.data.transcripts || 
                               response.data.data || 
                               (Array.isArray(response.data) ? response.data : []));
      } else {
        const dataArray = response.data.transcripts || 
                          response.data.data || 
                          (Array.isArray(response.data) ? response.data : []);
        
        setFilteredTranscripts(dataArray.filter(
          t => t.organizationId && t.organizationId.name === filterOrganization
        ));
      }
    } catch (error) {
      console.error('Error fetching transcripts:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        responseHeaders: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          data: error.config?.data
        }
      });
      
      // Handle network errors (CORS, connection issues, etc)
      if (error.message && (
          error.message.includes('Network Error') || 
          error.message.includes('CORS') || 
          !error.response)) {
        setError('Network error: Could not connect to the server. Please check your connection and try again.');
        console.error('Network or CORS error detected:', error.message);
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'An error occurred while fetching transcripts';
        setError(errorMessage);
      }
      
      // Check for authentication errors
      if (error.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
        // Clear auth token to force login
        localStorage.removeItem('auth_token');
      }
      
      // Handle server errors
      if (error.response?.status >= 500) {
        setError('Server error: The server encountered an issue. Please try again later or contact support.');
        console.error('Server error detected:', error.response?.status, error.response?.statusText);
      }
      
      // Check if we received HTML instead of JSON (likely a login page)
      if (error.response?.data && typeof error.response.data === 'string' && 
         (error.response.data.includes('<!doctype html>') || error.response.data.includes('<html'))) {
        console.error('Received HTML response instead of JSON. You may need to log in again.');
        setError('Session expired or authentication error. Please refresh the page and log in again.');
        // Clear auth token to force login
        localStorage.removeItem('auth_token');
        // Redirect to login page after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
      
      setTranscripts([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  // Get a human-readable call type
  const getCallTypeLabel = (type) => {
    switch(type) {
      case 'flower': return 'Flower Shop';
      case 'hearing': return 'Hearing Aid Clinic';
      case 'auto': return 'Auto-detected';
      default: return type || 'Auto-detected';
    }
  };
  
  // Get a badge color based on call type
  const getCallTypeBadgeClass = (type) => {
    switch(type) {
      case 'flower': return 'badge-flower';
      case 'hearing': return 'badge-hearing';
      default: return 'badge-auto';
    }
  };
  
  // Handle search submission
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1); // Reset to first page when searching
    fetchTranscripts();
  };
  
  // Handle changing organization filter
  const handleOrganizationChange = (e) => {
    setFilterOrganization(e.target.value);
    setPage(1); // Reset to first page when changing filters
  };
  
  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };
  
  // Truncate text for display
  const truncateText = (text, maxLength = 150) => {
    if (!text) return 'No transcript available';
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

  return (
    <div className="transcript-history-container">
      <h1>Call History</h1>
      
      {/* Search and filter */}
      <div className="history-controls">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search transcripts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-button">Search</button>
        </form>
        
        {organizations.length > 0 && isMasterOrg && (
          <div className="filter-control">
            <label htmlFor="org-filter">Filter by Organization:</label>
            <select
              id="org-filter"
              value={filterOrganization}
              onChange={handleOrganizationChange}
              className="org-filter-select"
            >
              <option value="">All Organizations</option>
              {organizations.map(org => (
                <option key={org._id} value={org.name}>{org.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {/* Loading indicator */}
      {loading ? (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading transcripts...</p>
        </div>
      ) : (
        <>
          {/* Transcript list */}
          {filteredTranscripts.length > 0 ? (
            <div className="transcripts-list">
              {filteredTranscripts.map(transcript => (
                <div key={transcript._id} className="transcript-card">
                  <div className="transcript-header">
                    <h3 className="transcript-title">
                      <Link to={`/transcript/${transcript._id}`}>
                        {transcript.title || `Call from ${formatDate(transcript.createdAt)}`}
                      </Link>
                    </h3>
                    <span className={`call-type-badge ${getCallTypeBadgeClass(transcript.callType)}`}>
                      {getCallTypeLabel(transcript.callType)}
                    </span>
                  </div>
                  
                  <div className="transcript-summary">
                    {truncateText(transcript.text || transcript.rawTranscript)}
                  </div>
                  
                  <div className="transcript-footer">
                    <span className="timestamp">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      {formatDate(transcript.createdAt)}
                    </span>
                    
                    {transcript.organizationId && (
                      <span className="organization">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                        </svg>
                        {transcript.organizationId.name}
                        {transcript.organizationId.isMaster && 
                          <span className="master-badge">Master</span>
                        }
                      </span>
                    )}
                    
                    <Link to={`/transcript/${transcript._id}`} className="view-details">
                      View Details
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14"></path>
                        <path d="M12 5l7 7-7 7"></path>
                      </svg>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-transcripts">
              <p>No transcripts found. Try adjusting your search or filters.</p>
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => handlePageChange(page - 1)} 
                disabled={page === 1}
                className="pagination-button"
              >
                Previous
              </button>
              <span className="pagination-info">Page {page} of {totalPages}</span>
              <button 
                onClick={() => handlePageChange(page + 1)} 
                disabled={page === totalPages}
                className="pagination-button"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TranscriptHistory; 
