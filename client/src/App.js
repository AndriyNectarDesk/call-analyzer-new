import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import './App.css';
import './styles/appleDesign.css';
import AudioUploader from './components/AudioUploader';
import OrganizationSelector from './components/OrganizationSelector';
import Login from './components/Login';
import OrganizationsPage from './pages/OrganizationsPage';
import NewOrganizationPage from './pages/NewOrganizationPage';
import TranscriptHistory from './components/TranscriptHistory';
import TranscriptDetail from './components/TranscriptDetail';
import CallTypeManager from './components/CallTypeManager';
import AgentAnalytics from './components/AgentAnalytics';
import ApiPage from './components/ApiPage';
import UsersPage from './pages/UsersPage';

function App() {
  const [transcript, setTranscript] = useState('');
  const [callType, setCallType] = useState('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [availableCallTypes, setAvailableCallTypes] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [userOrganizations, setUserOrganizations] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
          return;
        }
        
        // In real implementation, verify token with backend
        // For now, use mock data
        const mockUser = {
          id: '1',
          email: 'admin@nectardesk.ai',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
          isMasterAdmin: true
        };
        
        const mockOrganizations = [
          {
            id: '1',
            name: 'Acme Corporation',
            code: 'acme',
            subscriptionTier: 'enterprise'
          },
          {
            id: '2',
            name: 'Smith & Partners',
            code: 'smith',
            subscriptionTier: 'professional'
          },
          {
            id: '3',
            name: 'Tech Innovators',
            code: 'techinno',
            subscriptionTier: 'trial'
          }
        ];
        
        setCurrentUser(mockUser);
        setUserOrganizations(mockOrganizations);
        setCurrentOrganization(mockOrganizations[0]);
        setIsAuthenticated(true);
      } catch (err) {
        console.error('Authentication error:', err);
        localStorage.removeItem('auth_token');
      }
    };
    
    checkAuth();
  }, []);

  // Fetch call types when organization changes
  useEffect(() => {
    const fetchCallTypes = async () => {
      try {
        // In real implementation, this would be organization-specific
        // For now, use mock data
        const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/call-types`);
        if (response.ok) {
          const data = await response.json();
          setAvailableCallTypes(data);
        }
      } catch (err) {
        console.error('Failed to fetch call types:', err);
      }
    };
    
    fetchCallTypes();
  }, [currentOrganization]);

  const handleLogin = async (email, password) => {
    try {
      // In real implementation, call authentication API
      // For now, simulate login
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful login
      localStorage.setItem('auth_token', 'mock_token_12345');
      
      const mockUser = {
        id: '1',
        email: email,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isMasterAdmin: true
      };
      
      const mockOrganizations = [
        {
          id: '1',
          name: 'Acme Corporation',
          code: 'acme',
          subscriptionTier: 'enterprise'
        },
        {
          id: '2',
          name: 'Smith & Partners',
          code: 'smith',
          subscriptionTier: 'professional'
        },
        {
          id: '3',
          name: 'Tech Innovators',
          code: 'techinno',
          subscriptionTier: 'trial'
        }
      ];
      
      setCurrentUser(mockUser);
      setUserOrganizations(mockOrganizations);
      setCurrentOrganization(mockOrganizations[0]);
      setIsAuthenticated(true);
      
      return true;
    } catch (err) {
      throw new Error('Login failed. Please check your credentials.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentOrganization(null);
    setUserOrganizations([]);
  };

  const handleSwitchOrganization = (org) => {
    setCurrentOrganization(org);
    // In real implementation, may need to refresh data based on new organization
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    document.body.classList.toggle('dark', newDarkMode);
  };

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
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ 
          transcript, 
          callType,
          organizationId: currentOrganization?.id
        }),
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
    if (currentOrganization) {
      formData.append('organizationId', currentOrganization.id);
    }
    
    setIsLoading(true);
    setError('');
    setTranscript('');
    setAnalysis(null);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/transcribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData,
      });

      const data = await response.json();
      console.log("Received data from transcription API:", data);
      
      if (!response.ok) {
        console.error("API Error:", data);
        throw new Error(data.error || 'Failed to transcribe audio');
      }
      
      if (data.transcript) {
        setTranscript(data.transcript);
        console.log("Transcript set:", data.transcript.substring(0, 100) + "...");
      }
      
      if (data.analysis) {
        console.log("Setting analysis data:", data.analysis);
        setAnalysis(data);
        
        // Save analysis ID for history tracking
        if (data.id) {
          console.log("Analysis saved with ID:", data.id);
          // We could use this ID to redirect to history view later
        }
      } else {
        console.error("No analysis data in the response", data);
        const errorMsg = data.details 
          ? `The audio was transcribed but could not be analyzed: ${data.details}` 
          : "The audio was transcribed but could not be analyzed. Please try again.";
        setError(errorMsg);
      }
    } catch (err) {
      setError('Error transcribing audio: ' + (err.message || 'Unknown error'));
      console.error("Audio transcription error:", err);
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
      <div className="main-content">
        <div className="input-section">
          <div className="control-group">
            <label>Call Type:</label>
            <select 
              value={callType} 
              onChange={(e) => setCallType(e.target.value)}
              className="select call-type-selector"
            >
              <option value="auto">Auto-detect</option>
              {availableCallTypes.map((type) => (
                <option key={type._id} value={type.code}>{type.name}</option>
              ))}
            </select>
          </div>

          <div className="combined-input-container">
            <div className="text-input-section">
              <h3>Call Transcript</h3>
              <textarea 
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste your call transcript here..."
                rows="10"
                className="textarea"
              />
              {transcript && (
                <div className="action-container">
                  <button 
                    onClick={analyzeTranscript} 
                    disabled={isLoading}
                    className="button"
                  >
                    {isLoading ? 'Analyzing...' : 'Analyze Transcript'}
                  </button>
                </div>
              )}
            </div>

            <div className="input-separator">OR</div>

            <div className="audio-input-section">
              <h3>Upload Audio</h3>
              <AudioUploader 
                onTranscribe={handleAudioTranscribe} 
                callType={callType}
                isLoading={isLoading}
                setError={setError}
              />
            </div>
          </div>
          
          {error && <div className="error-message">{error}</div>}
        </div>

        {isLoading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Processing your request. This may take a minute...</p>
          </div>
        ) : analysis ? (
          <div className="results-section">
            <h2>Analysis Results</h2>
            
            {analysis.analysis.callSummary ? (
              <div className="card">
                <h3>Call Summary</h3>
                <ul className="summary-list">
                  {Object.entries(analysis.analysis.callSummary).map(([key, value]) => (
                    <li key={key}>
                      <strong>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong> <span>{value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="card">
                <h3>Call Summary</h3>
                <p>No call summary data available</p>
              </div>
            )}
            
            {analysis.analysis.agentPerformance ? (
              <div className="card">
                <h3>Agent Performance</h3>
                
                <div className="performance-section">
                  <h4 className="strength-header">Strengths</h4>
                  <ul>
                    {analysis.analysis.agentPerformance.strengths?.map((strength, index) => (
                      <li key={index}>{strength}</li>
                    )) || <li>No strengths data available</li>}
                  </ul>
                </div>
                
                <div className="performance-section">
                  <h4 className="improvement-header">Areas for Improvement</h4>
                  <ul>
                    {analysis.analysis.agentPerformance.areasForImprovement?.map((area, index) => (
                      <li key={index}>{area}</li>
                    )) || <li>No improvement data available</li>}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="card">
                <h3>Agent Performance</h3>
                <p>No agent performance data available</p>
              </div>
            )}
            
            {analysis.analysis.scorecard ? (
              <div className="card">
                <h3>Scorecard</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                  {Object.entries(analysis.analysis.scorecard).map(([key, value]) => (
                    <div key={key} style={{ textAlign: 'center', minWidth: '80px' }}>
                      <div style={{
                        height: '64px',
                        width: '64px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: 'white',
                        background: getScoreColor(value)
                      }}>
                        {value}
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '14px' }}>
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card">
                <h3>Scorecard</h3>
                <p>No scorecard data available</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );

  // Auth protection wrapper
  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" />;
    }
    return children;
  };

  // Helper function to get color based on score
  const getScoreColor = (score) => {
    if (score >= 9) return 'var(--success-color)';
    if (score >= 7) return 'var(--primary-color)';
    if (score >= 5) return 'var(--warning-color)';
    return 'var(--error-color)';
  };

  return (
    <Router>
      <div className={`app-container ${isDarkMode ? 'dark' : ''}`}>
        {isAuthenticated && (
          <header className="app-header">
            <div className="header-content">
              <div className="header-left">
                <Link to="/" className="app-title">
                  <h1>AI Nectar Desk</h1>
                </Link>
              </div>
              
              <nav className="header-center">
                <ul className="nav-links">
                  <li>
                    <Link to="/" className="nav-link">Analyze</Link>
                  </li>
                  <li>
                    <Link to="/history" className="nav-link">History</Link>
                  </li>
                  <li>
                    <Link to="/call-types" className="nav-link">Call Types</Link>
                  </li>
                  {currentUser?.isMasterAdmin && (
                    <>
                      <li>
                        <Link to="/organizations" className="nav-link">Organizations</Link>
                      </li>
                      <li>
                        <Link to={`/organizations/${currentOrganization?.id || '1'}/users`} className="nav-link">Users</Link>
                      </li>
                    </>
                  )}
                </ul>
              </nav>
              
              <div className="header-right">
                <OrganizationSelector 
                  currentOrganization={currentOrganization}
                  organizations={userOrganizations}
                  onSelectOrganization={handleSwitchOrganization}
                  isMasterAdmin={currentUser?.isMasterAdmin}
                />
                
                <div className="user-menu">
                  <div className="toggle-container" onClick={toggleDarkMode}>
                    <input type="checkbox" className="toggle-input" checked={isDarkMode} onChange={() => {}} />
                    <span className="toggle-slider"></span>
                  </div>
                  
                  <div className="user-info">
                    <span className="user-name">{currentUser?.firstName}</span>
                    <button onClick={handleLogout} className="button button-subtle">Logout</button>
                  </div>
                </div>
              </div>
            </div>
          </header>
        )}
        
        <main className="app-main">
          <Routes>
            <Route path="/login" element={
              isAuthenticated ? 
                <Navigate to="/" /> : 
                <Login onLogin={handleLogin} />
            } />
            
            <Route path="/" element={
              <ProtectedRoute>
                <AnalyzerPage />
              </ProtectedRoute>
            } />
            
            <Route path="/organizations" element={
              <ProtectedRoute>
                <OrganizationsPage />
              </ProtectedRoute>
            } />
            
            <Route path="/organizations/new" element={
              <ProtectedRoute>
                <NewOrganizationPage />
              </ProtectedRoute>
            } />
            
            <Route path="/history" element={<TranscriptHistory />} />
            <Route path="/transcript/:id" element={<TranscriptDetail />} />
            <Route path="/call-types" element={<CallTypeManager />} />
            <Route path="/agents" element={<AgentAnalytics />} />
            <Route path="/api" element={<ApiPage />} />
            <Route path="/organizations/:organizationId/users" element={<UsersPage />} />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        
        <footer className="app-footer">
          <p>AI Nectar Desk © {new Date().getFullYear()}</p>
        </footer>
      </div>
      
      {/* Additional app styling */}
      <style jsx>{`
        .app-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        
        .app-main {
          flex: 1;
        }
        
        .header-content {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .header-left, .header-right {
          display: flex;
          align-items: center;
        }
        
        .user-menu {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }
        
        .user-info {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }
        
        .user-name {
          font-weight: 500;
        }
        
        .combined-input-container {
          display: flex;
          gap: var(--spacing-lg);
          margin-bottom: var(--spacing-lg);
        }
        
        .text-input-section, .audio-input-section {
          flex: 1;
          background-color: var(--card-background);
          padding: var(--spacing-lg);
          border-radius: var(--border-radius-md);
          box-shadow: var(--shadow-md);
        }
        
        .input-separator {
          display: flex;
          align-items: center;
          font-weight: 500;
          color: var(--apple-mid-gray);
        }
        
        .action-container {
          margin-top: var(--spacing-md);
          display: flex;
          justify-content: flex-end;
        }
        
        .summary-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .summary-list li {
          padding: var(--spacing-sm) 0;
          border-bottom: 1px solid var(--border-color);
        }
        
        .summary-list li:last-child {
          border-bottom: none;
        }
        
        @media (max-width: 768px) {
          .combined-input-container {
            flex-direction: column;
          }
          
          .input-separator {
            margin: var(--spacing-md) 0;
            justify-content: center;
          }
        }
      `}</style>
    </Router>
  );
}

export default App;