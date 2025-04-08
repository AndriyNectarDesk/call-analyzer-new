import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function TranscriptHistory() {
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      } catch (err) {
        setError('Error loading transcript history');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTranscripts();
  }, []);

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
      
      {transcripts.length === 0 ? (
        <p>No transcript analysis history found.</p>
      ) : (
        <div className="transcript-list">
          {transcripts.map(transcript => (
            <div key={transcript._id} className="transcript-card">
              <div className="card-header">
                <span className="date">
                  {new Date(transcript.createdAt).toLocaleString()}
                </span>
                <span className="score">
                  Overall Score: {transcript.analysis.scorecard.overallScore}/10
                </span>
              </div>
              
              <div className="card-summary">
                <p>
                  <strong>Customer:</strong> {transcript.analysis.callSummary.customerName}
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
      
      <Link to="/" className="back-button">Back to Analyzer</Link>
    </div>
  );
}

export default TranscriptHistory;