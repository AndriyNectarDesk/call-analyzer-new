import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import TranscriptHistory from './components/TranscriptHistory';
import TranscriptDetail from './components/TranscriptDetail';
import CallTypeManager from './components/CallTypeManager';
import AgentAnalytics from './components/AgentAnalytics';

function App() {
  const [transcript, setTranscript] = useState('');
  const [callType, setCallType] = useState('auto');
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableCallTypes, setAvailableCallTypes] = useState([]);

  // Fetch available call types
  useEffect(() => {
    const fetchCallTypes = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/call-types`);
        
        if (response.ok) {
          const data = await response.json();
          setAvailableCallTypes(data);
        }
      } catch (err) {
        console.error('Failed to fetch call types:', err);
      }
    };
    
    fetchCallTypes();
  }, []);

  const analyzeTranscript = async () => {
    if (!transcript.trim()) {
      setError('Please enter a call transcript');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Use environment variable for API URL if available
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript, callType }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze transcript');
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError('Error analyzing transcript. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAll = () => {
    setTranscript('');
    setCallType('auto');
    setAnalysis(null);
    setError('');
  };

  // Component for the main analyzer page
  const AnalyzerPage = () => (
    <div className="main-content">
      <div className="input-section">
        <h2>Call Transcript</h2>
        <div className="call-type-selector">
          <label htmlFor="callType">Call Type:</label>
          <select 
            id="callType" 
            value={callType} 
            onChange={(e) => setCallType(e.target.value)}
            disabled={isLoading}
          >
            <option value="auto">Auto-detect</option>
            <option value="flower">Flower Shop</option>
            <option value="hearing">Hearing Aid Clinic</option>
            {availableCallTypes.map(type => (
              type.code !== 'flower' && type.code !== 'hearing' && (
                <option key={type._id} value={type.code}>
                  {type.name}
                </option>
              )
            ))}
          </select>
        </div>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste your call transcript here..."
          disabled={isLoading}
        />
        {error && <p className="error-message">{error}</p>}
        <div className="button-container">
          <button
            className="analyze-button"
            onClick={analyzeTranscript}
            disabled={isLoading || !transcript.trim()}
          >
            {isLoading ? 'Analyzing...' : 'Analyze Transcript'}
          </button>
          <button className="clear-button" onClick={clearAll} disabled={isLoading}>
            Clear
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Analyzing your transcript...</p>
        </div>
      ) : analysis ? (
        <div className="results-section">
          <h2>Analysis Results</h2>
          
          <div className="result-block">
            <h3>Call Summary</h3>
            <ul className="summary-list">
              {Object.entries(analysis.callSummary).map(([key, value]) => (
                <li key={key}>
                  <span className="label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span> 
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
                  <div className="score-label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</div>
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
      ) : null}
    </div>
  );

  return (
    <Router>
      <div className="app-container">
        <header className="app-header">
          <div className="header-content">
            <Link to="/" className="app-title">
              <h1>Call Center Transcript Analyzer</h1>
            </Link>
            <p className="subtitle">Analyze call transcripts for better customer service</p>
          </div>
          <nav className="main-nav">
            <ul>
              <li>
                <Link to="/" className="nav-link">
                  Analyzer
                </Link>
              </li>
              <li>
                <Link to="/history" className="nav-link">
                  History
                </Link>
              </li>
              <li>
                <Link to="/agents" className="nav-link">
                  Agent Analytics
                </Link>
              </li>
              <li>
                <Link to="/call-types" className="nav-link">
                  Call Types
                </Link>
              </li>
            </ul>
          </nav>
        </header>

        <Routes>
          <Route path="/" element={<AnalyzerPage />} />
          <Route path="/history" element={<TranscriptHistory />} />
          <Route path="/transcript/:id" element={<TranscriptDetail />} />
          <Route path="/call-types" element={<CallTypeManager />} />
          <Route path="/agents" element={<AgentAnalytics />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;