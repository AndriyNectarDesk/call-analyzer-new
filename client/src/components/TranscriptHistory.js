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
        
        {filterAgent && (
          <div className="agent-analytics-link">
            <p>
              View detailed analytics for this agent on the 
              <Link to={`/agents`} className="analytics-link"> Agent Analytics page</Link>
            </p>
          </div>
        )}
      </div>
      
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
                {transcript.organizationId && (
                  <span className="organization-badge">
                    Org: {transcript.organizationId.name}
                  </span>
                )}
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