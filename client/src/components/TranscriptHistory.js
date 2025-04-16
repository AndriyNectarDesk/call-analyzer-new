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
        const userId = localStorage.getItem('user_id');
        if (!userId) {
          setLoading(false);
          return;
        }
        
        const userData = localStorage.getItem('user_data');
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            console.log('Loaded user data:', parsedUser);
            setCurrentUser(parsedUser);
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
        
        const orgData = localStorage.getItem('selectedOrganization');
        if (orgData) {
          try {
            const parsedOrg = JSON.parse(orgData);
            console.log('Loaded organization data:', parsedOrg);
            setCurrentOrganization(parsedOrg);
          } catch (e) {
            console.error('Error parsing organization data:', e);
          }
        }
      } catch (err) {
        console.error('Error fetching user context:', err);
      }
    }
  }, []);
  
  // Check if the current organization is the master organization
  const isMasterOrganizationSelected = () => {
    if (!currentOrganization) return false;
    return currentOrganization.code === 'master-org';
  };
  
  // Fetch transcripts when user and organization are loaded
  useEffect(() => {
    const fetchTranscripts = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
          setError('Authentication token not found. Please log in again.');
          setLoading(false);
          return;
        }
        
        // Log current organization context for debugging
        console.log('Current organization context:', currentOrganization);
        
        // Determine the URL based on user's role and organization context
        let url = `${apiUrl}/api/transcripts`;
        
        // If not a master admin or not in master org context, filter by current organization
        // Make sure we're using the correct organization ID format
        if (!(isMasterAdmin && isMasterOrganizationSelected()) && currentOrganization) {
          // The organizationId may be in either the 'id' or '_id' property
          const orgId = currentOrganization.id || currentOrganization._id;
          if (orgId) {
            console.log(`Adding organization filter: ${orgId}`);
            url = `${apiUrl}/api/transcripts?organizationId=${orgId}`;
          } else {
            console.warn('No organization ID found for filtering');
          }
        }
        
        console.log('Fetching transcripts from:', url);
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('API error response:', errorData);
          throw new Error(`Failed to fetch transcripts: ${response.status} ${errorData.message || response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`Retrieved ${data.transcripts ? data.transcripts.length : 0} transcripts`);
        
        // Check if the API returns data in the new format (with pagination)
        // The new controller returns { transcripts: [...], pagination: {...} }
        const transcriptData = data.transcripts || data;
        
        setTranscripts(transcriptData);
        setFilteredTranscripts(transcriptData);
        
        // Extract unique organization names - only if master admin in master org
        if (isMasterAdmin && isMasterOrganizationSelected() && transcriptData.length > 0) {
          const uniqueOrganizations = [...new Set(transcriptData
            .filter(t => t.organizationId && t.organizationId.name)
            .map(t => t.organizationId.name)
          )];
          console.log('Extracted organization filters:', uniqueOrganizations);
          setOrganizations(uniqueOrganizations);
        } else {
          setOrganizations([]);
          setFilterOrganization(''); // Clear any organization filter
        }
      } catch (err) {
        console.error('Error in fetchTranscripts:', err);
        setError(`Error loading transcript history: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we have loaded the user and organization context
    if (currentUser && currentOrganization) {
      console.log('User and organization context ready, fetching transcripts...');
      fetchTranscripts();
    } else {
      console.log('Waiting for user and organization context...');
      setLoading(false);
    }
  }, [currentUser, currentOrganization]);
  
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

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="history-container">
      <h2>Transcript History</h2>
      
      {/* Only show organization filter for master admins in master org context */}
      {isMasterAdmin && isMasterOrganizationSelected() && organizations.length > 0 && (
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
      
      {filteredTranscripts.length === 0 ? (
        <p>No transcript analysis history found.</p>
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
                {/* Only show organization badge if master admin in master org context */}
                {isMasterAdmin && isMasterOrganizationSelected() && transcript.organizationId && (
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