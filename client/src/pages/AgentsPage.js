import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
  UserIcon, 
  BuildingOfficeIcon, 
  ArrowRightIcon, 
  PencilSquareIcon, 
  TrashIcon,
  PhoneIcon,
  EnvelopeIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline';
import '../components/AgentList.css';

const AgentsPage = () => {
  // Organization handling
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [userOrganizations, setUserOrganizations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Agents state
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedOrg, setSelectedOrg] = useState('all');
  const [organizations, setOrganizations] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const itemsPerPage = 10;
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [currentlyDeletingId, setCurrentlyDeletingId] = useState(null);
  
  // Base URL for the API
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://call-analyzer-api.onrender.com';

  // Get the current user and organization on component mount
  useEffect(() => {
    const fetchUserAndOrganization = async () => {
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
          setUserOrganizations(user.organizations);
          
          // Set the current organization to the first one by default
          const firstOrg = user.organizations[0];
          setCurrentOrganization(firstOrg);
          
          // If the user is a master admin, fetch all organizations for filtering
          if (user.isMasterAdmin) {
            const orgsResponse = await axios.get(`${API_BASE_URL}/api/organizations`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            setOrganizations(orgsResponse.data.organizations || []);
          }
          
          // Fetch agents for the first organization
          fetchAgentsForOrganization(firstOrg, token);
        } else {
          setError('User has no associated organizations');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching user and organization data:', error);
        setError('Failed to load user data');
        setLoading(false);
      }
    };
    
    fetchUserAndOrganization();
  }, [API_BASE_URL]);

  // Fetch agents for the given organization
  const fetchAgentsForOrganization = async (organization, token) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get organization ID
      const orgId = organization._id || organization.id;
      
      // Build the URL with pagination parameters
      let url = `${API_BASE_URL}/api/agents?offset=${(currentPage - 1) * itemsPerPage}&limit=${itemsPerPage}`;
      
      // Add status filter if selected
      if (selectedStatus) {
        url += `&status=${selectedStatus}`;
      }
      
      // Create headers configuration with organization context
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-organization-id': orgId,
          'x-organization-name': organization.name || 'Unknown',
          'x-organization-is-master': (organization.isMaster || currentUser?.isMasterAdmin) ? 'true' : 'false'
        }
      };
      
      // Add organization filter for master org if a specific organization is selected
      if ((organization.isMaster || currentUser?.isMasterAdmin) && selectedOrg !== 'all') {
        url += `&organizationId=${selectedOrg}`;
        // Also update the header to prioritize this selection
        config.headers['x-organization-id'] = selectedOrg;
      }
      
      console.log('Request URL:', url);
      console.log('Request headers:', JSON.stringify(config.headers, null, 2));
      
      const response = await axios.get(url, config);
      console.log('API Response:', response.data);

      if (!response.data) {
        throw new Error('Invalid response format: missing data property');
      }

      // Extract agents and pagination data
      const { agents: fetchedAgents, pagination } = response.data;
      
      if (!Array.isArray(fetchedAgents)) {
        throw new Error('Invalid response format: agents is not an array');
      }

      console.log(`Received ${fetchedAgents.length} agents`);
      setAgents(fetchedAgents);
      setFilteredAgents(fetchedAgents);
      
      // Update pagination if available
      if (pagination) {
        setTotalCount(pagination.total || 0);
        recalculatePagination(pagination.total || 0);
      }
    } catch (err) {
      console.error('Error fetching agents:', err);
      
      let errorMessage = 'Failed to load agents';
      
      if (err.response) {
        console.error('Error response status:', err.response.status);
        console.error('Error response data:', err.response.data);
        if (err.response.status === 401) {
          errorMessage = 'Authentication error: Please log in again';
        } else if (err.response.status === 403) {
          errorMessage = 'You do not have permission to access these agents';
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
  
  // Update agents when current page or filters change
  useEffect(() => {
    if (currentOrganization && !loading) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        fetchAgentsForOrganization(currentOrganization, token);
      }
    }
  }, [currentPage, selectedOrg, selectedStatus]);

  // Recalculate pagination based on total count
  const recalculatePagination = (total) => {
    const calculatedPages = Math.ceil(total / itemsPerPage);
    setTotalPages(calculatedPages || 1);
    
    // Ensure current page is not greater than total pages
    if (currentPage > calculatedPages && calculatedPages > 0) {
      setCurrentPage(calculatedPages);
    }
  };

  // Filter agents based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredAgents(agents);
    } else {
      const lowercasedTerm = searchTerm.toLowerCase();
      const filtered = agents.filter(agent => {
        const searchableText = [
          agent.firstName || '',
          agent.lastName || '',
          agent.email || '',
          agent.department || '',
          agent.position || '',
          agent.externalId || ''
        ].map(text => String(text).toLowerCase()).join(' ');
        
        return searchableText.includes(lowercasedTerm);
      });
      setFilteredAgents(filtered);
    }
  }, [searchTerm, agents]);
  
  // Delete an agent
  const handleDeleteAgent = async (agentId, e) => {
    e.preventDefault();
    
    if (!window.confirm('Are you sure you want to delete this agent? This cannot be undone.')) {
      return;
    }
    
    try {
      setIsDeleting(true);
      setCurrentlyDeletingId(agentId);
      setDeleteError(null);
      
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        setDeleteError('Authentication token missing');
        return;
      }
      
      // Get organization ID
      const orgId = currentOrganization._id || currentOrganization.id;
      
      await axios.delete(`${API_BASE_URL}/api/agents/${agentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-organization-id': orgId,
          'x-organization-name': currentOrganization.name || 'Unknown',
          'x-organization-is-master': (currentOrganization.isMaster || currentUser?.isMasterAdmin) ? 'true' : 'false'
        }
      });
      
      // Remove the agent from the list
      setAgents(agents.filter(agent => agent._id !== agentId));
      setFilteredAgents(filteredAgents.filter(agent => agent._id !== agentId));
      
      // Recalculate pagination
      recalculatePagination(totalCount - 1);
      
    } catch (err) {
      console.error('Error deleting agent:', err);
      setDeleteError('Failed to delete agent');
    } finally {
      setIsDeleting(false);
      setCurrentlyDeletingId(null);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // The filtering is handled by the useEffect
  };

  const handleOrgChange = (e) => {
    setSelectedOrg(e.target.value);
    setCurrentPage(1); // Reset to first page when changing organization filter
  };

  const handleStatusChange = (e) => {
    setSelectedStatus(e.target.value);
    setCurrentPage(1); // Reset to first page when changing status filter
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
    setSelectedStatus('');
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'status-active';
      case 'inactive': return 'status-inactive';
      case 'training': return 'status-training';
      case 'terminated': return 'status-terminated';
      default: return 'status-inactive';
    }
  };

  const getScoreColorClass = (score) => {
    if (!score && score !== 0) return '';
    if (score >= 80) return 'score-high';
    if (score >= 60) return 'score-medium';
    return 'score-low';
  };

  const renderScoreOrNA = (score) => {
    if (!score && score !== 0) return 'N/A';
    return score.toFixed(1);
  };

  const renderAgentCard = (agent) => {
    // Ensure we have a proper organization name
    let orgName = '';
    
    // If agent has organizationId as an object with name property
    if (typeof agent.organizationId === 'object' && agent.organizationId?.name) {
      orgName = agent.organizationId.name;
    } 
    // If organizationId is a string but we're in master org, try to find the name
    else if ((currentOrganization?.isMaster || currentUser?.isMasterAdmin) && typeof agent.organizationId === 'string') {
      const org = organizations.find(o => o._id === agent.organizationId);
      if (org) {
        orgName = org.name;
      }
    }

    // Get the agent's name
    const agentName = `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Unnamed Agent';
    
    // Get performance metrics
    const performanceMetrics = agent.performanceMetrics?.currentPeriod?.averageScores || {};
    const overallScore = performanceMetrics.overallScore;
    
    // Check if this agent is currently being deleted
    const isBeingDeleted = currentlyDeletingId === agent._id;

    return (
      <div key={agent._id} className={`agent-card ${isBeingDeleted ? 'deleting' : ''}`}>
        <div className="agent-header">
          <h3 className="agent-title">
            {agent._id ? (
              <Link to={`/agents/${agent._id}`}>
                {agentName}
              </Link>
            ) : agentName}
          </h3>
          <div className="header-badges">
            {agent.status && (
              <span className={`status-badge ${getStatusBadgeClass(agent.status)}`}>
                {agent.status}
              </span>
            )}
            {agent.department && (
              <span className="department-badge">
                {agent.department}
              </span>
            )}
            {overallScore !== undefined && (
              <span className={`score-badge ${getScoreColorClass(overallScore)}`}>
                {renderScoreOrNA(overallScore)}/100
              </span>
            )}
          </div>
        </div>
        
        <div className="agent-details">
          <div className="agent-detail-item">
            <span className="detail-label">Email</span>
            <span className="detail-value">{agent.email || 'Not provided'}</span>
          </div>
          
          <div className="agent-detail-item">
            <span className="detail-label">Phone</span>
            <span className="detail-value">{agent.phone || 'Not provided'}</span>
          </div>
          
          <div className="agent-detail-item">
            <span className="detail-label">Position</span>
            <span className="detail-value">{agent.position || 'Not specified'}</span>
          </div>
          
          <div className="agent-detail-item">
            <span className="detail-label">External ID</span>
            <span className="detail-value">{agent.externalId || 'None'}</span>
          </div>
        </div>
        
        {agent.performanceMetrics?.currentPeriod?.averageScores && (
          <div className="agent-metrics">
            <div className="metrics-header">Performance Metrics</div>
            <div className="metrics-grid">
              <div className="metric-item">
                <span className="metric-label">Customer Service</span>
                <span className="metric-value">
                  {renderScoreOrNA(performanceMetrics.customerService)}
                </span>
              </div>
              
              <div className="metric-item">
                <span className="metric-label">Product Knowledge</span>
                <span className="metric-value">
                  {renderScoreOrNA(performanceMetrics.productKnowledge)}
                </span>
              </div>
              
              <div className="metric-item">
                <span className="metric-label">Process Efficiency</span>
                <span className="metric-value">
                  {renderScoreOrNA(performanceMetrics.processEfficiency)}
                </span>
              </div>
              
              <div className="metric-item">
                <span className="metric-label">Problem Solving</span>
                <span className="metric-value">
                  {renderScoreOrNA(performanceMetrics.problemSolving)}
                </span>
              </div>
              
              <div className="metric-item">
                <span className="metric-label">Call Count</span>
                <span className="metric-value">
                  {agent.performanceMetrics?.currentPeriod?.callCount || 0}
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div className="agent-meta-info">
          <div className="meta-item">
            <UserIcon width={16} height={16} />
            Created: {formatDate(agent.createdAt)}
          </div>
          
          <div className="meta-item">
            <BuildingOfficeIcon width={16} height={16} />
            {orgName || 'Unknown Organization'}
          </div>
        </div>
        
        <div className="agent-actions">
          {agent._id && (
            <>
              <Link to={`/agents/${agent._id}`} className="action-button">
                <ArrowRightIcon width={16} height={16} />
                View Details
              </Link>
              
              <Link to={`/agents/${agent._id}/edit`} className="action-button">
                <PencilSquareIcon width={16} height={16} />
                Edit
              </Link>
              
              <button 
                onClick={(e) => handleDeleteAgent(agent._id, e)}
                className="action-button delete"
                disabled={isDeleting || currentlyDeletingId === agent._id}
                aria-label="Delete agent"
                title="Delete agent"
              >
                <TrashIcon width={16} height={16} />
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="agent-history-container">
      <h1>Agents</h1>
      
      <div className="agent-controls">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search agents..."
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
            <label htmlFor="status-filter">Status:</label>
            <select
              id="status-filter"
              value={selectedStatus}
              onChange={handleStatusChange}
              className="status-filter-select"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="training">Training</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
          
          {(searchTerm || selectedOrg !== 'all' || selectedStatus) && (
            <button 
              onClick={handleClearFilters} 
              className="action-button"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
      
      {deleteError && (
        <div className="error-message">
          {deleteError}
        </div>
      )}
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading agents...</p>
        </div>
      ) : filteredAgents.length > 0 ? (
        <>
          <div className="agents-list">
            {filteredAgents.map(renderAgentCard)}
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
          
          <div className="add-agent-button-container" style={{ marginTop: '20px', textAlign: 'right' }}>
            <Link 
              to="/agents/add" 
              className="action-button" 
              style={{ 
                backgroundColor: '#4a6cf7', 
                color: 'white',
                padding: '10px 20px'
              }}
            >
              Add New Agent
            </Link>
          </div>
        </>
      ) : (
        <div className="no-agents">
          <p>No agents found{searchTerm ? ` matching "${searchTerm}"` : ''}.</p>
          {(searchTerm || selectedOrg !== 'all' || selectedStatus) && (
            <button onClick={handleClearFilters} className="action-button">
              Clear Filters
            </button>
          )}
          <div style={{ marginTop: '20px' }}>
            <Link 
              to="/agents/add" 
              className="action-button" 
              style={{ 
                backgroundColor: '#4a6cf7', 
                color: 'white',
                padding: '10px 20px'
              }}
            >
              Add New Agent
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentsPage; 