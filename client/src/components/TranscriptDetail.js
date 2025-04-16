import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

function TranscriptDetail() {
  const { id } = useParams();
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTranscript = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
          setError('Authentication required');
          setLoading(false);
          return;
        }
        
        const response = await fetch(`${apiUrl}/api/transcripts/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch transcript');
        }
        
        const data = await response.json();
        setTranscript(data);
      } catch (err) {
        setError('Error loading transcript');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTranscript();
  }, [id]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading transcript details...</p>
      </div>
    );
  }

  if (error || !transcript) {
    return <div className="error-message">{error || 'Transcript not found'}</div>;
  }

  const { analysis, rawTranscript, createdAt, source, metadata, callType, organizationId } = transcript;

  return (
    <div className="detail-container">
      {/* Left Column - Transcript */}
      <div className="transcript-column">
        <h2>Call Transcript</h2>
        <div className="transcript-text">
          {rawTranscript.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>

      {/* Right Column - Analysis */}
      <div className="analysis-column">
        {/* Header Info */}
        <div className="meta-info">
          <p>
            <strong>Date:</strong> {new Date(createdAt).toLocaleString()}
          </p>
          <p>
            <strong>Source:</strong> {
              transcript.source === 'api' ? 'API' : 
              transcript.source === 'audio' ? 'Audio Upload' : 
              transcript.source === 'nectar-desk-webhook' ? 'NectarDesk' : 
              'Web UI'
            }
          </p>
          <p>
            <strong>Call Type:</strong> {
              callType === 'flower' ? 'Flower Shop' :
              callType === 'hearing' ? 'Hearing Aid Clinic' :
              callType === 'auto' ? 'Auto-detected' : callType
            }
          </p>
        </div>

        {/* Call Summary */}
        <div className="call-summary">
          <h3>Call Summary</h3>
          {Object.entries(analysis.callSummary).map(([key, value]) => (
            <div key={key} className="summary-item">
              <span className="summary-label">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </span>
              <span className="summary-value">{value}</span>
            </div>
          ))}
        </div>

        {/* Agent Performance */}
        <div className="performance-section">
          <h3>Agent Performance</h3>
          
          <h4>Strengths</h4>
          <ul className="strengths-list">
            {analysis.agentPerformance.strengths.map((strength, index) => (
              <li key={index}>{strength}</li>
            ))}
          </ul>

          <h4>Areas for Improvement</h4>
          <ul className="improvements-list">
            {analysis.agentPerformance.areasForImprovement.map((area, index) => (
              <li key={index}>{area}</li>
            ))}
          </ul>
        </div>

        {/* Improvement Suggestions */}
        <div className="suggestions-section">
          <h3>Recommended Actions</h3>
          <ul className="improvements-list">
            {analysis.improvementSuggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>

        {/* Scorecard */}
        <div className="scorecard-section">
          <h3>Performance Scorecard</h3>
          <div className="scorecard">
            {Object.entries(analysis.scorecard).map(([key, value]) => (
              <div key={key} className="score-item">
                <div className="score-label">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </div>
                <div className="score-bar-wrapper">
                  <div className="score-bar-container">
                    <div 
                      className={`score-bar ${value >= 8 ? 'high' : value >= 6 ? 'medium' : 'low'}`}
                      style={{ width: `${value * 10}%` }}
                    />
                  </div>
                  <span className="score-value">{value}/10</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="navigation-buttons">
          <Link to="/history" className="button button-secondary">Back to History</Link>
          <Link to="/" className="button">New Analysis</Link>
        </div>
      </div>
    </div>
  );
}

export default TranscriptDetail;