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
        const response = await fetch(`${apiUrl}/api/transcripts/${id}`);
        
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

  const { analysis, rawTranscript, createdAt } = transcript;

  return (
    <div className="detail-container">
      <div className="detail-header">
        <h2>Transcript Analysis</h2>
        <p className="date">Analyzed on: {new Date(createdAt).toLocaleString()}</p>
      </div>
      
      <div className="content-grid">
        <div className="raw-transcript">
          <h3>Call Transcript</h3>
          <div className="transcript-text">
            {rawTranscript.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
        
        <div className="analysis-results">
          <div className="result-block">
            <h3>Call Summary</h3>
            <ul className="summary-list">
              {Object.entries(analysis.callSummary).map(([key, value]) => (
                <li key={key}>
                  <span className="label">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                  </span> 
                  <span>{value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="result-block">
            <h3>Agent Performance</h3>
            <div className="performance-grid">
              <div>
                <h4 className="strength-header">Strengths</h4>
                <ul>
                  {analysis.agentPerformance.strengths.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="improvement-header">Areas for Improvement</h4>
                <ul>
                  {analysis.agentPerformance.areasForImprovement.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="result-block">
            <h3>Improvement Suggestions</h3>
            <ol>
              {analysis.improvementSuggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ol>
          </div>

          <div className="result-block">
            <h3>Performance Scorecard</h3>
            <div className="scorecard">
              {Object.entries(analysis.scorecard).map(([key, value]) => (
                <div key={key} className="score-item">
                  <div className="score-label">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </div>
                  <div className="score-bar-container">
                    <div 
                      className="score-bar" 
                      style={{ 
                        width: `${value * 10}%`, 
                        backgroundColor: value >= 8 ? '#4CAF50' : value >= 6 ? '#FFC107' : '#F44336' 
                      }}
                    ></div>
                  </div>
                  <div className="score-value">{value}/10</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="detail-footer">
        <Link to="/history" className="back-button">Back to History</Link>
        <Link to="/" className="home-button">New Analysis</Link>
      </div>
    </div>
  );
}

export default TranscriptDetail;