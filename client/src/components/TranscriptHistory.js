import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function TranscriptHistory() {
  const [transcripts, setTranscripts] = useState([]);
  const [filteredTranscripts, setFilteredTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [agents, setAgents] = useState([]);

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
        setFilteredTranscripts(data);
        
        // Extract unique agent names
        const uniqueAgents = [...new Set(data
          .map(t => t.analysis.callSummary.agentName)
          .filter(name => name && name.trim() !== '')
        )];
        setAgents(uniqueAgents);
      } catch (err) {
        setError('Error loading transcript history');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTranscripts();
  }, []);
  
  // Filter transcripts when filterAgent changes
  useEffect(() => {
    if (!filterAgent) {
      setFilteredTranscripts(transcripts);
    } else {
      setFilteredTranscripts(transcripts.filter(
        t => t.analysis.callSummary.agentName === filterAgent
      ));
    }
  }, [filterAgent, transcripts]);

  // Get a human-readable call type
  const getCallTypeLabel = (type) => {
    switch(type) {
      case 'flower': return 'Flower Shop';
      case 'hearing': return 'Hearing Aid Clinic';
      case 'auto': return 'Auto-detected';
      default: return type || 'Auto-detected';
    }
  };
  
  // Get a badge color based on call type
  const getCallTypeBadgeClass = (type) => {
    switch(type) {
      case 'flower': return 'badge-flower';
      case 'hearing': return 'badge-hearing';
      default: return 'badge-auto';
    }
  };

  // Calculate agent performance metrics
  const calculateAgentMetrics = (transcripts, agentName) => {
    if (!agentName || transcripts.length === 0) return null;
    
    const agentTranscripts = transcripts.filter(
      t => t.analysis.callSummary.agentName === agentName
    );
    
    if (agentTranscripts.length === 0) return null;
    
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
    
    agentTranscripts.forEach(transcript => {
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
    });
    
    // Calculate averages
    Object.keys(avgScores).forEach(key => {
      avgScores[key] = parseFloat((avgScores[key] / agentTranscripts.length).toFixed(1));
    });
    
    // Get top 3 improvement areas
    const topImprovementAreas = Object.entries(improvementAreas)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([area, count]) => ({
        area,
        count,
        percentage: Math.round((count / agentTranscripts.length) * 100)
      }));
    
    // Get top 3 strengths
    const topStrengths = Object.entries(strengths)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([strength, count]) => ({
        strength,
        count,
        percentage: Math.round((count / agentTranscripts.length) * 100)
      }));
    
    return {
      callCount: agentTranscripts.length,
      avgScores,
      topImprovementAreas,
      topStrengths
    };
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading transcripts...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }
  
  // Calculate metrics if filtering by agent
  const agentMetrics = calculateAgentMetrics(transcripts, filterAgent);

  return (
    <div className="history-container">
      <h2>Transcript History</h2>
      
      <div className="filter-controls">
        <div className="filter-group">
          <label htmlFor="agentFilter">Filter by Agent:</label>
          <select 
            id="agentFilter" 
            value={filterAgent} 
            onChange={(e) => setFilterAgent(e.target.value)}
          >
            <option value="">All Agents</option>
            {agents.map(agent => (
              <option key={agent} value={agent}>{agent}</option>
            ))}
          </select>
        </div>
      </div>
      
      {filterAgent && agentMetrics && (
        <div className="agent-metrics">
          <h3>Performance Metrics for {filterAgent}</h3>
          <div className="metrics-overview">
            <div className="metric-card">
              <div className="metric-value">{agentMetrics.callCount}</div>
              <div className="metric-label">Total Calls</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{agentMetrics.avgScores.overallScore}</div>
              <div className="metric-label">Avg. Overall Score</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{agentMetrics.avgScores.customerService}</div>
              <div className="metric-label">Avg. Customer Service</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{agentMetrics.avgScores.productKnowledge}</div>
              <div className="metric-label">Avg. Product Knowledge</div>
            </div>
          </div>
          
          <div className="metrics-details">
            <div className="metrics-column">
              <h4>Top Improvement Areas</h4>
              <ul className="metrics-list">
                {agentMetrics.topImprovementAreas.map((item, index) => (
                  <li key={index}>
                    <div className="metric-item">
                      <span className="metric-name">{item.area}</span>
                      <div className="metric-bar-container">
                        <div 
                          className="metric-bar" 
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                      <span className="metric-percentage">{item.percentage}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="metrics-column">
              <h4>Top Strengths</h4>
              <ul className="metrics-list">
                {agentMetrics.topStrengths.map((item, index) => (
                  <li key={index}>
                    <div className="metric-item">
                      <span className="metric-name">{item.strength}</span>
                      <div className="metric-bar-container">
                        <div 
                          className="metric-bar strength-bar" 
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                      <span className="metric-percentage">{item.percentage}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {filteredTranscripts.length === 0 ? (
        <p>No transcript analysis history found.</p>
      ) : (
        <div className="transcript-list">
          {filteredTranscripts.map(transcript => (
            <div key={transcript._id} className="transcript-card">
              <div className="card-header">
                <span className="date">
                  {new Date(transcript.createdAt).toLocaleString()}
                </span>
                <span className="score">
                  Overall Score: {transcript.analysis.scorecard.overallScore}/10
                </span>
                <span className="source">
                  Source: {transcript.source === 'api' ? 'API' : 'Web UI'}
                </span>
                <span className={`call-type-badge ${getCallTypeBadgeClass(transcript.callType)}`}>
                  {getCallTypeLabel(transcript.callType)}
                </span>
              </div>
              
              <div className="card-summary">
                <p>
                  <strong>
                    {transcript.callType === 'hearing' ? 'Patient:' : 'Customer:'}
                  </strong> {
                    transcript.callType === 'hearing' 
                      ? transcript.analysis.callSummary.patientName
                      : transcript.analysis.callSummary.customerName
                  }
                </p>
                <p>
                  <strong>Agent:</strong> {transcript.analysis.callSummary.agentName || 'Unknown'}
                </p>
                <p className="truncate">
                  {transcript.rawTranscript.substring(0, 150)}...
                </p>
              </div>
              
              <Link 
                to={`/transcript/${transcript._id}`} 
                className="view-button"
              >
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}
      
      <div className="history-footer">
        <Link to="/" className="back-button">Back to Analyzer</Link>
        {filterAgent && (
          <button className="clear-filter-button" onClick={() => setFilterAgent('')}>
            Clear Filter
          </button>
        )}
      </div>
    </div>
  );
}

export default TranscriptHistory;