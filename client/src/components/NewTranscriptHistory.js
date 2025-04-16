import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Loading from './Loading';

const NewTranscriptHistory = () => {
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [organizationInfo, setOrganizationInfo] = useState(null);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterOrg, setFilterOrg] = useState('all');
  
  useEffect(() => {
    const fetchUserInfo = () => {
      const token = localStorage.getItem('token');
      const organization = localStorage.getItem('organization');
      const email = localStorage.getItem('email');
      
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return false;
      }
      
      try {
        const orgData = organization ? JSON.parse(organization) : null;
        setOrganizationInfo(orgData);
        setUser({ email });
        return true;
      } catch (err) {
        console.error('Error parsing organization data:', err);
        setError('Invalid organization data');
        setLoading(false);
        return false;
      }
    };
    
    const init = async () => {
      const userInfoValid = fetchUserInfo();
      if (userInfoValid) {
        await fetchTranscripts();
      }
    };
    
    init();
  }, [page, filterOrg]);
  
  const parseAnyResponseFormat = (response) => {
    console.log('API Response format:', JSON.stringify(response, null, 2));
    
    // Standard format
    if (response && response.transcripts && Array.isArray(response.transcripts)) {
      console.log('Found standard transcripts array format');
      return {
        transcripts: response.transcripts,
        totalPages: response.totalPages || 1
      };
    }
    
    // Alternative data format
    if (response && response.data && Array.isArray(response.data)) {
      console.log('Found data array format');
      return {
        transcripts: response.data,
        totalPages: response.totalPages || response.total_pages || 1
      };
    }
    
    // Direct array
    if (Array.isArray(response)) {
      console.log('Found direct array format');
      return {
        transcripts: response,
        totalPages: 1
      };
    }
    
    // Format with records
    if (response && response.records && Array.isArray(response.records)) {
      console.log('Found records array format');
      return {
        transcripts: response.records,
        totalPages: response.totalPages || response.total_pages || 1
      };
    }
    
    // Format with results
    if (response && response.results && Array.isArray(response.results)) {
      console.log('Found results array format');
      return {
        transcripts: response.results,
        totalPages: response.totalPages || response.total_pages || 1
      };
    }
    
    // Deeply nested - try to find any array that could be transcripts
    const findArrays = (obj, depth = 0) => {
      if (depth > 3) return null; // Limit recursion depth
      
      if (!obj || typeof obj !== 'object') return null;
      
      for (const key in obj) {
        if (Array.isArray(obj[key]) && obj[key].length > 0 && obj[key][0].hasOwnProperty('transcriptId')) {
          console.log(`Found potential transcript array at key: ${key}`);
          return obj[key];
        }
        
        if (typeof obj[key] === 'object') {
          const result = findArrays(obj[key], depth + 1);
          if (result) return result;
        }
      }
      
      return null;
    };
    
    const deepArray = findArrays(response);
    if (deepArray) {
      return {
        transcripts: deepArray,
        totalPages: 1
      };
    }
    
    console.error('Could not parse API response to find transcripts array:', response);
    return {
      transcripts: [],
      totalPages: 0
    };
  };

  const fetchTranscripts = async () => {
    setLoading(true);
    setError(null);
    
    const token = localStorage.getItem('token');
    
    if (!token) {
      setError('Authentication required');
      setLoading(false);
      return;
    }
    
    let apiUrl = `/api/transcript/history?page=${page}`;
    if (filterOrg !== 'all' && organizationInfo) {
      apiUrl += `&organizationId=${filterOrg}`;
    }
    
    try {
      console.log(`Fetching transcripts from: ${apiUrl}`);
      const response = await axios.get(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('Raw API response:', response.data);
      
      const { transcripts, totalPages } = parseAnyResponseFormat(response.data);
      
      setTranscripts(transcripts || []);
      setTotalPages(totalPages || 1);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching transcripts:', err);
      
      if (err.response && err.response.status === 401) {
        setError('Your session has expired. Please log in again.');
        // Redirect to login after a short delay
        setTimeout(() => {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }, 2000);
      } else {
        setError(`Error loading transcripts: ${err.response?.data?.message || err.message}`);
      }
      
      setLoading(false);
    }
  };
  
  const redirectToLogin = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('organization');
    localStorage.removeItem('email');
    window.location.href = '/login';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return dateString;
    }
  };
  
  const renderSourceBadge = (source) => {
    let badgeClass = 'badge-default';
    let displayText = 'Unknown';
    
    if (!source) {
      return <span className="source-badge badge-default">Unknown</span>;
    }
    
    if (source === 'api') {
      badgeClass = 'badge-api';
      displayText = 'API';
    } else if (source === 'audio') {
      badgeClass = 'badge-audio';
      displayText = 'Audio';
    } else if (source === 'nectar-desk-webhook') {
      badgeClass = 'badge-nectar-desk';
      displayText = 'NectarDesk';
    }
    
    return <span className={`source-badge ${badgeClass}`}>{displayText}</span>;
  };
  
  const truncateText = (text, maxLength = 150) => {
    if (!text) return 'No transcript available';
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };
  
  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };
  
  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };
  
  const handleLogout = () => {
    redirectToLogin();
  };
  
  if (loading) {
    return (
      <div className="loading-spinner">
        <Loading />
        <p>Loading transcript history...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-message">
        <h3>Error</h3>
        <p>{error}</p>
        <button 
          onClick={handleLogout} 
          className="btn btn-danger"
        >
          Log Out
        </button>
      </div>
    );
  }

  if (transcripts.length === 0) {
    return (
      <div className="no-transcripts">
        <h3>No transcripts found</h3>
        <p>There are no transcripts in your history yet.</p>
        <Link to="/" className="btn btn-primary">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="transcript-history-container">
      <h2>Transcript History</h2>
      
      {organizationInfo && organizationInfo.isMasterOrg && (
        <div className="filter-controls mb-4">
          <div className="form-group">
            <label htmlFor="orgFilter">Filter by Organization:</label>
            <select 
              id="orgFilter" 
              className="form-control"
              value={filterOrg}
              onChange={(e) => setFilterOrg(e.target.value)}
            >
              <option value="all">All Organizations</option>
              <option value={organizationInfo.id}>Current Organization Only</option>
            </select>
          </div>
        </div>
      )}
      
      <div className="transcript-list">
        {transcripts.map((transcript) => (
          <div key={transcript.transcriptId || transcript._id} className="transcript-card">
            <div className="transcript-header">
              <div className="transcript-metadata">
                <span className="transcript-date">
                  {formatDate(transcript.createdAt || transcript.date)}
                </span>
                {renderSourceBadge(transcript.source)}
                {transcript.score !== undefined && (
                  <span className={`source-badge ${transcript.score >= 0.7 ? 'badge-success' : transcript.score >= 0.5 ? 'badge-warning' : 'badge-danger'}`}>
                    Score: {Math.round(transcript.score * 100)}%
                  </span>
                )}
              </div>
              {transcript.organizationId && (
                <span className="organization-badge">
                  {transcript.organizationName || transcript.organizationId}
                </span>
              )}
            </div>
            
            <div className="transcript-details">
              <div>
                <strong>
                  {transcript.callType === 'hearing' ? 'Patient' : 'Customer'}:
                </strong>{' '}
                {transcript.customerName || 'Unknown'}
              </div>
              <div>
                <strong>Agent:</strong> {transcript.agentName || 'Unknown'}
              </div>
            </div>
            
            <div className="transcript-preview">
              {truncateText(transcript.rawTranscript || transcript.transcript)}
            </div>
            
            <div className="transcript-actions">
              <Link 
                to={`/transcript/${transcript.transcriptId || transcript._id}`}
                className="view-details-btn"
              >
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>
      
      {totalPages > 1 && (
        <div className="pagination-controls">
          <button 
            onClick={handlePrevPage}
            disabled={page === 1}
          >
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button 
            onClick={handleNextPage}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default NewTranscriptHistory; 