import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/agentPerformance.css';

const AgentPerformancePage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentMetrics, setAgentMetrics] = useState(null);
  const [transcripts, setTranscripts] = useState([]);
  const [filter, setFilter] = useState({
    timeframe: '30', // 7, 30, 90 days
    sortBy: 'overallScore', // overallScore, callCount, etc.
    sortOrder: 'desc' // asc, desc
  });
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  const navigate = useNavigate();
  const { agentId } = useParams();
  
  // Base URL for the API
  const API_BASE_URL = process.env.REACT_APP_API_URL || '';
  
  // Initial loading of user and organization data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        console.log('Loading user and organization data...');
        
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
        
        // Get organization data from localStorage
        const savedOrg = localStorage.getItem('selectedOrganization');
        let selectedOrg = null;
        
        if (savedOrg) {
          try {
            selectedOrg = JSON.parse(savedOrg);
            console.log('Found saved organization in localStorage:', selectedOrg);
            setCurrentOrganization(selectedOrg);
            
            // Simply use the organization from localStorage and proceed to fetch agents
            // without additional validation - matching TranscriptsHistoryPage approach
            console.log('Using organization from localStorage:', selectedOrg.name || selectedOrg.id);
            await fetchAgentsForOrganization(selectedOrg, token);
          } catch (e) {
            console.error('Error parsing organization data:', e);
            setError('Error parsing organization data. Please try logging in again.');
            setLoading(false);
          }
        } else {
          console.error('No organization available');
          setError('No organization available. Please contact your administrator.');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error in initial data fetch:', err);
        setError(`Error loading data: ${err.message}`);
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, []);
  
  // Fetch all agents for the organization
  const fetchAgentsForOrganization = async (organization, token) => {
    if (!organization || (!organization._id && !organization.id)) {
      console.error('Invalid organization provided to fetchAgents');
      setError('Invalid organization data');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Get organization ID - handle both formats
      const orgId = organization._id || organization.id;
      console.log('Fetching agents for organization:', organization.name || orgId);
      
      // Create headers configuration
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-organization-id': orgId,
          'x-organization-name': organization.name || 'Unknown',
          'x-organization-is-master': (organization.isMaster || currentUser?.isMasterAdmin) ? 'true' : 'false'
        }
      };
      
      console.log('Request config:', JSON.stringify(config));
      
      const response = await axios.get(`${API_BASE_URL}/api/agents`, config);
      console.log('API response:', response);
      
      if (!response.data) {
        throw new Error('Invalid response format: missing data');
      }
      
      // Handle different potential response formats
      let agentsData = [];
      
      if (Array.isArray(response.data)) {
        console.log('Response data is an array');
        agentsData = response.data;
      } else if (response.data.agents && Array.isArray(response.data.agents)) {
        console.log('Response data contains agents array');
        agentsData = response.data.agents;
      } else {
        console.log('Response data format:', typeof response.data);
        // Try to find any array that might contain agents
        for (const key in response.data) {
          if (Array.isArray(response.data[key])) {
            const possibleAgents = response.data[key];
            if (possibleAgents.length > 0 && possibleAgents[0].firstName) {
              console.log(`Found agents array in key: ${key}`);
              agentsData = possibleAgents;
              break;
            }
          }
        }
      }
      
      console.log(`Found ${agentsData.length} agents`);
      
      // Sort agents based on filter
      const sortedAgents = [...agentsData].sort((a, b) => {
        const getMetricValue = (agent, metric) => {
          if (!agent.performanceMetrics || !agent.performanceMetrics.currentPeriod) {
            return 0;
          }
          
          if (metric === 'overallScore') {
            return agent.performanceMetrics.currentPeriod.averageScores?.overallScore || 0;
          } else if (metric === 'callCount') {
            return agent.performanceMetrics.currentPeriod.callCount || 0;
          } else if (metric === 'customerService') {
            return agent.performanceMetrics.currentPeriod.averageScores?.customerService || 0;
          } else if (metric === 'productKnowledge') {
            return agent.performanceMetrics.currentPeriod.averageScores?.productKnowledge || 0;
          }
          
          return 0;
        };
        
        const aValue = getMetricValue(a, filter.sortBy);
        const bValue = getMetricValue(b, filter.sortBy);
        
        return filter.sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
      });
      
      // Prioritize Shay Pearce if present
      const shayPearceIndex = sortedAgents.findIndex(
        agent => agent.firstName === 'Shay' && agent.lastName === 'Pearce'
      );
      
      if (shayPearceIndex !== -1) {
        const shayPearce = sortedAgents.splice(shayPearceIndex, 1)[0];
        sortedAgents.unshift(shayPearce);
      }
      
      setAgents(sortedAgents);
      
      // If agentId is provided in URL, select that agent
      if (agentId) {
        const agent = sortedAgents.find(a => a._id === agentId);
        if (agent) {
          setSelectedAgent(agent);
          fetchAgentDetails(agent._id, organization, token);
        } else if (sortedAgents.length > 0) {
          // If agent not found by ID, select first agent
          setSelectedAgent(sortedAgents[0]);
          fetchAgentDetails(sortedAgents[0]._id, organization, token);
          
          // Update URL without reloading page
          navigate(`/agents/performance/${sortedAgents[0]._id}`);
        }
      } else if (sortedAgents.length > 0) {
        // If no agent ID is provided, select first agent
        setSelectedAgent(sortedAgents[0]);
        fetchAgentDetails(sortedAgents[0]._id, organization, token);
        
        // Update URL without reloading page
        navigate(`/agents/performance/${sortedAgents[0]._id}`);
      }
    } catch (err) {
      console.error('Error fetching agents:', err);
      
      let errorMessage = 'Failed to load agents';
      
      if (err.response) {
        console.error('Error response:', err.response.status, err.response.data);
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
  
  // Fetch agent details and metrics
  const fetchAgentDetails = async (id, organization, token) => {
    if (!token) {
      token = localStorage.getItem('auth_token');
    }
    
    if (!organization) {
      organization = currentOrganization;
    }
    
    try {
      setLoading(true);
      
      // Get organization ID - handle both formats
      const orgId = organization._id || organization.id;
      
      // Create headers configuration
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-organization-id': orgId,
          'x-organization-name': organization.name || 'Unknown',
          'x-organization-is-master': (organization.isMaster || currentUser?.isMasterAdmin) ? 'true' : 'false'
        }
      };
      
      // Fetch agent performance metrics
      console.log(`Fetching performance metrics for agent ${id}`);
      const metricsResponse = await axios.get(`${API_BASE_URL}/api/agents/${id}/performance`, {
        ...config,
        params: {
          timeframe: filter.timeframe
        }
      });
      
      if (metricsResponse.data) {
        setAgentMetrics(metricsResponse.data);
      }
      
      // Fetch agent's recent transcripts
      console.log(`Fetching recent transcripts for agent ${id}`);
      const transcriptsResponse = await axios.get(`${API_BASE_URL}/api/transcripts`, {
        ...config,
        params: {
          agentId: id,
          limit: 10
        }
      });
      
      if (transcriptsResponse.data && transcriptsResponse.data.transcripts) {
        setTranscripts(transcriptsResponse.data.transcripts);
      } else if (Array.isArray(transcriptsResponse.data)) {
        setTranscripts(transcriptsResponse.data);
      } else {
        setTranscripts([]);
      }
      
    } catch (err) {
      console.error('Error fetching agent details:', err);
      setError('Failed to fetch agent details. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle agent selection
  const handleAgentSelect = (agent) => {
    setSelectedAgent(agent);
    
    const token = localStorage.getItem('auth_token');
    if (token && currentOrganization) {
      fetchAgentDetails(agent._id, currentOrganization, token);
    } else {
      fetchAgentDetails(agent._id);
    }
    
    // Update URL without page reload
    navigate(`/agents/performance/${agent._id}`);
  };
  
  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
    
    // Refetch data with new filters if an agent is selected
    if (selectedAgent) {
      const token = localStorage.getItem('auth_token');
      if (token && currentOrganization) {
        fetchAgentDetails(selectedAgent._id, currentOrganization, token);
      } else {
        fetchAgentDetails(selectedAgent._id);
      }
    }
  };
  
  // Format score as a number with 1 decimal place
  const formatScore = (score) => {
    if (score === undefined || score === null) return 'N/A';
    return parseFloat(score).toFixed(1);
  };
  
  // Calculate CSS class for scores
  const getScoreClass = (score) => {
    if (score === undefined || score === null) return '';
    if (score >= 7) return 'score-excellent';
    if (score >= 5) return 'score-good';
    if (score >= 3) return 'score-average';
    return 'score-poor';
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  // Format duration in minutes and seconds
  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  if (loading && !selectedAgent) {
    return (
      <div className="agent-performance-page">
        <div className="loading-indicator">Loading agent data...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="agent-performance-page">
        <div className="error-message">{error}</div>
      </div>
    );
  }
  
  return (
    <div className="agent-performance-page">
      <h1>Agent Performance Dashboard</h1>
      
      {/* Filter controls */}
      <div className="filter-controls">
        <div className="filter-item">
          <label htmlFor="timeframe">Time Period:</label>
          <select 
            id="timeframe" 
            name="timeframe" 
            value={filter.timeframe} 
            onChange={handleFilterChange}
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
        </div>
        
        <div className="filter-item">
          <label htmlFor="sortBy">Sort By:</label>
          <select 
            id="sortBy" 
            name="sortBy" 
            value={filter.sortBy} 
            onChange={handleFilterChange}
          >
            <option value="overallScore">Overall Score</option>
            <option value="callCount">Call Count</option>
            <option value="customerService">Customer Service</option>
            <option value="productKnowledge">Product Knowledge</option>
          </select>
        </div>
        
        <div className="filter-item">
          <label htmlFor="sortOrder">Order:</label>
          <select 
            id="sortOrder" 
            name="sortOrder" 
            value={filter.sortOrder} 
            onChange={handleFilterChange}
          >
            <option value="desc">Highest First</option>
            <option value="asc">Lowest First</option>
          </select>
        </div>
      </div>
      
      <div className="main-content">
        {/* Agent list sidebar */}
        <div className="agent-sidebar">
          <h2>Agents</h2>
          <div className="agent-list">
            {agents.length > 0 ? (
              agents.map(agent => (
                <div 
                  key={agent._id} 
                  className={`agent-list-item ${selectedAgent && selectedAgent._id === agent._id ? 'selected' : ''}`}
                  onClick={() => handleAgentSelect(agent)}
                >
                  <div className="agent-name">
                    {agent.firstName} {agent.lastName}
                  </div>
                  {agent.performanceMetrics?.currentPeriod?.averageScores?.overallScore !== undefined && (
                    <div className={`agent-score ${getScoreClass(agent.performanceMetrics.currentPeriod.averageScores.overallScore)}`}>
                      {formatScore(agent.performanceMetrics.currentPeriod.averageScores.overallScore)}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="no-agents-message">No agents found</div>
            )}
          </div>
        </div>
        
        {/* Agent details */}
        {selectedAgent ? (
          <div className="agent-details">
            <div className="agent-header">
              <h2>{selectedAgent.firstName} {selectedAgent.lastName}</h2>
              <div className="agent-info">
                <div><strong>ID:</strong> {selectedAgent.externalId || 'N/A'}</div>
                <div><strong>Email:</strong> {selectedAgent.email || 'N/A'}</div>
                <div><strong>Status:</strong> <span className={`status-badge status-${selectedAgent.status || 'unknown'}`}>{selectedAgent.status || 'Unknown'}</span></div>
              </div>
            </div>
            
            {loading ? (
              <div className="loading-indicator">Loading metrics...</div>
            ) : (
              <>
                {/* Performance metrics */}
                {agentMetrics?.currentPeriod ? (
                  <div className="metrics-section">
                    <h3>Performance Metrics</h3>
                    <div className="date-range">
                      {formatDate(agentMetrics.currentPeriod.startDate)} - {formatDate(agentMetrics.currentPeriod.endDate)}
                    </div>
                    
                    <div className="call-count-badge">
                      <div className="count">{agentMetrics.currentPeriod.callCount || 0}</div>
                      <div className="label">Calls</div>
                    </div>
                    
                    <div className="metrics-grid">
                      <div className="metric-card">
                        <div className="metric-label">Overall Score</div>
                        <div className={`metric-value ${getScoreClass(agentMetrics.currentPeriod.averageScores?.overallScore)}`}>
                          {formatScore(agentMetrics.currentPeriod.averageScores?.overallScore)}
                        </div>
                      </div>
                      
                      <div className="metric-card">
                        <div className="metric-label">Customer Service</div>
                        <div className={`metric-value ${getScoreClass(agentMetrics.currentPeriod.averageScores?.customerService)}`}>
                          {formatScore(agentMetrics.currentPeriod.averageScores?.customerService)}
                        </div>
                      </div>
                      
                      <div className="metric-card">
                        <div className="metric-label">Product Knowledge</div>
                        <div className={`metric-value ${getScoreClass(agentMetrics.currentPeriod.averageScores?.productKnowledge)}`}>
                          {formatScore(agentMetrics.currentPeriod.averageScores?.productKnowledge)}
                        </div>
                      </div>
                      
                      <div className="metric-card">
                        <div className="metric-label">Process Efficiency</div>
                        <div className={`metric-value ${getScoreClass(agentMetrics.currentPeriod.averageScores?.processEfficiency)}`}>
                          {formatScore(agentMetrics.currentPeriod.averageScores?.processEfficiency)}
                        </div>
                      </div>
                      
                      <div className="metric-card">
                        <div className="metric-label">Problem Solving</div>
                        <div className={`metric-value ${getScoreClass(agentMetrics.currentPeriod.averageScores?.problemSolving)}`}>
                          {formatScore(agentMetrics.currentPeriod.averageScores?.problemSolving)}
                        </div>
                      </div>
                      
                      <div className="metric-card">
                        <div className="metric-label">Avg Call Duration</div>
                        <div className="metric-value">
                          {formatDuration(agentMetrics.currentPeriod.avgCallDuration)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Strengths and areas for improvement */}
                    <div className="feedback-section">
                      <div className="strengths">
                        <h4>Top Strengths</h4>
                        {agentMetrics.historical && agentMetrics.historical[0]?.commonStrengths?.length > 0 ? (
                          <ul>
                            {agentMetrics.historical[0].commonStrengths.slice(0, 5).map((strength, index) => (
                              <li key={index}>{strength}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>No strengths data available</p>
                        )}
                      </div>
                      
                      <div className="improvement-areas">
                        <h4>Areas for Improvement</h4>
                        {agentMetrics.historical && agentMetrics.historical[0]?.commonAreasForImprovement?.length > 0 ? (
                          <ul>
                            {agentMetrics.historical[0].commonAreasForImprovement.slice(0, 5).map((area, index) => (
                              <li key={index}>{area}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>No improvement data available</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="no-metrics">
                    <p>No performance metrics available for this agent.</p>
                    <p>This may be because the agent has no analyzed call transcripts yet.</p>
                  </div>
                )}
                
                {/* Recent calls */}
                <div className="recent-calls-section">
                  <h3>Recent Calls</h3>
                  {transcripts.length > 0 ? (
                    <div className="transcripts-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Duration</th>
                            <th>Score</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transcripts.map(transcript => (
                            <tr key={transcript._id}>
                              <td>{formatDate(transcript.createdAt)}</td>
                              <td>{formatDuration(transcript.callDetails?.duration)}</td>
                              <td className={getScoreClass(transcript.analysis?.scorecard?.overallScore)}>
                                {formatScore(transcript.analysis?.scorecard?.overallScore)}
                              </td>
                              <td>
                                <button 
                                  className="button button-small"
                                  onClick={() => navigate(`/transcripts/${transcript._id}`)}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p>No recent calls found for this agent.</p>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="no-agent-selected">
            <p>Please select an agent from the list to view their performance data.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentPerformancePage;
