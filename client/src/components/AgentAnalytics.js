import React, { useState, useEffect } from 'react';

function AgentAnalytics() {
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [agents, setAgents] = useState([]);
  const [agentMetrics, setAgentMetrics] = useState(null);
  const [timeRange, setTimeRange] = useState('all'); // 'all', 'month', 'week'

  useEffect(() => {
    const fetchTranscripts = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/transcripts`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch transcripts');
        }
        
        const data = await response.json();
        setTranscripts(data);
        
        // Extract unique agent names
        const uniqueAgents = [...new Set(data
          .map(t => t.analysis.callSummary.agentName)
          .filter(name => name && name.trim() !== '')
        )];
        setAgents(uniqueAgents);

        // Auto-select first agent if available
        if (uniqueAgents.length > 0 && !selectedAgent) {
          setSelectedAgent(uniqueAgents[0]);
        }
      } catch (err) {
        setError('Error loading transcript data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTranscripts();
  }, []);

  // Filter transcripts based on time range
  const getFilteredTranscripts = () => {
    if (!transcripts.length) return [];
    
    let filtered = [...transcripts];
    
    if (timeRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      if (timeRange === 'month') {
        cutoffDate.setMonth(now.getMonth() - 1);
      } else if (timeRange === 'week') {
        cutoffDate.setDate(now.getDate() - 7);
      }
      
      filtered = filtered.filter(t => new Date(t.createdAt) >= cutoffDate);
    }
    
    if (selectedAgent) {
      filtered = filtered.filter(
        t => t.analysis.callSummary.agentName === selectedAgent
      );
    }
    
    return filtered;
  };

  // Calculate agent performance metrics
  useEffect(() => {
    if (!selectedAgent) {
      setAgentMetrics(null);
      return;
    }
    
    const filteredTranscripts = getFilteredTranscripts();
    
    if (filteredTranscripts.length === 0) {
      setAgentMetrics({ callCount: 0 });
      return;
    }
    
    // Calculate average scores
    const avgScores = {
      customerService: 0,
      productKnowledge: 0,
      processEfficiency: 0,
      problemSolving: 0,
      overallScore: 0
    };
    
    // Count occurrences of improvement areas
    const improvementAreas = {};
    
    // Count occurrences of strengths
    const strengths = {};
    
    // Call type distribution
    const callTypes = {};
    
    // Track score evolution over time
    const scoreEvolution = [];
    
    filteredTranscripts.forEach(transcript => {
      // Add scores
      Object.keys(avgScores).forEach(key => {
        avgScores[key] += transcript.analysis.scorecard[key] || 0;
      });
      
      // Count improvement areas
      transcript.analysis.agentPerformance.areasForImprovement.forEach(area => {
        const normalized = area.toLowerCase().trim();
        improvementAreas[normalized] = (improvementAreas[normalized] || 0) + 1;
      });
      
      // Count strengths
      transcript.analysis.agentPerformance.strengths.forEach(strength => {
        const normalized = strength.toLowerCase().trim();
        strengths[normalized] = (strengths[normalized] || 0) + 1;
      });
      
      // Call type
      const callType = transcript.callType || 'unknown';
      callTypes[callType] = (callTypes[callType] || 0) + 1;
      
      // Track score evolution
      scoreEvolution.push({
        date: new Date(transcript.createdAt),
        overallScore: transcript.analysis.scorecard.overallScore || 0,
        customerService: transcript.analysis.scorecard.customerService || 0,
        productKnowledge: transcript.analysis.scorecard.productKnowledge || 0
      });
    });
    
    // Calculate averages
    Object.keys(avgScores).forEach(key => {
      avgScores[key] = parseFloat((avgScores[key] / filteredTranscripts.length).toFixed(1));
    });
    
    // Get all improvement areas
    const allImprovementAreas = Object.entries(improvementAreas)
      .sort((a, b) => b[1] - a[1])
      .map(([area, count]) => ({
        area,
        count,
        percentage: Math.round((count / filteredTranscripts.length) * 100)
      }));
    
    // Get all strengths
    const allStrengths = Object.entries(strengths)
      .sort((a, b) => b[1] - a[1])
      .map(([strength, count]) => ({
        strength,
        count,
        percentage: Math.round((count / filteredTranscripts.length) * 100)
      }));
    
    // Format call type distribution
    const callTypeDistribution = Object.entries(callTypes)
      .map(([type, count]) => ({
        type: type === 'flower' ? 'Flower Shop' : 
              type === 'hearing' ? 'Hearing Aid Clinic' : 
              type === 'auto' ? 'Auto-detected' : type,
        count,
        percentage: Math.round((count / filteredTranscripts.length) * 100)
      }));
    
    // Sort score evolution by date
    scoreEvolution.sort((a, b) => a.date - b.date);
    
    // Set the combined metrics
    setAgentMetrics({
      callCount: filteredTranscripts.length,
      avgScores,
      allImprovementAreas,
      allStrengths,
      callTypeDistribution,
      scoreEvolution
    });
  }, [selectedAgent, timeRange, transcripts]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading agent analytics...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="agent-analytics-container">
      <h2>Agent Analytics</h2>
      
      <div className="analytics-controls">
        <div className="control-group">
          <label htmlFor="agentSelect">Select Agent:</label>
          <select 
            id="agentSelect" 
            value={selectedAgent} 
            onChange={(e) => setSelectedAgent(e.target.value)}
          >
            <option value="">Select an agent</option>
            {agents.map(agent => (
              <option key={agent} value={agent}>{agent}</option>
            ))}
          </select>
        </div>
        
        <div className="control-group">
          <label htmlFor="timeRange">Time Range:</label>
          <select 
            id="timeRange" 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="month">Last Month</option>
            <option value="week">Last Week</option>
          </select>
        </div>
      </div>
      
      {selectedAgent && agentMetrics ? (
        <div className="analytics-dashboard">
          <div className="analytics-header">
            <h3>{selectedAgent}'s Performance Dashboard</h3>
            <div className="call-count-badge">
              {agentMetrics.callCount} calls analyzed
              {timeRange !== 'all' && ` in the ${timeRange === 'month' ? 'last month' : 'last week'}`}
            </div>
          </div>
          
          {agentMetrics.callCount === 0 ? (
            <div className="no-data-message">
              No call data available for this agent {timeRange !== 'all' && ` in the selected time period`}.
            </div>
          ) : (
            <>
              <div className="metrics-overview">
                <div className="metric-card primary">
                  <div className="metric-value">{agentMetrics.avgScores.overallScore}</div>
                  <div className="metric-label">Overall Score</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">{agentMetrics.avgScores.customerService}</div>
                  <div className="metric-label">Customer Service</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">{agentMetrics.avgScores.productKnowledge}</div>
                  <div className="metric-label">Product Knowledge</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">{agentMetrics.avgScores.processEfficiency}</div>
                  <div className="metric-label">Process Efficiency</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">{agentMetrics.avgScores.problemSolving}</div>
                  <div className="metric-label">Problem Solving</div>
                </div>
              </div>
              
              <div className="analytics-grid">
                <div className="analytics-card call-type-distribution">
                  <h4>Call Type Distribution</h4>
                  <div className="distribution-chart">
                    {agentMetrics.callTypeDistribution.map((item, index) => (
                      <div key={index} className="distribution-item">
                        <div className="distribution-label">{item.type}</div>
                        <div className="distribution-bar-container">
                          <div 
                            className="distribution-bar" 
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                          <span className="distribution-percentage">{item.percentage}%</span>
                        </div>
                        <div className="distribution-count">{item.count} calls</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="analytics-card improvement-areas">
                  <h4>Areas for Improvement</h4>
                  <div className="scroll-container">
                    <ul className="metrics-list">
                      {agentMetrics.allImprovementAreas.map((item, index) => (
                        <li key={index}>
                          <div className="metric-item">
                            <span className="metric-name">{item.area}</span>
                            <div className="metric-bar-container">
                              <div 
                                className="metric-bar" 
                                style={{ width: `${item.percentage}%` }}
                              ></div>
                              <span className="metric-percentage">{item.percentage}%</span>
                            </div>
                            <span className="metric-count">({item.count})</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="analytics-card strengths">
                  <h4>Key Strengths</h4>
                  <div className="scroll-container">
                    <ul className="metrics-list">
                      {agentMetrics.allStrengths.map((item, index) => (
                        <li key={index}>
                          <div className="metric-item">
                            <span className="metric-name">{item.strength}</span>
                            <div className="metric-bar-container">
                              <div 
                                className="metric-bar strength-bar" 
                                style={{ width: `${item.percentage}%` }}
                              ></div>
                              <span className="metric-percentage">{item.percentage}%</span>
                            </div>
                            <span className="metric-count">({item.count})</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="analytics-card performance-evolution">
                <h4>Performance Evolution</h4>
                <div className="evolution-container">
                  <div className="evolution-legend">
                    <div className="legend-item">
                      <span className="legend-color overall-color"></span>
                      <span>Overall Score</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-color customer-service-color"></span>
                      <span>Customer Service</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-color product-knowledge-color"></span>
                      <span>Product Knowledge</span>
                    </div>
                  </div>
                  
                  <div className="evolution-chart">
                    {/* We're showing a simplified representation */}
                    <div className="chart-container">
                      {agentMetrics.scoreEvolution.length > 1 ? (
                        <div className="chart-placeholder">
                          Historical performance chart would be displayed here
                        </div>
                      ) : (
                        <div className="chart-message">
                          More data points needed to display performance trend
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="select-agent-message">
          Please select an agent to view their performance analytics
        </div>
      )}
    </div>
  );
}

export default AgentAnalytics; 