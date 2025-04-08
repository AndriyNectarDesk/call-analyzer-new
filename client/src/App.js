import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import TranscriptHistory from './components/TranscriptHistory';
import TranscriptDetail from './components/TranscriptDetail';
import CallTypeManager from './components/CallTypeManager';
import AgentAnalytics from './components/AgentAnalytics';
import AudioUploader from './components/AudioUploader';

function App() {
  const [transcript, setTranscript] = useState('');
  const [callType, setCallType] = useState('auto');
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableCallTypes, setAvailableCallTypes] = useState([]);
  const [activeInputTab, setActiveInputTab] = useState('text'); // 'text' or 'audio'

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

  const handleAudioTranscribe = async (formData) => {
    setIsLoading(true);
    setError('');
    setTranscript('');
    setAnalysis(null);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to transcribe audio');
      }

      const data = await response.json();
      console.log("Received data from transcription API:", data);
      
      if (data.transcript) {
        setTranscript(data.transcript);
      }
      
      if (data.analysis) {
        console.log("Setting analysis data:", data.analysis);
        setAnalysis(data.analysis);
        
        // Save analysis ID for history tracking
        if (data.id) {
          console.log("Analysis saved with ID:", data.id);
          // We could use this ID to redirect to history view later
        }
      } else {
        console.error("No analysis data in the response", data);
        setError("The audio was transcribed but could not be analyzed. Please try again.");
      }
    } catch (err) {
      setError('Error transcribing audio. Please try again.');
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
    <div className="analyzer-container">
      <div className="controls-section">
        <div className="control-group">
          <label>Call Type:</label>
          <select 
            value={callType} 
            onChange={(e) => setCallType(e.target.value)}
            className="call-type-selector"
          >
            <option value="auto">Auto-detect</option>
            {availableCallTypes.map((type) => (
              <option key={type._id} value={type.code}>{type.name}</option>
            ))}
          </select>
        </div>
      
        <div className="input-tabs">
          <div 
            className={`input-tab ${activeInputTab === 'text' ? 'active' : ''}`}
            onClick={() => setActiveInputTab('text')}
          >
            Text Transcript
          </div>
          <div 
            className={`input-tab ${activeInputTab === 'audio' ? 'active' : ''}`}
            onClick={() => setActiveInputTab('audio')}
          >
            Audio Upload
          </div>
        </div>

        {activeInputTab === 'text' ? (
          <div className="input-content">
            <textarea 
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste your call transcript here..."
              rows="10"
              className="transcript-input"
            />
          </div>
        ) : (
          <div className="input-content">
            <AudioUploader 
              onTranscribe={handleAudioTranscribe} 
              callType={callType}
              isLoading={isLoading}
              setError={setError}
            />
          </div>
        )}

        <div className="action-container">
          {activeInputTab === 'text' && transcript && (
            <button 
              onClick={analyzeTranscript} 
              disabled={isLoading}
              className="analyze-button"
            >
              {isLoading ? 'Analyzing...' : 'Analyze Transcript'}
            </button>
          )}
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>

      {isLoading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Processing your request. This may take a minute...</p>
        </div>
      )}

      {analysis && !isLoading && (
        <div className="results-section">
          <h2>Analysis Results</h2>
          
          <div className="result-block">
            <h3>Call Summary</h3>
            <ul className="summary-list">
              {Object.entries(analysis.analysis.callSummary).map(([key, value]) => (
                <li key={key}>
                  <strong>{key}:</strong> <span>{value}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="result-block">
            <h3>Agent Performance</h3>
            
            <div className="performance-section">
              <h4 className="strength-header">Strengths</h4>
              <ul>
                {analysis.analysis.agentPerformance.strengths.map((strength, index) => (
                  <li key={index}>{strength}</li>
                ))}
              </ul>
            </div>
            
            <div className="performance-section">
              <h4 className="improvement-header">Areas for Improvement</h4>
              <ul>
                {analysis.analysis.agentPerformance.areasForImprovement.map((area, index) => (
                  <li key={index}>{area}</li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="result-block">
            <h3>Improvement Suggestions</h3>
            <ul>
              {analysis.analysis.improvementSuggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
          
          <div className="result-block">
            <h3>Performance Scorecard</h3>
            <div className="scorecard">
              {Object.entries(analysis.analysis.scorecard).map(([metric, score]) => (
                <div key={metric} className="score-item">
                  <div className="metric-name">{metric}</div>
                  <div className="score-bar-container">
                    <div 
                      className="score-bar" 
                      style={{width: `${score * 10}%`, backgroundColor: getScoreColor(score)}}
                    ></div>
                    <span className="score-value">{score}/10</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper function to get color based on score
  const getScoreColor = (score) => {
    if (score >= 8) return '#27ae60'; // Green for high scores
    if (score >= 5) return '#f39c12'; // Orange for medium scores
    return '#e74c3c'; // Red for low scores
  };

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