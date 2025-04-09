import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import './App.css';
import './styles/appleDesign.css';
import AudioUploader from './components/AudioUploader';
import OrganizationSelector from './components/OrganizationSelector';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
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
import Settings from './components/Settings';

function App() {
  const [transcript, setTranscript] = useState('');
  const [callType, setCallType] = useState('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [availableCallTypes, setAvailableCallTypes] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [userOrganizations, setUserOrganizations] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      setAuthLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsAuthenticated(false);
        setAuthLoading(false);
        return;
      }

      try {
        const apiUrl = process.env.REACT_APP_API_URL || '';
        const response = await fetch(apiUrl + '/api/auth/me', {
          headers: {
            'Authorization': 'Bearer ' + token
          }
        });

        if (!response.ok) {
          localStorage.removeItem('auth_token');
          setIsAuthenticated(false);
          setAuthLoading(false);
          return;
        }

        const data = await response.json();
        setCurrentUser(data.user);
        setIsAuthenticated(true);

        // If user is master admin, fetch all organizations
        if (data.user.isMasterAdmin) {
          const orgsResponse = await fetch(apiUrl + '/api/master-admin/organizations', {
            headers: {
              'Authorization': 'Bearer ' + token
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
        
        setAuthLoading(false);
      } catch (err) {
        console.error('Auth check error:', err);
        localStorage.removeItem('auth_token');
        setIsAuthenticated(false);
        setAuthLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Fetch call types when organization changes
  useEffect(() => {
    const fetchCallTypes = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || '';
        const response = await fetch(apiUrl + '/api/call-types');
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
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(apiUrl + '/api/auth/login', {
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
        const orgsResponse = await fetch(apiUrl + '/api/master-admin/organizations', {
          headers: {
            'Authorization': 'Bearer ' + data.token
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
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    document.body.classList.toggle('dark', newDarkMode);
  };

  const analyzeTranscript = async (e) => {
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
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(apiUrl + '/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
        },
        body: JSON.stringify({
          transcript: transcript,
          callType: callType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze transcript. Please try again.');
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to analyze transcript. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioTranscribe = async (formData) => {
    setIsLoading(true);
    setError('');
    setAnalysis(null);
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const fallbackUrl = 'http://localhost:3001';  // Fallback for local development
      
      // Add call type to the FormData
      formData.append('callType', callType);
      
      const response = await fetch(apiUrl + '/api/transcribe' || fallbackUrl + '/api/transcribe', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to transcribe audio');
      }
      
      const data = await response.json();
      
      if (data.transcript) {
        setTranscript(data.transcript);
        
        if (data.analysis) {
          setAnalysis(data.analysis);
        } else {
          setError('The audio was transcribed but could not be analyzed. Please try again.');
        }
      } else {
        setError('Failed to transcribe audio. Please try another file or method.');
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setError(err.message || 'Failed to transcribe audio. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearAll = () => {
    setTranscript('');
    setAnalysis(null);
    setError('');
    setCallType('auto');
  };

  // Main analyzer page component
  const AnalyzerPage = () => {
    const [inputType, setInputType] = useState('text'); // 'text' or 'audio'

    return (
      <div className="analyzer-page">
        <div className="main-content two-column-layout">
          {/* Input Section (Left Column) */}
          <div className="input-column">
            <div className="input-tabs">
              <button 
                className={`tab-button ${inputType === 'text' ? 'active' : ''}`}
                onClick={() => setInputType('text')}
              >
                Text Transcript
              </button>
              <button 
                className={`tab-button ${inputType === 'audio' ? 'active' : ''}`}
                onClick={() => setInputType('audio')}
              >
                Audio Upload
              </button>
            </div>

            <div className="input-content">
              {inputType === 'text' ? (
                // Text Input Section
                <div className="text-input-section">
                  <form onSubmit={analyzeTranscript}>
                    <div className="form-group">
                      <label htmlFor="transcript">Call Transcript</label>
                      <textarea
                        id="transcript"
                        className="transcript-input"
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        placeholder="Paste your call transcript here..."
                        rows={12}
                        disabled={isLoading}
                      ></textarea>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="callType">Call Type</label>
                      <select
                        id="callType"
                        value={callType}
                        onChange={(e) => setCallType(e.target.value)}
                        className="select"
                        disabled={isLoading}
                      >
                        <option value="auto">Auto-detect</option>
                        {availableCallTypes.map(type => (
                          <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="action-container">
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={clearAll}
                        disabled={isLoading || (!transcript && !analysis)}
                      >
                        Clear
                      </button>
                      <button
                        type="submit"
                        className="button"
                        disabled={isLoading || !transcript.trim()}
                      >
                        {isLoading ? 'Analyzing...' : 'Analyze Call'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                // Audio Upload Section
                <div className="audio-input-section">
                  <AudioUploader
                    onTranscribe={handleAudioTranscribe}
                    isLoading={isLoading}
                    callType={callType}
                    setError={setError}
                  />
                  <div className="form-group call-type-select">
                    <label htmlFor="audioCallType">Call Type</label>
                    <select
                      id="audioCallType"
                      value={callType}
                      onChange={(e) => setCallType(e.target.value)}
                      className="select"
                      disabled={isLoading}
                    >
                      <option value="auto">Auto-detect</option>
                      {availableCallTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Section (Right Column) */}
          <div className="results-column">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            
            {isLoading && (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Analyzing your call...</p>
              </div>
            )}
            
            {analysis && !isLoading && !error ? (
              <div className="analysis-container">
                <h2>Call Summary</h2>
                
                <div className="summary-card">
                  <h3>Overview</h3>
                  <p>{analysis && analysis.callSummary ? Object.values(analysis.callSummary).filter(Boolean).join('. ') : 'No summary available'}</p>
                </div>
                
                <div className="metrics-grid">
                  <div className="metric-card">
                    <h3>Sentiment</h3>
                    <div className="score-display">
                      <div className="score-indicator" style={{
                        backgroundColor: getScoreColor(analysis && analysis.scorecard && analysis.scorecard.customerService ? analysis.scorecard.customerService / 10 : 0)
                      }}></div>
                      <span>{analysis && analysis.scorecard && analysis.scorecard.customerService 
                        ? (analysis.scorecard.customerService > 7 ? 'Positive' : analysis.scorecard.customerService < 4 ? 'Negative' : 'Neutral') 
                        : 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="metric-card">
                    <h3>Customer Satisfaction</h3>
                    <div className="score-display">
                      <div className="score-indicator" style={{
                        backgroundColor: getScoreColor(analysis && analysis.scorecard && analysis.scorecard.customerService ? analysis.scorecard.customerService / 10 : 0)
                      }}></div>
                      <span>{analysis && analysis.scorecard && analysis.scorecard.customerService ? Math.round(analysis.scorecard.customerService * 10) : 0}%</span>
                    </div>
                  </div>
                  
                  <div className="metric-card">
                    <h3>Agent Performance</h3>
                    <div className="score-display">
                      <div className="score-indicator" style={{
                        backgroundColor: getScoreColor(analysis && analysis.scorecard && analysis.scorecard.overallScore ? analysis.scorecard.overallScore / 10 : 0)
                      }}></div>
                      <span>{analysis && analysis.scorecard && analysis.scorecard.overallScore ? Math.round(analysis.scorecard.overallScore * 10) : 0}%</span>
                    </div>
                  </div>
                  
                  <div className="metric-card">
                    <h3>Call Efficiency</h3>
                    <div className="score-display">
                      <div className="score-indicator" style={{
                        backgroundColor: getScoreColor(analysis && analysis.scorecard && analysis.scorecard.processEfficiency ? analysis.scorecard.processEfficiency / 10 : 0)
                      }}></div>
                      <span>{analysis && analysis.scorecard && analysis.scorecard.processEfficiency ? Math.round(analysis.scorecard.processEfficiency * 10) : 0}%</span>
                    </div>
                  </div>
                </div>
                
                <div className="insights-card">
                  <h3>Key Insights</h3>
                  <ul className="summary-list">
                    {analysis && analysis.agentPerformance && analysis.agentPerformance.strengths && analysis.agentPerformance.strengths.map((insight, index) => (
                      <li key={`strength-${index}`}>{insight}</li>
                    ))}
                    {analysis && analysis.agentPerformance && analysis.agentPerformance.areasForImprovement && analysis.agentPerformance.areasForImprovement.map((insight, index) => (
                      <li key={`improvement-${index}`}>{insight}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="action-items-card">
                  <h3>Recommended Actions</h3>
                  <ul className="summary-list">
                    {analysis && analysis.improvementSuggestions && analysis.improvementSuggestions.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="empty-results">
                <div className="empty-results-message">
                  <h3>No Analysis Results</h3>
                  <p>Enter a transcript or upload audio to see analysis results here.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (authLoading) {
      return (
        <div className="auth-loading">
          <div className="spinner"></div>
        </div>
      );
    }
    return isAuthenticated ? children : <Navigate to="/login" />;
  };

  // Helper function to get color based on score
  const getScoreColor = (score) => {
    if (score >= 0.7) return 'var(--apple-green)';
    if (score >= 0.5) return 'var(--apple-yellow)';
    return 'var(--apple-red)';
  };

  return (
    <Router>
      <div className="app-container">
        <Toaster position="top-right" toastOptions={{
          style: {
            borderRadius: '10px',
            background: 'var(--card-background)',
            color: 'var(--text-color)',
            boxShadow: 'var(--shadow-md)'
          }
        }} />
        
        {isAuthenticated && !authLoading ? (
          <header className="app-header">
            <div className="header-content">
              <div className="header-left">
                <Link to="/" className="logo">
                  AI Nectar Desk
                </Link>
                
                <nav className="main-nav">
                  <ul>
                    <li>
                      <Link to="/analyzer">Analyze</Link>
                    </li>
                    <li>
                      <Link to="/history">History</Link>
                    </li>
                    <li>
                      <Link to="/call-types">Call Types</Link>
                    </li>
                    <li>
                      <Link to="/settings">Settings</Link>
                    </li>
                    {currentUser && currentUser.role === 'admin' && (
                      <>
                        <li>
                          <Link to="/agents">Agent Analytics</Link>
                        </li>
                        <li>
                          <Link to="/api">API</Link>
                        </li>
                      </>
                    )}
                    {currentUser && currentUser.isMasterAdmin && (
                      <>
                        <li>
                          <Link to="/organizations">Organizations</Link>
                        </li>
                        <li>
                          <Link to={`/organizations/${currentOrganization?.id || '1'}/users`}>Users</Link>
                        </li>
                      </>
                    )}
                  </ul>
                </nav>
              </div>
              
              <div className="header-right">
                {userOrganizations.length > 0 && (
                  <OrganizationSelector
                    organizations={userOrganizations}
                    currentOrganization={currentOrganization}
                    onSwitchOrganization={handleSwitchOrganization}
                  />
                )}
                
                <div className="user-menu">
                  {currentUser && (
                    <div className="user-info">
                      <span className="user-name">{currentUser.firstName}</span>
                    </div>
                  )}
                  
                  <button
                    className="icon-button"
                    title="Toggle Dark Mode"
                    onClick={toggleDarkMode}
                  >
                    {isDarkMode ? '☀️' : '🌙'}
                  </button>
                  
                  <button
                    className="button button-subtle"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </header>
        ) : null}
        
        <main className="app-main">
          <Routes>
            <Route path="/login" element={
              isAuthenticated ? <Navigate to="/" /> : (authLoading ? (
                <div className="auth-loading">
                  <div className="spinner"></div>
                </div>
              ) : <Login onLogin={handleLogin} />)
            } />
            
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                {currentUser?.isMasterAdmin ? <MasterAdminDashboard /> : <AnalyzerPage />}
              </ProtectedRoute>
            } />
            
            <Route path="/analyzer" element={
              <ProtectedRoute>
                <AnalyzerPage />
              </ProtectedRoute>
            } />
            
            <Route path="/history" element={
              <ProtectedRoute>
                <TranscriptHistory />
              </ProtectedRoute>
            } />
            <Route path="/transcript/:id" element={
              <ProtectedRoute>
                <TranscriptDetail />
              </ProtectedRoute>
            } />
            <Route path="/call-types" element={
              <ProtectedRoute>
                <CallTypeManager />
              </ProtectedRoute>
            } />
            <Route path="/agents" element={
              <ProtectedRoute>
                <AgentAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/api" element={
              <ProtectedRoute>
                <ApiPage />
              </ProtectedRoute>
            } />
            <Route path="/organizations" element={
              <ProtectedRoute>
                <OrganizationsPage />
              </ProtectedRoute>
            } />
            <Route path="/organizations/:organizationId/users" element={
              <ProtectedRoute>
                <UsersPage />
              </ProtectedRoute>
            } />
            <Route path="/organizations/:organizationId/users/new" element={
              <ProtectedRoute>
                <UserAddPage />
              </ProtectedRoute>
            } />
            <Route path="/organizations/:organizationId/users/:userId/edit" element={
              <ProtectedRoute>
                <UserEditPage />
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        
        <footer className="app-footer">
          <p>AI Nectar Desk © 2023</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;