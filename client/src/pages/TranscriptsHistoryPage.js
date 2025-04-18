import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ClockIcon, BuildingOfficeIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import '../components/TranscriptHistory.css';

const TranscriptsHistoryPage = () => {
  // Organization handling
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [userOrganizations, setUserOrganizations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Transcripts state
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTranscripts, setFilteredTranscripts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedOrg, setSelectedOrg] = useState('all');
  const [organizations, setOrganizations] = useState([]);
  const itemsPerPage = 10;
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  
  // Base URL for the API
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://call-analyzer-api.onrender.com';
  
  // Initial fetching of user and organizations
  useEffect(() => {
    const fetchUserAndOrganizations = async () => {
      try {
        console.log('Fetching user and organizations data...');
        
        // Check if token exists
        const token = localStorage.getItem('auth_token');
        if (!token) {
          console.error('No token found');
          setError('Authentication token not found. Please log in again.');
          setLoading(false);
          return;
        }
        
        // Get user data from localStorage
        const userData = localStorage.getItem('user_data');
        let parsedUser = null;
        if (userData) {
          try {
            parsedUser = JSON.parse(userData);
            console.log('User data loaded from localStorage:', parsedUser.email);
            setCurrentUser(parsedUser);
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
        
        // Setup headers for authentication
        const headers = {
          'Authorization': `Bearer ${token}`
        };
        
        // Add cache-busting parameter
        const timestamp = new Date().getTime();
        
        // Fetch organizations from the master-admin endpoint
        console.log(`Fetching organizations from: ${API_BASE_URL}/api/master-admin/organizations?nocache=${timestamp}`);
        
        const orgsResponse = await axios.get(
          `${API_BASE_URL}/api/master-admin/organizations?nocache=${timestamp}`,
          { headers }
        );
        
        let accessibleOrgs = [];
        if (!orgsResponse.data || !Array.isArray(orgsResponse.data) || orgsResponse.data.length === 0) {
          console.warn('No organizations found');
        } else {
          console.log(`Found ${orgsResponse.data.length} organizations`);
          // Filter organizations based on user access
          accessibleOrgs = parsedUser?.isMasterAdmin 
            ? orgsResponse.data 
            : orgsResponse.data.filter(org => 
                parsedUser?.organizations?.includes(org._id) || 
                org._id === parsedUser?.organizationId
              );
          
          setOrganizations(accessibleOrgs);
          setUserOrganizations(accessibleOrgs);
        }
        
        // Try to get organization from localStorage
        const savedOrg = localStorage.getItem('selectedOrganization');
        let selectedOrg = null;
        
        if (savedOrg) {
          try {
            const parsedOrg = JSON.parse(savedOrg);
            console.log('Found saved organization in localStorage:', parsedOrg);
            
            // If we have organizations from API, find the matching one
            if (accessibleOrgs && Array.isArray(accessibleOrgs) && accessibleOrgs.length > 0) {
              // Look for matching organization by ID
              const matchedOrg = accessibleOrgs.find(
                org => org._id === parsedOrg.id
              );
              
              if (matchedOrg) {
                console.log('Found matching organization:', matchedOrg.name);
                selectedOrg = matchedOrg;
              } else {
                console.warn('Saved organization not found in API response');
                // Use the saved one anyway
                selectedOrg = parsedOrg;
              }
            } else {
              // No orgs from API, use the saved one
              selectedOrg = parsedOrg;
            }
          } catch (e) {
            console.error('Error parsing saved organization:', e);
          }
        }
        
        // If no saved org was found or parsed, use the first available organization
        if (!selectedOrg && accessibleOrgs && Array.isArray(accessibleOrgs) && accessibleOrgs.length > 0) {
          selectedOrg = accessibleOrgs[0];
          console.log('Using first available organization:', selectedOrg.name);
          
          // Save it to localStorage for future use
          try {
            localStorage.setItem('selectedOrganization', JSON.stringify({
              id: selectedOrg._id,
              name: selectedOrg.name,
              code: selectedOrg.code
            }));
            
            console.log('Saved first organization to localStorage');
          } catch (e) {
            console.error('Error saving organization to localStorage:', e);
          }
        }
        
        // If we have a valid organization, set it and fetch transcripts
        if (selectedOrg) {
          console.log('Setting current organization:', selectedOrg.name);
          setCurrentOrganization(selectedOrg);
          
          // Now fetch transcripts for this organization
          await fetchTranscriptsForOrganization(selectedOrg, token);
        } else {
          console.error('No organization available after all attempts');
          setError('No organization available. Please contact your administrator.');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error in fetchUserAndOrganizations:', err);
        setError(`Error loading data: ${err.message}`);
        setLoading(false);
      }
    };
    
    fetchUserAndOrganizations();
  }, [API_BASE_URL]);
  
  // For changing organization (Master admin feature)
  const handleSwitchOrganization = (org) => {
    if (!org || !org._id) return;
    
    console.log('Switching to organization:', org.name);
    setCurrentOrganization(org);
    setError(null);
    
    // Save to localStorage
    try {
      localStorage.setItem('selectedOrganization', JSON.stringify({
        id: org._id,
        name: org.name,
        code: org.code
      }));
      
      console.log('Saved organization to localStorage');
    } catch (e) {
      console.error('Error saving organization to localStorage:', e);
    }
    
    // Fetch transcripts for the new organization
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetchTranscriptsForOrganization(org, token);
    }
  };

  const fetchTranscriptsForOrganization = async (organization, token) => {
    if (!organization || (!organization._id && !organization.id)) {
      console.error('Invalid organization provided to fetchTranscriptsForOrganization');
      setError('Invalid organization data');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Get organization ID - handle both formats
      const orgId = organization._id || organization.id;
      console.log('Fetching transcripts for organization:', organization.name || orgId);
      
      let url = `${API_BASE_URL}/api/transcripts?page=${currentPage}&limit=${itemsPerPage}`;
      
      // Create headers configuration
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-organization-id': orgId,
          'x-organization-name': organization.name || 'Unknown',
          'x-organization-is-master': (organization.isMaster || currentUser?.isMasterAdmin) ? 'true' : 'false'
        }
      };
      
      // Add organization filter for master org if a specific organization is selected
      // Note: We keep this for backward compatibility, but the x-organization-id header will take precedence
      if ((organization.isMaster || currentUser?.isMasterAdmin) && selectedOrg !== 'all') {
        url += `&organizationId=${selectedOrg}`;
        // Also update the header to prioritize this selection
        config.headers['x-organization-id'] = selectedOrg;
      }
      
      // Add date filters if provided
      if (dateRange.startDate) {
        url += `&startDate=${dateRange.startDate}`;
      }
      
      if (dateRange.endDate) {
        url += `&endDate=${dateRange.endDate}`;
      }

      console.log('Requesting transcripts from URL:', url);
      console.log('Request config:', JSON.stringify(config));
      
      const response = await axios.get(url, config);
      console.log('API Response:', response.data);

      if (!response.data) {
        throw new Error('Invalid response format: missing data property');
      }

      // Extract transcripts and pagination data
      const { transcripts: fetchedTranscripts, pagination } = response.data;
      
      if (!Array.isArray(fetchedTranscripts)) {
        throw new Error('Invalid response format: transcripts is not an array');
      }

      console.log(`Received ${fetchedTranscripts.length} transcripts`);
      setTranscripts(fetchedTranscripts);
      setFilteredTranscripts(fetchedTranscripts);
      
      // Update pagination if available
      if (pagination) {
        setTotalPages(pagination.pages || 1);
        setTotalCount(pagination.total || 0);
      }
    } catch (err) {
      console.error('Error fetching transcripts:', err);
      
      let errorMessage = 'Failed to load transcripts';
      
      if (err.response) {
        console.error('Error response:', err.response.status, err.response.data);
        if (err.response.status === 401) {
          errorMessage = 'Authentication error: Please log in again';
        } else if (err.response.status === 403) {
          errorMessage = 'You do not have permission to access these transcripts';
        } else if (err.response.status >= 500) {
          errorMessage = 'Server error: Please try again later';
        } else {
          errorMessage = `Error: ${err.response.data.message || 'Unknown error'}`;
        }
      } else if (err.request) {
        console.error('Request error - no response received');
        errorMessage = 'Network error: Please check your connection';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Update transcripts when current page or filters change
  useEffect(() => {
    if (currentOrganization && !loading) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        fetchTranscriptsForOrganization(currentOrganization, token);
      }
    }
  }, [currentPage, selectedOrg, dateRange]);

  // Filter transcripts based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredTranscripts(transcripts);
    } else {
      const lowercasedTerm = searchTerm.toLowerCase();
      const filtered = transcripts.filter(transcript => {
        const searchableText = [
          transcript.rawTranscript?.substring(0, 200) || '',
          transcript.callType || '',
          transcript.source || '',
          transcript.metadata?.title || '',
          transcript.organizationId?.name || ''
        ].map(text => String(text).toLowerCase()).join(' ');
        
        return searchableText.includes(lowercasedTerm);
      });
      setFilteredTranscripts(filtered);
    }
  }, [searchTerm, transcripts]);
  
  // Helper method to determine if user can filter by organizations
  const canFilterByOrganizations = () => {
    return (
      // Master admins can filter by all organizations
      currentUser?.isMasterAdmin || 
      // Users with access to multiple organizations can filter
      (Array.isArray(currentUser?.organizations) && currentUser.organizations.length > 0) ||
      // Organization admins might be able to filter by sub-organizations
      currentUser?.isAdmin
    );
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // The filtering is handled by the useEffect
  };

  const handleOrgChange = (e) => {
    setSelectedOrg(e.target.value);
    setCurrentPage(1); // Reset to first page when changing organization filter
  };

  const handleDateChange = (e) => {
    setDateRange({
      ...dateRange,
      [e.target.name]: e.target.value
    });
    setCurrentPage(1); // Reset to first page when changing date filters
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedOrg('all');
    setDateRange({ startDate: '', endDate: '' });
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getCallTypeBadgeClass = (callType) => {
    switch (callType?.toLowerCase()) {
      case 'flower': return 'badge-flower';
      case 'hearing': return 'badge-hearing';
      default: return 'badge-auto';
    }
  };

  const renderTranscriptCard = (transcript) => {
    // Ensure we have a proper organization name
    let orgName = '';
    
    // If transcript has organizationId as an object with name property
    if (typeof transcript.organizationId === 'object' && transcript.organizationId?.name) {
      orgName = transcript.organizationId.name;
    } 
    // If organizationId is a string but we're in master org, try to find the name
    else if ((currentOrganization?.isMaster || currentUser?.isMasterAdmin) && typeof transcript.organizationId === 'string') {
      const org = organizations.find(o => o._id === transcript.organizationId);
      if (org) {
        orgName = org.name;
      }
    }

    // Format the source display
    const sourceDisplay = () => {
      switch(transcript.source) {
        case 'api': return 'API';
        case 'audio': return 'Audio Upload';
        case 'nectar-desk-webhook': return 'NectarDesk';
        case 'web': return 'Web UI';
        default: return transcript.source || 'Unknown';
      }
    };

    // Calculate average score from scorecard if available
    const calculateAvgScore = () => {
      if (transcript.analysis && transcript.analysis.scorecard) {
        const scores = Object.values(transcript.analysis.scorecard);
        if (scores.length > 0) {
          const sum = scores.reduce((total, score) => total + score, 0);
          return (sum / scores.length).toFixed(1);
        }
      }
      return null;
    };

    const avgScore = calculateAvgScore();
    
    // Determine score color class based on value
    const getScoreColorClass = (score) => {
      if (score >= 8) return 'score-high';
      if (score >= 6) return 'score-medium';
      return 'score-low';
    };

    return (
      <div key={transcript._id} className="transcript-card">
        <div className="transcript-header">
          <h3 className="transcript-title">
            <Link to={`/transcripts/${transcript._id}`}>
              {transcript.metadata?.title || `Transcript ${transcript._id.substring(0, 8)}`}
            </Link>
          </h3>
          <div className="header-badges">
            {transcript.callType && (
              <span className={`call-type-badge ${getCallTypeBadgeClass(transcript.callType)}`}>
                {transcript.callType}
              </span>
            )}
            <span className="source-badge">
              {sourceDisplay()}
            </span>
            {avgScore && (
              <span className={`score-badge ${getScoreColorClass(avgScore)}`}>
                {avgScore}/10
              </span>
            )}
          </div>
        </div>
        
        {/* Call summary section that uses actual transcript data */}
        <div style={{
          border: 'none',
          padding: '10px 15px',
          borderRadius: '4px',
          backgroundColor: '#f9f9f9',
          marginBottom: '15px',
          fontWeight: '500',
          lineHeight: '1.5',
          fontSize: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
            <i className="fa fa-file-text-o" style={{ marginRight: '5px', color: '#555' }}></i>
            <span style={{ fontWeight: 'bold', color: '#555', fontSize: '14px' }}>Call Summary</span>
          </div>
          <span style={{ display: 'block', color: '#333' }}>
            {transcript.analysis?.callSummary?.briefSummary || 
             'No summary available for this call. Click View Details to see more information.'}
          </span>
        </div>
        
        <div className="transcript-footer">
          <div className="transcript-meta-info">
            <div className="timestamp">
              <ClockIcon width={16} height={16} />
              {formatDate(transcript.createdAt)}
            </div>
            
            <div className="organization">
              <BuildingOfficeIcon width={16} height={16} />
              {orgName || 'Unknown Organization'}
              {(currentOrganization?.isMaster || currentUser?.isMasterAdmin) && transcript.organizationId?._id === currentOrganization?._id && (
                <span className="master-badge">Master</span>
              )}
            </div>
          </div>
          
          <Link to={`/transcripts/${transcript._id}`} className="view-details">
            View Details <ArrowRightIcon width={16} height={16} />
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="transcript-history-container">
      <h1>Call Transcripts History</h1>
      
      <div className="history-controls">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search transcripts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-button">Search</button>
        </form>
        
        <div className="filter-controls">
          {(currentOrganization?.isMaster || currentUser?.isMasterAdmin) && (
            <div className="filter-control">
              <label htmlFor="organization-filter">Organization:</label>
              <select
                id="organization-filter"
                value={selectedOrg}
                onChange={handleOrgChange}
                className="org-filter-select"
              >
                <option value="all">All Organizations</option>
                {organizations.map(org => (
                  <option key={org._id} value={org._id}>{org.name}</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="filter-control">
            <label htmlFor="start-date">From:</label>
            <input 
              type="date" 
              id="start-date" 
              name="startDate"
              value={dateRange.startDate} 
              onChange={handleDateChange}
              className="date-filter-input"
            />
          </div>
          
          <div className="filter-control">
            <label htmlFor="end-date">To:</label>
            <input 
              type="date" 
              id="end-date" 
              name="endDate"
              value={dateRange.endDate} 
              onChange={handleDateChange}
              className="date-filter-input"
            />
          </div>
          
          <button 
            onClick={handleClearFilters} 
            className="clear-filters-button"
          >
            Clear Filters
          </button>
        </div>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading transcripts...</p>
        </div>
      ) : filteredTranscripts.length > 0 ? (
        <>
          <div className="transcripts-list">
            {filteredTranscripts.map(renderTranscriptCard)}
          </div>
          
          <div className="pagination">
            <button 
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="pagination-button"
            >
              Previous
            </button>
            
            <div className="pagination-info">
              Page {currentPage} of {totalPages} ({totalCount} total)
            </div>
            
            <button 
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="pagination-button"
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <div className="no-transcripts">
          <p>No transcripts found{searchTerm ? ` matching "${searchTerm}"` : ''}.</p>
          {(searchTerm || selectedOrg !== 'all' || dateRange.startDate || dateRange.endDate) && (
            <button onClick={handleClearFilters} className="reset-filters-button">
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TranscriptsHistoryPage; 