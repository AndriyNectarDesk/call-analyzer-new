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
  
  // Fetch user data and available organizations on component mount
  useEffect(() => {
    const fetchUserAndOrganizations = async () => {
      try {
        console.log('Fetching user and organizations data...');
        
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setError('Authentication token not found. Please log in again.');
          setLoading(false);
          return;
        }
        
        // Fetch user data from local storage first
        const userData = localStorage.getItem('user_data');
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            setCurrentUser(parsedUser);
            console.log('User data loaded from local storage:', parsedUser.email);
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
        
        // Setup request headers
        const headers = {
          'Authorization': `Bearer ${token}`
        };
        
        // Force a unique timestamp to prevent caching
        const timestamp = new Date().getTime();
        
        // First, fetch all organizations (for master admins)
        try {
          const endpoint = `${API_BASE_URL}/api/master-admin/organizations?nocache=${timestamp}`;
          console.log('Fetching organizations from:', endpoint);
          
          const orgsResponse = await axios.get(endpoint, { headers });
          
          if (orgsResponse.data && orgsResponse.data.organizations && orgsResponse.data.organizations.length > 0) {
            console.log('Organizations loaded:', orgsResponse.data.organizations.length);
            setUserOrganizations(orgsResponse.data.organizations);
            setOrganizations(orgsResponse.data.organizations);
          }
        } catch (orgErr) {
          console.warn('Error fetching organizations list, might not be a master admin:', orgErr.message);
        }
        
        // Get selected organization from localStorage or use first available
        const savedOrg = localStorage.getItem('selectedOrganization');
        let selectedOrg = null;
        
        if (savedOrg) {
          try {
            const parsedOrg = JSON.parse(savedOrg);
            console.log('Found saved organization in localStorage:', parsedOrg.name || parsedOrg.id);
            selectedOrg = parsedOrg;
          } catch (e) {
            console.error('Error parsing saved organization:', e);
          }
        }
        
        // If we have a selected organization, set it as current
        if (selectedOrg) {
          console.log('Setting current organization:', selectedOrg.name || selectedOrg._id);
          setCurrentOrganization(selectedOrg);
          
          // Fetch transcripts for the selected organization
          fetchTranscriptsForOrganization(selectedOrg, token);
        } else {
          console.warn('No organization selected, attempting to get from user data');
          
          // As a fallback, try to get from user data
          if (currentUser && currentUser.organizationId) {
            // We need to fetch the organization details first
            try {
              const orgResponse = await axios.get(`${API_BASE_URL}/api/organizations/${currentUser.organizationId}`, { headers });
              
              if (orgResponse.data) {
                console.log('Fetched organization from user data:', orgResponse.data.name);
                setCurrentOrganization(orgResponse.data);
                
                // Save to localStorage for future use
                localStorage.setItem('selectedOrganization', JSON.stringify(orgResponse.data));
                
                // Fetch transcripts for this organization
                fetchTranscriptsForOrganization(orgResponse.data, token);
              }
            } catch (orgErr) {
              console.error('Error fetching organization details:', orgErr);
              setError('Could not load organization data. Please try refreshing the page.');
              setLoading(false);
            }
          } else {
            setError('No organization data available. Please try logging in again.');
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Error in fetchUserAndOrganizations:', err);
        setError(`Error loading data: ${err.message}`);
        setLoading(false);
      }
    };
    
    fetchUserAndOrganizations();
  }, [API_BASE_URL]);

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
      
      const orgId = organization._id || organization.id;
      console.log('Fetching transcripts for organization:', organization.name || orgId);
      
      let url = `${API_BASE_URL}/api/transcripts?page=${currentPage}&limit=${itemsPerPage}`;
      
      // Add organization filter for master org if a specific organization is selected
      if ((organization.isMaster || currentUser?.isMasterAdmin) && selectedOrg !== 'all') {
        url += `&organizationId=${selectedOrg}`;
      }
      
      // Add date filters if provided
      if (dateRange.startDate) {
        url += `&startDate=${dateRange.startDate}`;
      }
      
      if (dateRange.endDate) {
        url += `&endDate=${dateRange.endDate}`;
      }

      console.log('Requesting transcripts from URL:', url);
      
      // Add explicit headers to ensure auth and org context are passed
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-organization-id': orgId,
          'x-organization-name': organization.name || 'Unknown',
          'x-organization-is-master': (organization.isMaster || currentUser?.isMasterAdmin) ? 'true' : 'false'
        }
      };
      
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

    return (
      <div key={transcript._id} className="transcript-card">
        <div className="transcript-header">
          <h3 className="transcript-title">
            <Link to={`/transcripts/${transcript._id}`}>
              {transcript.metadata?.title || `Transcript ${transcript._id.substring(0, 8)}`}
            </Link>
          </h3>
          {transcript.callType && (
            <span className={`call-type-badge ${getCallTypeBadgeClass(transcript.callType)}`}>
              {transcript.callType}
            </span>
          )}
        </div>
        
        <div className="transcript-summary">
          {transcript.rawTranscript 
            ? `${transcript.rawTranscript.substring(0, 150)}${transcript.rawTranscript.length > 150 ? '...' : ''}`
            : 'No transcript content available'}
        </div>
        
        <div className="transcript-footer">
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