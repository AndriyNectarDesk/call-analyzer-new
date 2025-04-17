import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import axios from 'axios';
import { ClockIcon, BuildingOfficeIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import '../components/TranscriptHistory.css';

const TranscriptsHistoryPage = () => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const organization = authContext?.organization;
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

  useEffect(() => {
    fetchTranscripts();
    if (organization?.isMaster) {
      fetchOrganizations();
    }
  }, [user, organization, currentPage, selectedOrg, dateRange]);

  const fetchOrganizations = async () => {
    try {
      const response = await axios.get('/api/organizations');
      if (response.data && Array.isArray(response.data.organizations)) {
        setOrganizations(response.data.organizations);
      }
    } catch (err) {
      console.error('Error fetching organizations:', err);
    }
  };

  const fetchTranscripts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!user || !organization) {
        console.log('User or organization not available yet');
        setLoading(false);
        return;
      }

      let url = `/api/transcripts?page=${currentPage}&limit=${itemsPerPage}`;
      
      // Add organization filter for master org if a specific organization is selected
      if (organization.isMaster && selectedOrg !== 'all') {
        url += `&organizationId=${selectedOrg}`;
      }
      
      // Add date filters if provided
      if (dateRange.startDate) {
        url += `&startDate=${dateRange.startDate}`;
      }
      
      if (dateRange.endDate) {
        url += `&endDate=${dateRange.endDate}`;
      }

      const response = await axios.get(url);

      if (!response.data) {
        throw new Error('Invalid response format: missing data property');
      }

      // Extract transcripts and pagination data
      const { transcripts: fetchedTranscripts, pagination } = response.data;
      
      if (!Array.isArray(fetchedTranscripts)) {
        throw new Error('Invalid response format: transcripts is not an array');
      }

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
        errorMessage = 'Network error: Please check your connection';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
    else if (organization?.isMaster && typeof transcript.organizationId === 'string') {
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
            {organization?.isMaster && transcript.organizationId?._id === organization._id && (
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
          {organization?.isMaster && (
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