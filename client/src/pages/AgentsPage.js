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
  BriefcaseIcon,
  EyeIcon
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
        console.log(`Master admin selected specific organization for filtering: ${selectedOrg}`);
        url += `&organizationId=${selectedOrg}`;
        // Also update the header to prioritize this selection
        config.headers['x-organization-id'] = selectedOrg;
      }
      
      console.log(`Fetching agents for organization: ${organization.name}, ID: ${orgId}`);
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

      console.log(`Received ${fetchedAgents.length} agents for ${organization.name}`);
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
  
  // Update agents when current page, filters, or selected organization changes
  useEffect(() => {
    if (currentOrganization && !loading) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        console.log('Organization changed or filters updated, reloading agents for:', currentOrganization.name);
        fetchAgentsForOrganization(currentOrganization, token);
      }
    }
  }, [currentPage, selectedOrg, selectedStatus, currentOrganization]);

  // Also update when the component mounts
  useEffect(() => {
    // This is now handled by the first useEffect that depends on currentOrganization
  }, [API_BASE_URL]);

  // Recalculate pagination based on total count
  const recalculatePagination = (total) => {
    const calculatedPages = Math.ceil(total / itemsPerPage);
    setTotalPages(calculatedPages || 1);
    
    // Ensure current page is not greater than total pages
    if (currentPage > calculatedPages && calculatedPages > 0) {
      setCurrentPage(calculatedPages);
    }
  };

  // Helper function to render score or N/A
  const renderScoreOrNA = (score) => {
    if (score === undefined || score === null) return 'N/A';
    if (typeof score === 'number') {
      return score.toFixed(1);
    }
    return 'N/A';
  };

  // Get score color class
  const getScoreColorClass = (score) => {
    if (score === undefined || score === null) return '';
    if (score >= 8) return 'score-high';
    if (score >= 6) return 'score-medium';
    return 'score-low';
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch(status.toLowerCase()) {
      case 'active': return 'status-active';
      case 'inactive': return 'status-inactive';
      case 'training': return 'status-training';
      case 'terminated': return 'status-terminated';
      default: return '';
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

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    // The filtering is already done via the useEffect
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleOrgChange = (e) => {
    setSelectedOrg(e.target.value);
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handleStatusChange = (e) => {
    setSelectedStatus(e.target.value);
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedOrg('all');
    setSelectedStatus('');
    setCurrentPage(1);
  };

  // Handle agent deletion
  const handleDeleteAgent = async (agentId, e) => {
    e.preventDefault();
    if (!window.confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
      return;
    }
    
    setCurrentlyDeletingId(agentId);
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      await axios.delete(`${API_BASE_URL}/api/agents/${agentId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Remove from local state
      setAgents(agents.filter(agent => agent._id !== agentId));
      setFilteredAgents(filteredAgents.filter(agent => agent._id !== agentId));
      
    } catch (error) {
      console.error('Error deleting agent:', error);
      setDeleteError(
        error.response?.data?.error || 
        'An error occurred while deleting the agent. Please try again.'
      );
    } finally {
      setIsDeleting(false);
      setCurrentlyDeletingId(null);
    }
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
          
          <button 
            onClick={handleClearFilters} 
            className="action-button"
          >
            Clear Filters
          </button>
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
          <div className="agents-table-container">
            <table className="agents-table compact-table">
              <colgroup>
                <col style={{width: '20%'}} />
                <col style={{width: '10%'}} />
                <col style={{width: '5%'}} />
                <col style={{width: '5%'}} />
                <col style={{width: '5%'}} />
                <col style={{width: '5%'}} />
                <col style={{width: '8%'}} />
                <col style={{width: '20%'}} />
                <col style={{width: '22%'}} />
              </colgroup>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Status</th>
                  <th>CS</th>
                  <th>PK</th>
                  <th>PE</th>
                  <th>PS</th>
                  <th>Calls</th>
                  <th>Organization</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map(agent => {
                  const agentName = `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Unnamed Agent';
                  const performanceMetrics = agent.performanceMetrics?.currentPeriod?.averageScores || {};
                  const callCount = agent.performanceMetrics?.currentPeriod?.callCount || 0;
                  let orgName = '';
                  
                  if (typeof agent.organizationId === 'object' && agent.organizationId?.name) {
                    orgName = agent.organizationId.name;
                  } else if ((currentOrganization?.isMaster || currentUser?.isMasterAdmin) && typeof agent.organizationId === 'string') {
                    const org = organizations.find(o => o._id === agent.organizationId);
                    if (org) {
                      orgName = org.name;
                    }
                  }
                  
                  const isBeingDeleted = currentlyDeletingId === agent._id;

                  return (
                    <tr key={agent._id} className={isBeingDeleted ? 'deleting' : ''}>
                      <td><Link to={`/agents/${agent._id}`}>{agentName}</Link></td>
                      <td>
                        <span className={`status-badge ${getStatusBadgeClass(agent.status || 'unknown')}`}>
                          {agent.status || 'Unknown'}
                        </span>
                      </td>
                      <td className={getScoreColorClass(performanceMetrics.customerService)}>
                        {renderScoreOrNA(performanceMetrics.customerService)}
                      </td>
                      <td className={getScoreColorClass(performanceMetrics.productKnowledge)}>
                        {renderScoreOrNA(performanceMetrics.productKnowledge)}
                      </td>
                      <td className={getScoreColorClass(performanceMetrics.processEfficiency)}>
                        {renderScoreOrNA(performanceMetrics.processEfficiency)}
                      </td>
                      <td className={getScoreColorClass(performanceMetrics.problemSolving)}>
                        {renderScoreOrNA(performanceMetrics.problemSolving)}
                      </td>
                      <td>{callCount}</td>
                      <td>{orgName || 'Unknown'}</td>
                      <td>
                        <div className="table-actions">
                          <Link to={`/agents/${agent._id}`} className="table-action view-action">
                            <EyeIcon className="action-icon" /> View
                          </Link>
                          <Link to={`/agents/${agent._id}/edit`} className="table-action edit-action">
                            <PencilSquareIcon className="action-icon" /> Edit
                          </Link>
                          <button 
                            onClick={(e) => handleDeleteAgent(agent._id, e)}
                            className="table-action delete-action"
                            disabled={isDeleting || currentlyDeletingId === agent._id}
                          >
                            <TrashIcon className="action-icon" /> Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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