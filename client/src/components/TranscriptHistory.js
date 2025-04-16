import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { ClockIcon, BuildingOfficeIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import './TranscriptHistory.css';

const TranscriptHistory = () => {
  const { user, organization } = useContext(AuthContext);
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

  useEffect(() => {
    fetchTranscripts();
    if (organization?.isMaster) {
      fetchOrganizations();
    }
  }, [user, organization, currentPage, selectedOrg]);

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

      console.log('Fetching transcripts with current context:', { 
        organizationId: organization._id,
        isMaster: organization.isMaster,
        selectedOrg
      });

      let url = `/api/transcripts?page=${currentPage}&limit=${itemsPerPage}`;
      
      // If master org and specific org selected
      if (organization.isMaster && selectedOrg !== 'all') {
        url += `&organizationId=${selectedOrg}`;
      }

      const response = await axios.get(url);

      // Validate response structure
      if (!response.data) {
        throw new Error('Invalid response format: missing data property');
      }

      console.log('API response received:', response.data);

      // Extract transcripts and pagination data
      const { transcripts: fetchedTranscripts, pagination } = response.data;
      
      if (!Array.isArray(fetchedTranscripts)) {
        throw new Error('Invalid response format: transcripts is not an array');
      }

      setTranscripts(fetchedTranscripts);
      setFilteredTranscripts(fetchedTranscripts);
      
      // Update pagination if available
      if (pagination) {
        setTotalPages(pagination.totalPages || 1);
        setTotalCount(pagination.totalCount || 0);
      }
      
      console.log(`Loaded ${fetchedTranscripts.length} transcripts`);
    } catch (err) {
      console.error('Error fetching transcripts:', err);
      
      let errorMessage = 'Failed to load transcripts';
      
      if (err.response) {
        // Server responded with an error status
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
        // Request made but no response received
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
          transcript.organizationName || ''
        ].map(text => text.toLowerCase()).join(' ');
        
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
    let orgName = transcript.organizationName || '';
    
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
            {organization?.isMaster && transcript.organizationId === organization._id && (
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
      <h1>Transcript History</h1>
      
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
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="reset-filters-button">
              Clear Search
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TranscriptHistory; 
