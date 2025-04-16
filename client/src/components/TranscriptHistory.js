import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function TranscriptHistory() {
  const [transcripts, setTranscripts] = useState([]);
  const [filteredTranscripts, setFilteredTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterOrganization, setFilterOrganization] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentOrganization, setCurrentOrganization] = useState(null);

  // Check if user is master admin
  const isMasterAdmin = currentUser?.isMasterAdmin;
  
  // Check if we're in master organization context
  const isMasterOrganizationSelected = () => {
    if (!currentOrganization) return false;
    return currentOrganization.code === 'master-org';
  };

  useEffect(() => {
    // Get current user and organization from localStorage
    const fetchUserContext = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
          const response = await fetch(`${apiUrl}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setCurrentUser(data.user);
            
            // Get current organization from localStorage
            try {
              const savedOrg = localStorage.getItem('selectedOrganization');
              if (savedOrg) {
                setCurrentOrganization(JSON.parse(savedOrg));
              } else if (data.user.organization) {
                setCurrentOrganization(data.user.organization);
              }
            } catch (e) {
              console.error('Error loading organization from localStorage:', e);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching user context:', err);
      }
    };
    
    fetchUserContext();
  }, []);

  useEffect(() => {
    const fetchTranscripts = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
          setError('Authentication required');
          setLoading(false);
          return;
        }
        
        // Check if "Only Blooms" is active
        const onlyBloomsActive = localStorage.getItem('onlyBlooms') === 'true';
        
        // Only master admins in master org context can see all transcripts
        // Others should see only their organization's transcripts
        let url = `${apiUrl}/api/transcripts`;
        
        // If Only Blooms is active, always filter by current organization
        if (onlyBloomsActive && currentOrganization?.id) {
          url = `${apiUrl}/api/transcripts?organizationId=${currentOrganization.id}`;
        }
        // Otherwise, if not a master admin or not in master org context, filter by current organization
        else if (!(isMasterAdmin && isMasterOrganizationSelected()) && currentOrganization?.id) {
          url = `${apiUrl}/api/transcripts?organizationId=${currentOrganization.id}`;
        }
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch transcripts');
        }
        
        const data = await response.json();
        setTranscripts(data);
        setFilteredTranscripts(data);
        
        // Extract unique organization names - only if master admin in master org
        if (isMasterAdmin && isMasterOrganizationSelected() && !onlyBloomsActive) {
          const uniqueOrganizations = [...new Set(data
            .filter(t => t.organizationId && t.organizationId.name)
            .map(t => t.organizationId.name)
          )];
          setOrganizations(uniqueOrganizations);
        } else {
          setOrganizations([]);
          setFilterOrganization(''); // Clear any organization filter
        }
      } catch (err) {
        setError('Error loading transcript history');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we have loaded the user and organization context
    if (currentUser && currentOrganization) {
      fetchTranscripts();
    }
  }, [currentUser, currentOrganization, isMasterAdmin]);
  
  // Listen for changes to the "Only Blooms" setting
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'onlyBlooms' && currentUser && currentOrganization) {
        // Refetch transcripts when Only Blooms setting changes
        fetchTranscripts();
      }
    };
    
    const fetchTranscripts = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        const token = localStorage.getItem('auth_token');
        const onlyBloomsActive = localStorage.getItem('onlyBlooms') === 'true';
        
        let url = `${apiUrl}/api/transcripts`;
        
        // If Only Blooms is active, filter by current organization
        if (onlyBloomsActive && currentOrganization?.id) {
          url = `${apiUrl}/api/transcripts?organizationId=${currentOrganization.id}`;
        }
        // Otherwise, if not a master admin or not in master org context, filter by current organization
        else if (!(isMasterAdmin && isMasterOrganizationSelected()) && currentOrganization?.id) {
          url = `${apiUrl}/api/transcripts?organizationId=${currentOrganization.id}`;
        }
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch transcripts');
        }
        
        const data = await response.json();
        setTranscripts(data);
        setFilteredTranscripts(data);
        
        // Update organization filter options
        if (isMasterAdmin && isMasterOrganizationSelected() && !onlyBloomsActive) {
          const uniqueOrganizations = [...new Set(data
            .filter(t => t.organizationId && t.organizationId.name)
            .map(t => t.organizationId.name)
          )];
          setOrganizations(uniqueOrganizations);
        } else {
          setOrganizations([]);
          setFilterOrganization('');
        }
      } catch (err) {
        console.error('Error refreshing transcripts:', err);
      } finally {
        setLoading(false);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentUser, currentOrganization, isMasterAdmin]);
  
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

  const onlyBloomsActive = localStorage.getItem('onlyBlooms') === 'true';

  return (
    <div className="history-container">
      <h2>Transcript History</h2>
      
      {/* Only show organization filter for master admins in master org context and Only Blooms is not active*/}
      {isMasterAdmin && isMasterOrganizationSelected() && !onlyBloomsActive && organizations.length > 0 && (
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
                {isMasterAdmin && isMasterOrganizationSelected() && !onlyBloomsActive && transcript.organizationId && (
                  <span className="organization-badge">
                    Org: {transcript.organizationId.name}
                  </span>
                )}
                {/* Display transcript ID */}
                <span className="transcript-id-badge">
                  ID: {transcript._id}
                </span>
                <span className="transcript-info-item">
                  <span className="info-label">Source:</span>
                  <span className={`badge ${
                    transcript.source === 'api' ? 'badge-primary' : 
                    transcript.source === 'audio' ? 'badge-warning' : 
                    transcript.source === 'nectar-desk-webhook' ? 'badge-nectar' : 
                    'badge-secondary'
                  }`}>
                    {transcript.source === 'api' ? 'API' : 
                     transcript.source === 'audio' ? 'Audio Upload' : 
                     transcript.source === 'nectar-desk-webhook' ? 'NectarDesk' : 
                     'Web UI'}
                  </span>
                </span>
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