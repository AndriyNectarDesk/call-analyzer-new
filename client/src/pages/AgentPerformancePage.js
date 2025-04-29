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
  
  const navigate = useNavigate();
  const { agentId } = useParams();
  
  // Fetch all agents for the organization
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        
        const baseApiUrl = process.env.REACT_APP_API_URL || '';
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
          navigate('/login');
          return;
        }
        
        const response = await axios.get(`${baseApiUrl}/api/agents`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data && response.data.agents) {
          // Sort agents based on filter
          const sortedAgents = sortAgents(response.data.agents, filter);
          setAgents(sortedAgents);
          
          // Look for Shay Pearce first
          let shayPearce = sortedAgents.find(a => 
            (a.firstName === 'Shay' && a.lastName === 'Pearce') || 
            (a.firstName + ' ' + a.lastName === 'Shay Pearce')
          );
          
          // If agentId is provided in URL, select that agent
          if (agentId) {
            const agent = sortedAgents.find(a => a._id === agentId);
            if (agent) {
              setSelectedAgent(agent);
              fetchAgentDetails(agent._id);
            } else if (shayPearce) {
              // Fall back to Shay Pearce if the requested agent not found
              setSelectedAgent(shayPearce);
              fetchAgentDetails(shayPearce._id);
              // Update URL without reload
              navigate(`/agents/performance/${shayPearce._id}`);
            } else if (sortedAgents.length > 0) {
              // Otherwise select first agent
              setSelectedAgent(sortedAgents[0]);
              fetchAgentDetails(sortedAgents[0]._id);
              // Update URL without reload
              navigate(`/agents/performance/${sortedAgents[0]._id}`);
            }
          } else if (shayPearce) {
            // Prioritize showing Shay Pearce
            setSelectedAgent(shayPearce);
            fetchAgentDetails(shayPearce._id);
            // Update URL without reload
            navigate(`/agents/performance/${shayPearce._id}`);
          } else if (sortedAgents.length > 0) {
            // Otherwise select first agent
            setSelectedAgent(sortedAgents[0]);
            fetchAgentDetails(sortedAgents[0]._id);
            // Update URL without reload
            navigate(`/agents/performance/${sortedAgents[0]._id}`);
          }
        } else {
          setAgents([]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching agents:', err);
        setError('Failed to fetch agents. Please try again.');
        setLoading(false);
      }
    };
    
    fetchAgents();
  }, [agentId, navigate]);
  
  // Sort agents based on filter
  const sortAgents = (agents, filter) => {
    if (!agents || !Array.isArray(agents)) return [];
    
    const { sortBy, sortOrder } = filter;
    const direction = sortOrder === 'asc' ? 1 : -1;
    
    return [...agents].sort((a, b) => {
      // Handle sorting by different metrics
      if (sortBy === 'overallScore') {
        const scoreA = a.performanceMetrics?.currentPeriod?.averageScores?.overallScore || 0;
        const scoreB = b.performanceMetrics?.currentPeriod?.averageScores?.overallScore || 0;
        return direction * (scoreA - scoreB);
      } else if (sortBy === 'callCount') {
        const countA = a.performanceMetrics?.currentPeriod?.callCount || 0;
        const countB = b.performanceMetrics?.currentPeriod?.callCount || 0;
        return direction * (countA - countB);
      } else if (sortBy === 'customerService') {
        const scoreA = a.performanceMetrics?.currentPeriod?.averageScores?.customerService || 0;
        const scoreB = b.performanceMetrics?.currentPeriod?.averageScores?.customerService || 0;
        return direction * (scoreA - scoreB);
      } else if (sortBy === 'productKnowledge') {
        const scoreA = a.performanceMetrics?.currentPeriod?.averageScores?.productKnowledge || 0;
        const scoreB = b.performanceMetrics?.currentPeriod?.averageScores?.productKnowledge || 0;
        return direction * (scoreA - scoreB);
      }
      
      // Default sorting by name
      const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim();
      const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim();
      return nameA.localeCompare(nameB);
    });
  };
  
  // Fetch agent details and metrics
  const fetchAgentDetails = async (id) => {
    try {
      setLoading(true);
      
      const baseApiUrl = process.env.REACT_APP_API_URL || '';
      const token = localStorage.getItem('auth_token');
      
      // Fetch agent performance metrics
      const metricsResponse = await axios.get(`${baseApiUrl}/api/agents/${id}/performance`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          timeframe: filter.timeframe
        }
      });
      
      if (metricsResponse.data) {
        setAgentMetrics(metricsResponse.data);
      }
      
      // Fetch agent's recent transcripts
      const transcriptsResponse = await axios.get(`${baseApiUrl}/api/transcripts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          agentId: id,
          limit: 10
        }
      });
      
      if (transcriptsResponse.data && transcriptsResponse.data.transcripts) {
        setTranscripts(transcriptsResponse.data.transcripts);
      } else {
        setTranscripts([]);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching agent details:', err);
      setError('Failed to fetch agent details. Please try again.');
      setLoading(false);
    }
  };
  
  // Handle agent selection
  const handleAgentSelect = (agent) => {
    setSelectedAgent(agent);
    fetchAgentDetails(agent._id);
    // Update URL without page reload
    navigate(`/agents/performance/${agent._id}`);
  };
  
  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
    
    // If filter is sortBy or sortOrder, resort the agents
    if (name === 'sortBy' || name === 'sortOrder') {
      const newFilter = { ...filter, [name]: value };
      setAgents(sortAgents(agents, newFilter));
    }
    
    // Refetch data with new filters if an agent is selected
    if (selectedAgent) {
      fetchAgentDetails(selectedAgent._id);
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