import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './TranscriptHistory.css';

function TranscriptHistory() {
  const [transcripts, setTranscripts] = useState([]);
  const [filteredTranscripts, setFilteredTranscripts] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [filterOrganization, setFilterOrganization] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  
  // Check if user is master admin
  const isMasterAdmin = currentUser?.isMasterAdmin;
  
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
  const isMasterOrganizationSelected = () => {
    if (!currentOrganization) return false;
    console.log('Checking if master org selected. Org code:', currentOrganization.code);
    console.log('Organization details:', currentOrganization);
    
    // Check for various possible identifiers of the master organization
    return currentOrganization.code === 'master-org' || 
           currentOrganization.name === 'Master Organization' ||
           currentOrganization._id === '123456789012345678901234'; // Update with actual ID if known
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
    try {
      console.log('====== FETCHING TRANSCRIPTS ======');
      setLoading(true);
      setError(null);
      
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setLoading(false);
        return;
      }
      
      // Log current user and organization context
      console.log('Current user context:', currentUser);
      console.log('Current organization context:', currentOrganization);
      
      // Debug JWT token
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const tokenData = JSON.parse(jsonPayload);
        console.log('JWT token payload for API call:', tokenData);
        
        if (tokenData.organizationId) {
          console.log(`JWT organization ID: ${tokenData.organizationId}`);
          if (currentOrganization) {
            console.log(`Local organization ID: ${currentOrganization.id || currentOrganization._id}`);
          } else {
            console.log('No local organization context available');
          }
        }
      } catch (e) {
        console.error('Error decoding JWT token:', e);
      }
      
      // If user is master admin AND in master organization, fetch all transcripts
      if (isMasterAdmin && isMasterOrganizationSelected()) {
        console.log('User is master admin in master org context, fetching all transcripts');
        
        let url = `${apiUrl}/api/transcripts`;
        console.log('Master admin API URL:', url);
        
        try {
          console.log('Fetching from:', url);
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          console.log('Response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('API error response text:', errorText);
            throw new Error(`Failed to fetch transcripts: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          console.log('API Response data type:', typeof data);
          console.log('API Response data keys:', Object.keys(data));
          
          // Handle both pagination and direct array formats
          const transcriptData = data.transcripts || data;
          console.log(`Extracted transcript data length: ${Array.isArray(transcriptData) ? transcriptData.length : 'N/A'}`);
          
          if (Array.isArray(transcriptData)) {
            setTranscripts(transcriptData);
            setFilteredTranscripts(transcriptData);
            
            // Extract unique organization names
            const uniqueOrganizations = [...new Set(transcriptData
              .filter(t => t.organizationId && t.organizationId.name)
              .map(t => t.organizationId.name)
            )];
            console.log('Extracted organization filters:', uniqueOrganizations);
            setOrganizations(uniqueOrganizations);
            
            setLoading(false);
            return; // Exit early since we have data
          }
        } catch (err) {
          console.error('Error in master admin API call:', err);
          // Continue to try other approaches
        }
      } else {
        // For non-master-admins or when a specific organization is selected,
        // fetch only for the current organization
        if (currentOrganization) {
          const orgId = currentOrganization.id || currentOrganization._id;
          if (orgId) {
            console.log(`Using organization filter for current org: ${orgId}`);
            let url = `${apiUrl}/api/transcripts?organizationId=${orgId}`;
            
            try {
              console.log('Fetching organization-specific transcripts from:', url);
              const response = await fetch(url, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              console.log('Response status:', response.status);
              
              if (!response.ok) {
                const errorText = await response.text();
                console.error('API error response text with org filter:', errorText);
                throw new Error(`Failed to fetch transcripts with organization filter: ${response.status} ${response.statusText}`);
              }
              
              const data = await response.json();
              console.log('Organization filter API Response:', data);
              
              // Handle both pagination and direct array formats
              const transcriptData = data.transcripts || data;
              console.log(`Organization transcripts found: ${Array.isArray(transcriptData) ? transcriptData.length : 'N/A'}`);
              
              if (Array.isArray(transcriptData)) {
                setTranscripts(transcriptData);
                setFilteredTranscripts(transcriptData);
                
                // We don't need organization filtering when viewing a specific org
                setOrganizations([]);
                setFilterOrganization('');
                
                setLoading(false);
                return; // Exit early
              }
            } catch (err) {
              console.error('Error in organization-specific API call:', err);
              // Only fall through to generic API call if this fails
            }
          }
        }
      }
      
      // Fallback to direct API call if the specific approaches above failed
      console.log('Trying fallback API call without filters');
      let url = `${apiUrl}/api/transcripts`;
      console.log('Fallback API URL:', url);
      
      try {
        console.log('Fetching from:', url);
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API error response text:', errorText);
          throw new Error(`Failed to fetch transcripts: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('API Response data type:', typeof data);
        console.log('API Response data keys:', Object.keys(data));
        
        // Handle both pagination and direct array formats
        const transcriptData = data.transcripts || data;
        console.log(`Extracted transcript data:`, transcriptData);
        console.log(`Transcript data is array: ${Array.isArray(transcriptData)}`);
        console.log(`Number of transcripts: ${Array.isArray(transcriptData) ? transcriptData.length : 'N/A'}`);
        
        if (Array.isArray(transcriptData)) {
          setTranscripts(transcriptData);
          setFilteredTranscripts(transcriptData);
          
          // Only extract organization filters for master admin
          if (isMasterAdmin && transcriptData.length > 0) {
            const uniqueOrganizations = [...new Set(transcriptData
              .filter(t => t.organizationId && t.organizationId.name)
              .map(t => t.organizationId.name)
            )];
            console.log('Extracted organization filters:', uniqueOrganizations);
            setOrganizations(uniqueOrganizations);
          }
          
          setLoading(false);
          return; // Exit early since we have data
        }
      } catch (err) {
        console.error('Error in fallback API call:', err);
      }
      
      // If we got here, all approaches failed or returned no results
      console.log('All transcript fetch attempts completed with no results');
      setTranscripts([]);
      setFilteredTranscripts([]);
      setOrganizations([]);
      
    } catch (err) {
      console.error('Error in fetchTranscripts:', err);
      setError(`Error loading transcript history: ${err.message}`);
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
      
      {/* Show organization filter whenever we have organizations and user is master admin */}
      {isMasterAdmin && organizations.length > 0 && (
        <div className="filter-controls">
          <div className="filter-group">
            <label htmlFor="organizationFilter">Filter by Organization:</label>
            <select 
              id="organizationFilter" 
              value={filterOrganization} 
              onChange={(e) => setFilterOrganization(e.target.value)}
            >
              <option value="">All Organizations</option>
              {organizations.map(org => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>
          </div>
        </div>
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
                <span className="source">
                  Source: {
                    transcript.source === 'api' ? 'API' : 
                    transcript.source === 'audio' ? 'Audio Upload' : 
                    transcript.source === 'nectar-desk-webhook' ? 'NectarDesk' : 
                    'Web UI'
                  }
                </span>
                <span className={`call-type-badge ${getCallTypeBadgeClass(transcript.callType)}`}>
                  {getCallTypeLabel(transcript.callType)}
                </span>
                {/* Always show organization badge when master admin is logged in */}
                {isMasterAdmin && transcript.organizationId && transcript.organizationId.name && (
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
      </div>
    </div>
  );
}

export default TranscriptHistory;