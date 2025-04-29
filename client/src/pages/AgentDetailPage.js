import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  UserIcon, 
  BuildingOfficeIcon, 
  PencilSquareIcon, 
  TrashIcon,
  ArrowLeftIcon,
  PhoneIcon,
  CalendarIcon,
  ClockIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import './AgentDetailPage.css';

const AgentDetailPage = () => {
  const { id } = useParams();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Call history state
  const [callHistory, setCallHistory] = useState([]);
  const [callHistoryLoading, setCallHistoryLoading] = useState(false);
  const [callHistoryError, setCallHistoryError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCalls, setTotalCalls] = useState(0);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Base URL for the API
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://call-analyzer-api.onrender.com';

  useEffect(() => {
    const fetchUserAndAgent = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
          setError('Authentication token missing');
          setLoading(false);
          return;
        }
        
        // Get current user
        const userResponse = await axios.get(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const user = userResponse.data.user;
        setCurrentUser(user);
        
        // Get user's organization(s)
        if (user.organizations && user.organizations.length > 0) {
          // Set the current organization to the first one by default
          const firstOrg = user.organizations[0];
          setCurrentOrganization(firstOrg);
          
          // Fetch agent details
          await fetchAgentDetails(firstOrg, token);
        } else {
          setError('User has no associated organizations');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Failed to load user data');
        setLoading(false);
      }
    };
    
    fetchUserAndAgent();
  }, [id, API_BASE_URL]);

  // Fetch agent call history when agent ID is available and page changes
  useEffect(() => {
    if (agent && agent._id && currentOrganization) {
      fetchCallHistory(currentPage);
    }
  }, [agent, currentPage, currentOrganization, dateRange]);

  const fetchAgentDetails = async (organization, token) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get organization ID
      const orgId = organization._id || organization.id;
      
      // Create headers configuration with organization context
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-organization-id': orgId,
          'x-organization-name': organization.name || 'Unknown',
          'x-organization-is-master': (organization.isMaster || currentUser?.isMasterAdmin) ? 'true' : 'false'
        }
      };
      
      console.log(`Fetching agent details for ID: ${id}`);
      
      const response = await axios.get(`${API_BASE_URL}/api/agents/${id}`, config);
      
      if (!response.data) {
        throw new Error('Invalid response format');
      }

      setAgent(response.data);
    } catch (err) {
      console.error('Error fetching agent details:', err);
      
      let errorMessage = 'Failed to load agent details';
      
      if (err.response) {
        if (err.response.status === 404) {
          errorMessage = 'Agent not found';
        } else if (err.response.status === 401) {
          errorMessage = 'Authentication error: Please log in again';
        } else if (err.response.status === 403) {
          errorMessage = 'You do not have permission to access this agent';
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchCallHistory = async (page) => {
    if (!agent || !agent._id || !currentOrganization) return;
    
    try {
      setCallHistoryLoading(true);
      setCallHistoryError(null);
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setCallHistoryError('Authentication token missing');
        return;
      }
      
      // Get organization ID
      const orgId = currentOrganization._id || currentOrganization.id;
      
      // Build URL with parameters
      let url = `${API_BASE_URL}/api/transcripts/agent/${agent._id}?page=${page}&limit=5`;
      
      // Add date range filters if provided
      if (dateRange.startDate) {
        url += `&startDate=${dateRange.startDate}`;
      }
      
      if (dateRange.endDate) {
        url += `&endDate=${dateRange.endDate}`;
      }
      
      // Create headers with organization context
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-organization-id': orgId,
          'x-organization-name': currentOrganization.name || 'Unknown',
          'x-organization-is-master': (currentOrganization.isMaster || currentUser?.isMasterAdmin) ? 'true' : 'false'
        }
      };
      
      console.log(`Fetching call history for agent: ${agent._id}`);
      console.log('Request URL:', url);
      
      const response = await axios.get(url, config);
      
      if (!response.data) {
        throw new Error('Invalid response format');
      }
      
      const { transcripts, pagination } = response.data;
      
      setCallHistory(transcripts || []);
      setTotalPages(pagination?.pages || 1);
      setTotalCalls(pagination?.total || 0);
      
    } catch (err) {
      console.error('Error fetching agent call history:', err);
      
      let errorMessage = 'Failed to load call history';
      
      if (err.response) {
        if (err.response.status === 404) {
          errorMessage = 'No call history found';
        } else if (err.response.status === 401) {
          errorMessage = 'Authentication error';
        } else {
          errorMessage = err.response.data?.message || 'Error fetching call history';
        }
      }
      
      setCallHistoryError(errorMessage);
    } finally {
      setCallHistoryLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return 'N/A';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getScoreColorClass = (score) => {
    if (!score && score !== 0) return '';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderScoreOrNA = (score) => {
    if (!score && score !== 0) return 'N/A';
    return score.toFixed(1);
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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page
    fetchCallHistory(1);
  };

  const clearFilters = () => {
    setDateRange({
      startDate: '',
      endDate: ''
    });
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="loading-indicator">
        <div className="spinner"></div>
        <p>Loading agent details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <Link to="/agents" className="back-button">
          <ArrowLeftIcon width={16} height={16} />
          Back to Agents
        </Link>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="not-found-container">
        <h2>Agent Not Found</h2>
        <p>The agent you're looking for doesn't exist or you don't have permission to view it.</p>
        <Link to="/agents" className="back-button">
          <ArrowLeftIcon width={16} height={16} />
          Back to Agents
        </Link>
      </div>
    );
  }

  // Get organization name
  let orgName = '';
  if (typeof agent.organizationId === 'object' && agent.organizationId?.name) {
    orgName = agent.organizationId.name;
  }

  // Get performance metrics
  const performanceMetrics = agent.performanceMetrics?.currentPeriod?.averageScores || {};
  const overallScore = performanceMetrics.overallScore;

  return (
    <div className="agent-detail-container">
      <div className="agent-detail-header">
        <Link to="/agents" className="back-button">
          <ArrowLeftIcon width={16} height={16} />
          Back to Agents
        </Link>
        
        <div className="agent-actions">
          <Link to={`/agents/${agent._id}/edit`} className="action-button edit">
            <PencilSquareIcon width={16} height={16} />
            Edit Agent
          </Link>
        </div>
      </div>
      
      <div className="agent-detail-card">
        <div className="agent-info-header">
          <h1>{`${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Unnamed Agent'}</h1>
          
          {agent.status && (
            <span className={`status-badge ${agent.status.toLowerCase()}`}>
              {agent.status}
            </span>
          )}
        </div>
        
        <div className="agent-basic-info">
          <div className="info-group">
            <h3>Basic Information</h3>
            <div className="info-grid">
              {agent.email && (
                <div className="info-item">
                  <span className="info-label">Email</span>
                  <span className="info-value">{agent.email}</span>
                </div>
              )}
              
              {agent.phone && (
                <div className="info-item">
                  <span className="info-label">Phone</span>
                  <span className="info-value">{agent.phone}</span>
                </div>
              )}
              
              {agent.position && (
                <div className="info-item">
                  <span className="info-label">Position</span>
                  <span className="info-value">{agent.position}</span>
                </div>
              )}
              
              {agent.department && (
                <div className="info-item">
                  <span className="info-label">Department</span>
                  <span className="info-value">{agent.department}</span>
                </div>
              )}
              
              {agent.externalId && (
                <div className="info-item">
                  <span className="info-label">External ID</span>
                  <span className="info-value">{agent.externalId}</span>
                </div>
              )}
              
              <div className="info-item">
                <span className="info-label">Organization</span>
                <span className="info-value">{orgName || 'Unknown'}</span>
              </div>
              
              <div className="info-item">
                <span className="info-label">Created</span>
                <span className="info-value">{formatDate(agent.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {performanceMetrics && Object.keys(performanceMetrics).length > 0 && (
          <div className="agent-performance">
            <div className="info-group">
              <h3>Performance Metrics</h3>
              
              {overallScore !== undefined && (
                <div className="overall-score">
                  <span className="score-label">Overall Score</span>
                  <span className={`score-value ${getScoreColorClass(overallScore)}`}>
                    {renderScoreOrNA(overallScore)}/100
                  </span>
                </div>
              )}
              
              <div className="metrics-grid">
                <div className="metric-detail">
                  <span className="metric-label">Customer Service</span>
                  <span className={`metric-value ${getScoreColorClass(performanceMetrics.customerService)}`}>
                    {renderScoreOrNA(performanceMetrics.customerService)}
                  </span>
                </div>
                
                <div className="metric-detail">
                  <span className="metric-label">Product Knowledge</span>
                  <span className={`metric-value ${getScoreColorClass(performanceMetrics.productKnowledge)}`}>
                    {renderScoreOrNA(performanceMetrics.productKnowledge)}
                  </span>
                </div>
                
                <div className="metric-detail">
                  <span className="metric-label">Process Efficiency</span>
                  <span className={`metric-value ${getScoreColorClass(performanceMetrics.processEfficiency)}`}>
                    {renderScoreOrNA(performanceMetrics.processEfficiency)}
                  </span>
                </div>
                
                <div className="metric-detail">
                  <span className="metric-label">Problem Solving</span>
                  <span className={`metric-value ${getScoreColorClass(performanceMetrics.problemSolving)}`}>
                    {renderScoreOrNA(performanceMetrics.problemSolving)}
                  </span>
                </div>
                
                <div className="metric-detail">
                  <span className="metric-label">Call Count</span>
                  <span className="metric-value">
                    {agent.performanceMetrics?.currentPeriod?.callCount || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Call History Section */}
        <div className="call-history-section">
          <div className="section-header">
            <h3>Call History</h3>
            <button 
              className="filter-toggle-button"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FunnelIcon width={16} height={16} />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>
          
          {showFilters && (
            <div className="call-filters">
              <form onSubmit={handleApplyFilters}>
                <div className="filter-row">
                  <div className="filter-item">
                    <label htmlFor="startDate">Start Date</label>
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={dateRange.startDate}
                      onChange={handleFilterChange}
                    />
                  </div>
                  
                  <div className="filter-item">
                    <label htmlFor="endDate">End Date</label>
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={dateRange.endDate}
                      onChange={handleFilterChange}
                    />
                  </div>
                </div>
                
                <div className="filter-actions">
                  <button type="submit" className="filter-button apply">Apply Filters</button>
                  <button type="button" className="filter-button clear" onClick={clearFilters}>Clear Filters</button>
                </div>
              </form>
            </div>
          )}
          
          {callHistoryLoading ? (
            <div className="call-history-loading">
              <div className="spinner small"></div>
              <p>Loading call history...</p>
            </div>
          ) : callHistoryError ? (
            <div className="call-history-error">
              <p>{callHistoryError}</p>
            </div>
          ) : callHistory.length === 0 ? (
            <div className="no-calls-message">
              <p>No call records found for this agent.</p>
            </div>
          ) : (
            <>
              <div className="call-list">
                {callHistory.map(call => (
                  <div key={call._id} className="call-item">
                    <div className="call-header">
                      <div className="call-title">
                        <DocumentTextIcon width={18} height={18} />
                        <span>
                          {call.metadata?.title || 'Untitled Call'}
                        </span>
                      </div>
                      <div className="call-metrics">
                        {call.analysis?.scorecard?.overallScore !== undefined && (
                          <span className={`call-score ${getScoreColorClass(call.analysis.scorecard.overallScore)}`}>
                            Score: {call.analysis.scorecard.overallScore.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="call-body">
                      {call.analysis?.callSummary?.briefSummary && (
                        <div className="call-summary">
                          {call.analysis.callSummary.briefSummary}
                        </div>
                      )}
                    </div>
                    
                    <div className="call-footer">
                      <div className="call-meta">
                        <div className="meta-item">
                          <CalendarIcon width={14} height={14} />
                          {formatDateTime(call.createdAt)}
                        </div>
                        
                        <div className="meta-item">
                          <PhoneIcon width={14} height={14} />
                          {call.callDetails?.callDirection || 'Unknown'} call
                        </div>
                        
                        {call.callDetails?.duration && (
                          <div className="meta-item">
                            <ClockIcon width={14} height={14} />
                            {formatDuration(call.callDetails.duration)}
                          </div>
                        )}
                      </div>
                      
                      <div className="call-actions">
                        <Link to={`/transcripts/${call._id}`} className="call-view-button">
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {totalPages > 1 && (
                <div className="call-pagination">
                  <button 
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="pagination-button"
                  >
                    <ChevronLeftIcon width={16} height={16} />
                    Previous
                  </button>
                  
                  <span className="pagination-info">
                    Page {currentPage} of {totalPages} ({totalCalls} calls)
                  </span>
                  
                  <button 
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="pagination-button"
                  >
                    Next
                    <ChevronRightIcon width={16} height={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentDetailPage; 