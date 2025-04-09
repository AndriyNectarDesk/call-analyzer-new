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
import UserAddPage from './pages/UserAddPage';
import UserEditPage from './pages/UserEditPage';
import OrganizationDetails from './components/OrganizationDetails';
import MasterAdminDashboard from './components/MasterAdminDashboard';

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
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          localStorage.removeItem('auth_token');
          setIsAuthenticated(false);
          return;
        }

        const data = await response.json();
        setCurrentUser(data.user);
        setIsAuthenticated(true);

        // If user is master admin, fetch all organizations
        if (data.user.isMasterAdmin) {
          const orgsResponse = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/master-admin/organizations`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (orgsResponse.ok) {
            const organizations = await orgsResponse.json();
            setUserOrganizations(organizations);
            if (organizations.length > 0) {
              setCurrentOrganization(organizations[0]);
            }
          }
        } else if (data.user.organization) {
          // For regular users, set their organization
          setUserOrganizations([data.user.organization]);
          setCurrentOrganization(data.user.organization);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        localStorage.removeItem('auth_token');
        setIsAuthenticated(false);
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
      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      
      // Store token
      localStorage.setItem('auth_token', data.token);
      
      // Set user state
      setCurrentUser(data.user);
      setIsAuthenticated(true);
      
      // If user is master admin, fetch all organizations
      if (data.user.isMasterAdmin) {
        const orgsResponse = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/master-admin/organizations`, {
          headers: {
            'Authorization': `Bearer ${data.token}`
          }
        });
        
        if (orgsResponse.ok) {
          const organizations = await orgsResponse.json();
          setUserOrganizations(organizations);
          if (organizations.length > 0) {
            setCurrentOrganization(organizations[0]);
          }
        }
      } else if (data.user.organization) {
        // For regular users, set their organization
        setUserOrganizations([data.user.organization]);
        setCurrentOrganization(data.user.organization);
      }
      
      return true;
    } catch (err) {
      console.error('Login error:', err);
      throw new Error(err.message || 'Login failed. Please check your credentials.');
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

  const analyzeTranscript = async (e) => {
    // Handle case where this is called directly from form submit
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    if (!transcript.trim()) {
      setError('Please enter a call transcript');
      return;
    }

    setIsLoading(true);
    setError('');
    setAnalysis(null);

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
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to analyze transcript');
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError('Error analyzing transcript: ' + (err.message || 'Please try again.'));
      console.error('Transcript analysis error:', err);
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
  const AnalyzerPage = () => {
    return (
      <div className="analyzer-page">
        <div className="main-content">
          <div className="combined-input-container">
            <form className="transcript-form" onSubmit={analyzeTranscript}>
              <div className="form-group">
                <label htmlFor="transcript">Paste call transcript:</label>
                <textarea
                  id="transcript"
                  className="transcript-input"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste your call transcript here..."
                  rows={10}
                  required
                ></textarea>
              </div>
              
              <div className="call-type-selector">
                <label>Call type:</label>
                <div className="call-type-buttons">
                  {(availableCallTypes && availableCallTypes.length > 0) ? availableCallTypes.map(type => (
                    <button
                      key={type._id || type.code}
                      type="button"
                      className={`call-type-button ${callType === type.code ? 'selected' : ''}`}
                      onClick={() => setCallType(type.code)}
                    >
                      {type.name}
                    </button>
                  )) : (
                    <button
                      type="button"
                      className={`call-type-button ${callType === 'auto' ? 'selected' : ''}`}
                      onClick={() => setCallType('auto')}
                    >
                      Auto-detect
                    </button>
                  )}
                </div>
              </div>
              
              <button 
                type="submit" 
                className="analyze-button"
                disabled={isLoading || !transcript.trim()}
              >
                {isLoading ? 'Analyzing...' : 'Analyze Call'}
              </button>
              
              <div className="version-info">
                Version 2.1 - Multi-tenant Edition (Updated: {new Date().toLocaleDateString()})
              </div>
            </form>
            
            <div className="input-separator">
              <span>OR</span>
            </div>
            
            <div className="audio-upload-container">
              <AudioUploader onTranscribe={handleAudioTranscribe} />
            </div>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          {isLoading && (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Analyzing your call transcript...</p>
            </div>
          )}
          
          {!isLoading && analysis && (
            <div className="analysis-results">
              <h2>Call Analysis Results</h2>
              
              <div className="results-container">
                <div className="summary-section">
                  <h3>Call Summary</h3>
                  <p>{analysis.analysis.callSummary}</p>
                </div>
                
                <div className="agent-section">
                  <h3>Agent Performance</h3>
                  
                  <div className="agent-metrics">
                    <div className="metric">
                      <h4>Strengths</h4>
                      <ul>
                        {analysis.analysis.agentPerformance.strengths.map((strength, index) => (
                          <li key={index}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="metric">
                      <h4>Areas for Improvement</h4>
                      <ul>
                        {analysis.analysis.agentPerformance.areasForImprovement.map((area, index) => (
                          <li key={index}>{area}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="suggestions-section">
                  <h3>Improvement Suggestions</h3>
                  <ul>
                    {analysis.analysis.improvementSuggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="scorecard-section">
                  <h3>Performance Scorecard</h3>
                  <div className="scorecard">
                    <div className="score-item">
                      <span className="score-label">Customer Service</span>
                      <div className="score-bar-container">
                        <div 
                          className="score-bar" 
                          style={{width: `${analysis.analysis.scorecard.customerService * 10}%`}}
                        ></div>
                        <span className="score-value">{analysis.analysis.scorecard.customerService}/10</span>
                      </div>
                    </div>
                    
                    <div className="score-item">
                      <span className="score-label">Product Knowledge</span>
                      <div className="score-bar-container">
                        <div 
                          className="score-bar" 
                          style={{width: `${analysis.analysis.scorecard.productKnowledge * 10}%`}}
                        ></div>
                        <span className="score-value">{analysis.analysis.scorecard.productKnowledge}/10</span>
                      </div>
                    </div>
                    
                    <div className="score-item">
                      <span className="score-label">Process Efficiency</span>
                      <div className="score-bar-container">
                        <div 
                          className="score-bar" 
                          style={{width: `${analysis.analysis.scorecard.processEfficiency * 10}%`}}
                        ></div>
                        <span className="score-value">{analysis.analysis.scorecard.processEfficiency}/10</span>
                      </div>
                    </div>
                    
                    <div className="score-item">
                      <span className="score-label">Problem Solving</span>
                      <div className="score-bar-container">
                        <div 
                          className="score-bar" 
                          style={{width: `${analysis.analysis.scorecard.problemSolving * 10}%`}}
                        ></div>
                        <span className="score-value">{analysis.analysis.scorecard.problemSolving}/10</span>
                      </div>
                    </div>
                    
                    <div className="score-item overall-score">
                      <span className="score-label">Overall Score</span>
                      <div className="score-bar-container">
                        <div 
                          className="score-bar" 
                          style={{width: `${analysis.analysis.scorecard.overallScore * 10}%`}}
                        ></div>
                        <span className="score-value">{analysis.analysis.scorecard.overallScore}/10</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

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
                      <li>
                        <Link to="/admin" className="nav-link">Admin Dashboard</Link>
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
            
            <Route path="/organizations/:id" element={
              <ProtectedRoute>
                <OrganizationDetails />
              </ProtectedRoute>
            } />
            
            <Route path="/admin" element={
              <ProtectedRoute>
                <MasterAdminDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/history" element={<TranscriptHistory />} />
            <Route path="/transcript/:id" element={<TranscriptDetail />} />
            <Route path="/call-types" element={<CallTypeManager />} />
            <Route path="/agents" element={<AgentAnalytics />} />
            <Route path="/api" element={<ApiPage />} />
            <Route path="/organizations/:organizationId/users" element={<UsersPage />} />
            <Route path="/organizations/:organizationId/users/new" element={<UserAddPage />} />
            <Route path="/organizations/:organizationId/users/:userId/edit" element={<UserEditPage />} />
            
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