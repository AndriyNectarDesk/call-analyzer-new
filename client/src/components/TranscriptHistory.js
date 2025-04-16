import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './TranscriptHistory.css';
import Cookies from 'js-cookie';
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
  
  // Check if user is master admin
  const isMasterAdmin = currentUser?.isMasterAdmin || false;
  console.log('====== MASTER ADMIN CHECK ======');
  console.log('Is user a master admin?', isMasterAdmin);
  console.log('Current user:', currentUser);
  
  // Debug render function
  const renderDebug = () => {
    console.log('====== RENDER DEBUG ======');
    console.log('Master admin (render time):', isMasterAdmin);
    console.log('Organizations length (render time):', organizations.length);
    console.log('Organizations data (render time):', organizations);
    return null;
  };
  
  // Get the current user from local storage on mount
  useEffect(() => {
    fetchUserContext();
    
    async function fetchUserContext() {
      try {
        console.log('====== DEBUGGING USER CONTEXT ======');
        const userId = localStorage.getItem('user_id');
        console.log('User ID from localStorage:', userId);
        
        const userData = localStorage.getItem('user_data');
        console.log('User data exists in localStorage:', !!userData);
        
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            console.log('Parsed user data:', parsedUser);
            setCurrentUser(parsedUser);
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
        
        const orgData = localStorage.getItem('selectedOrganization');
        console.log('Organization data exists in localStorage:', !!orgData);
        
        if (orgData) {
          try {
            const parsedOrg = JSON.parse(orgData);
            console.log('Loaded organization data from localStorage:', parsedOrg);
            
            // Ensure the organization object has the expected format
            const formattedOrg = {
              ...parsedOrg,
              _id: parsedOrg._id || parsedOrg.id,
              id: parsedOrg.id || parsedOrg._id
            };
            
            console.log('Formatted organization data:', formattedOrg);
            setCurrentOrganization(formattedOrg);
          } catch (e) {
            console.error('Error parsing organization data:', e);
          }
        } else {
          console.warn('No selected organization found in localStorage');
          
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
              console.log('JWT token payload for org fallback:', tokenData);
              
              if (tokenData.organizationId) {
                console.log('Using organization ID from JWT token as fallback:', tokenData.organizationId);
                // Create minimal org object with the ID from the token
                setCurrentOrganization({
                  _id: tokenData.organizationId,
                  id: tokenData.organizationId,
                  name: 'Organization from JWT'
                });
              }
            }
          } catch (e) {
            console.error('Error using JWT for organization fallback:', e);
          }
        }
        
        // Important: Trigger transcript fetch even if we couldn't fully resolve the context
        console.log('User context fetch complete - will proceed even if incomplete');
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user context:', err);
        setLoading(false);
      }
    }
  }, []);
  
  // Check if the current organization is the master organization
  const checkIfMasterOrganization = () => {
    console.log('====== MASTER ORG CHECK ======');
    
    if (!currentOrganization) {
      console.log('No current organization selected');
      return false;
    }
    
    console.log('Checking if master org selected:', currentOrganization);
    
    // Get the organization name and code in lowercase for comparison
    const orgName = currentOrganization.name ? currentOrganization.name.toLowerCase() : '';
    const orgCode = currentOrganization.code ? currentOrganization.code.toLowerCase() : '';
    const orgId = currentOrganization._id || currentOrganization.id || '';
    
    console.log('Organization details - Name:', orgName, 'Code:', orgCode, 'ID:', orgId);
    
    // Check for Master Organization by multiple properties
    const isMasterByCode = orgCode === 'master-org' || orgCode === 'master' || orgCode.includes('master');
    const isMasterByName = orgName.includes('master') || orgName === 'master organization' || orgName.includes('nectar desk');
    
    // Hard-coded known Master Org IDs - can be updated based on your environment
    const knownMasterOrgIds = ['64d5ece33f7443afa6b684d2', '67f6a38454aeb791d5665e59', '67f6a38454aeb791d5665e58'];
    const isMasterById = knownMasterOrgIds.includes(orgId);
    
    const result = isMasterByCode || isMasterByName || isMasterById;
    console.log('Is master organization?', result);
    console.log('Checks: By code:', isMasterByCode, '| By name:', isMasterByName, '| By ID:', isMasterById);
    
    return result;
  };
  
  // Fetch transcripts when component mounts (don't wait for user/org context to be perfect)
  useEffect(() => {
    // Use a timeout to ensure this runs after the context effect
    const timer = setTimeout(() => {
      console.log('Initiating transcript fetch after delay');
      fetchTranscripts();
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Also fetch when user or organization context changes
  useEffect(() => {
    if (currentUser || currentOrganization) {
      console.log('Context changed, fetching transcripts again');
      fetchTranscripts();
    }
  }, [currentUser, currentOrganization]);
  
  // The main transcript fetching function
  const fetchTranscripts = async () => {
    setLoading(true);
    try {
      // Get organization ID from JWT or localStorage
      let orgId;
      const token = Cookies.get('token');
      
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('JWT token payload:', payload);
          orgId = payload.organizationId;
          console.log('Organization ID from JWT:', orgId);
        } catch (err) {
          console.error('Error decoding JWT:', err);
        }
      }
      
      // Fallback to localStorage if JWT parsing fails
      if (!orgId) {
        orgId = localStorage.getItem('organizationId');
        console.log('Organization ID from localStorage:', orgId);
      }
      
      let url = `/api/transcripts?page=${page}&limit=10`;
      console.log('Fetching transcripts URL:', url);
      
      const response = await axios.get(url);
      console.log('API response data:', response.data);
      
      // Handle both older and newer pagination formats
      if (response.data.transcripts && Array.isArray(response.data.transcripts)) {
        setTranscripts(response.data.transcripts);
        setTotalPages(response.data.totalPages || 1);
      } else if (response.data.data && Array.isArray(response.data.data)) {
        setTranscripts(response.data.data);
        setTotalPages(response.data.totalPages || response.data.meta?.totalPages || 1);
      } else {
        console.error('Unexpected API response format:', response.data);
        setTranscripts([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching transcripts:', error);
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred while fetching transcripts';
      setError(errorMessage);
      setTranscripts([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };
  
  // Filter transcripts when filterOrganization changes
  useEffect(() => {
    if (!filterOrganization) {
      setFilteredTranscripts(transcripts);
    } else {
      setFilteredTranscripts(transcripts.filter(
        t => t.organizationId && t.organizationId.name === filterOrganization
      ));
    }
  }, [filterOrganization, transcripts]);

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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading transcripts...</p>
      </div>
    );
  }

  return (
    <div className="history-container">
      <h2>Transcript History</h2>
      {renderDebug()}
      
      {/* Organization filter for master org context */}
      {checkIfMasterOrganization() && organizations.length > 0 ? (
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
      ) : (
        // Only show debug message if we're in master context but have no organizations
        checkIfMasterOrganization() && organizations.length === 0 ? (
          <div className="debug-message" style={{margin: '10px 0', fontSize: '0.9rem', color: '#555'}}>
            Filter not shown: No organizations found
          </div>
        ) : null
      )}
      
      {error && (
        <div className="error-message">{error}</div>
      )}
      
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
                  transcript.source === 'api' ? 'badge-auto' : 
                  transcript.source === 'audio' ? 'badge-nectar' : 
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
                {/* Always show organization badge when transcript has organization info */}
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
      
      <div className="history-footer">
        {filterOrganization && (
          <button className="clear-filter-button" onClick={() => setFilterOrganization('')}>
            Clear Filter
          </button>
        )}
        
        {/* Pagination controls */}
        {transcripts.length > 0 && (
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
        )}
      </div>
    </div>
  );
}

export default TranscriptHistory; 