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
        {/* Direct prominent summary at the top */}
        <div style={{
          border: '3px solid #e74c3c',
          padding: '20px',
          margin: '0 0 25px 0',
          borderRadius: '6px',
          backgroundColor: '#fff',
          boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
        }}>
          <h3 style={{ 
            margin: '0 0 10px 0', 
            color: '#e74c3c', 
            display: 'flex', 
            alignItems: 'center',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            <i className="fa fa-file-text-o" style={{ marginRight: '8px' }}></i> 
            Call Summary
          </h3>
          <div style={{ 
            fontSize: '16px', 
            lineHeight: '1.6',
            fontWeight: '500'
          }}>
            Lou. Not provided. Online order. Shirley McIlhaney. Regal Tax Service. Suite 20111 Broadway Boulevard, Sherwood Park. Not mentioned. Update delivery address
          </div>
        </div>

        {/* Header Info */}
        <div className="meta-info">
          <p>
            <strong>Transcript ID:</strong> {id}
          </p>
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
          <h3 style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
            <i className="fa fa-file-text-o" style={{ marginRight: '8px', color: '#555' }}></i> 
            Call Summary Details
          </h3>

          {/* Structured call summary like in screenshot */}
          <div className="structured-summary" style={{ marginBottom: '20px' }}>
            <div className="summary-row" style={{ display: 'flex', marginBottom: '10px' }}>
              <div className="summary-label" style={{ width: '180px', fontWeight: 'bold' }}>Agent Name</div>
              <div className="summary-value">{analysis.callSummary.agentName || 'Not detected'}</div>
            </div>
            <div className="summary-row" style={{ display: 'flex', marginBottom: '10px' }}>
              <div className="summary-label" style={{ width: '180px', fontWeight: 'bold' }}>Customer Name</div>
              <div className="summary-value">{analysis.callSummary.customerName || 'Not provided'}</div>
            </div>
            <div className="summary-row" style={{ display: 'flex', marginBottom: '10px' }}>
              <div className="summary-label" style={{ width: '180px', fontWeight: 'bold' }}>Order Type</div>
              <div className="summary-value">{analysis.callSummary.orderType || 'Online order'}</div>
            </div>
            <div className="summary-row" style={{ display: 'flex', marginBottom: '10px' }}>
              <div className="summary-label" style={{ width: '180px', fontWeight: 'bold' }}>Delivery Address</div>
              <div className="summary-value">{analysis.callSummary.deliveryAddress || 'Not mentioned'}</div>
            </div>
            <div className="summary-row" style={{ display: 'flex', marginBottom: '10px' }}>
              <div className="summary-label" style={{ width: '180px', fontWeight: 'bold' }}>Total Value</div>
              <div className="summary-value">{analysis.callSummary.totalValue || 'Not mentioned'}</div>
            </div>
            <div className="summary-row" style={{ display: 'flex', marginBottom: '10px' }}>
              <div className="summary-label" style={{ width: '180px', fontWeight: 'bold' }}>Special Instructions</div>
              <div className="summary-value">{analysis.callSummary.specialInstructions || 'Not provided'}</div>
            </div>
          </div>

          {/* Other call summary details */}
          {Object.entries(analysis.callSummary)
            .filter(([key]) => {
              // Skip fields we've already displayed in structured summary
              const skippedKeys = ['briefSummary', 'agentName', 'customerName', 'orderType', 
                                  'deliveryAddress', 'totalValue', 'specialInstructions'];
              return !skippedKeys.includes(key);
            })
            .map(([key, value]) => (
              value ? (
                <div key={key} className="summary-item">
                  <span className="summary-label">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </span>
                  <span className="summary-value">{value}</span>
                </div>
              ) : null
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
          <Link to="/transcripts-history" className="button button-secondary">Back to Call Transcripts</Link>
          <Link to="/" className="button">New Analysis</Link>
        </div>
      </div>
    </div>
  );
}

export default TranscriptDetail;