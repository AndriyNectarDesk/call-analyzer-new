import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
import './App.css';
import './styles/appleDesign.css';
import AudioUploader from './components/AudioUploader';
import OrganizationSelector from './components/OrganizationSelector';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import OrganizationsPage from './pages/OrganizationsPage';
import TranscriptDetail from './components/TranscriptDetail';
import CallTypeManager from './components/CallTypeManager';
import ApiPage from './components/ApiPage';
import UsersPage from './pages/UsersPage';
import UserAddPage from './pages/UserAddPage';
import UserEditPage from './pages/UserEditPage';
import MasterAdminDashboard from './components/MasterAdminDashboard';
import MasterAdminMenu from './components/MasterAdminMenu';
import TranscriptsHistoryPage from './pages/TranscriptsHistoryPage';
import AgentsPage from './pages/AgentsPage';
import AgentDetailPage from './pages/AgentDetailPage';
import AuthProvider from './contexts/AuthContext';

// Create a wrapper component for App that provides the router context
function AppWrapper() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

// Main App component that can use router hooks
function AppContent() {
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
  const [demoMode, setDemoMode] = useState(false);
  const [language, setLanguage] = useState('auto');

  const navigate = useNavigate();
  const location = useLocation();

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
            // Find the master organization (code: 'master-org') or use the first organization
            const masterOrg = organizations.find(org => org.code === 'master-org') || organizations[0];
            if (masterOrg) {
              setCurrentOrganization(masterOrg);
              console.log('Set current organization for master admin:', masterOrg.name, masterOrg._id);
            } else if (organizations.length > 0) {
              setCurrentOrganization(organizations[0]);
              console.log('No master org found, using first organization:', organizations[0].name);
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

  // Load saved organization from localStorage
  useEffect(() => {
    if (userOrganizations.length > 0) {
      try {
        const savedOrg = localStorage.getItem('selectedOrganization');
        if (savedOrg) {
          const parsedOrg = JSON.parse(savedOrg);
          // Find the full organization object from our userOrganizations
          const matchingOrg = userOrganizations.find(org => org._id === parsedOrg.id);
          if (matchingOrg) {
            setCurrentOrganization(matchingOrg);
          }
        }
      } catch (e) {
        console.error('Error loading saved organization:', e);
      }
    }
  }, [userOrganizations]);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuthStatus = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        
        // Redirect to login if on a protected route
        if (
          !location.pathname.startsWith('/login') && 
          !location.pathname.startsWith('/register') && 
          !location.pathname.startsWith('/forgot-password') && 
          !location.pathname.startsWith('/reset-password') && 
          !location.pathname.startsWith('/verify-email') && 
          !location.pathname.startsWith('/activation-success')
        ) {
          navigate('/login');
        }
        return;
      }
      
      try {
        const baseApiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        const response = await axios.get(`${baseApiUrl}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data && response.data.user) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          navigate('/login');
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        localStorage.removeItem('auth_token');
        setIsAuthenticated(false);
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthStatus();
  }, [navigate, location.pathname]);
  
  // Check for demo mode
  useEffect(() => {
    // Only show and enable demo mode in development or specified environments
    const allowDemo = process.env.REACT_APP_ALLOW_DEMO === 'true' || process.env.NODE_ENV === 'development';
    setDemoMode(allowDemo);
  }, []);

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
          // Find the master organization (code: 'master-org') or use the first organization
          const masterOrg = organizations.find(org => org.code === 'master-org') || organizations[0];
          if (masterOrg) {
            setCurrentOrganization(masterOrg);
            console.log('Set current organization for master admin:', masterOrg.name, masterOrg._id);
          } else if (organizations.length > 0) {
            setCurrentOrganization(organizations[0]);
            console.log('No master org found, using first organization:', organizations[0].name);
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
    localStorage.removeItem('selectedOrganization');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentOrganization(null);
    setUserOrganizations([]);
  };

  const handleSwitchOrganization = (org) => {
    setCurrentOrganization(org);
    
    // Store the selected organization in localStorage for persistence
    try {
      localStorage.setItem('selectedOrganization', JSON.stringify({
        id: org._id,  // Keep legacy 'id' property for backwards compatibility
        _id: org._id, // Add the '_id' property to ensure consistency
        name: org.name,
        code: org.code
      }));
    } catch (e) {
      console.error('Error saving organization to localStorage:', e);
    }
    
    // Navigate to the organization's dashboard instead of users page
    if (window.location.pathname.includes('/master-admin')) {
      // If on master admin dashboard, stay there
      return;
    } else if (window.location.pathname.includes('/organizations')) {
      // If already in organizations section, stay on current page
      return;
    } else {
      // Otherwise go to main dashboard
      window.location.href = `/`;
    }
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
      
      // Check if "Only Blooms" is active
      const onlyBloomsActive = localStorage.getItem('onlyBlooms') === 'true';
      
      // Make sure we have the correct organization set if Only Blooms is active
      if (onlyBloomsActive && userOrganizations.length > 0) {
        const bloomsOrg = userOrganizations.find(org => org.name.includes('Blooms') || org.code.includes('blooms'));
        if (bloomsOrg && (!currentOrganization || currentOrganization._id !== bloomsOrg._id)) {
          console.log('Only Blooms mode active but wrong organization selected. Setting to:', bloomsOrg.name);
          setCurrentOrganization(bloomsOrg);
          
          // Update localStorage
          localStorage.setItem('selectedOrganization', JSON.stringify({
            id: bloomsOrg._id,
            name: bloomsOrg.name,
            code: bloomsOrg.code
          }));
        }
      }
      
      console.log('Analyzing transcript for organization:', currentOrganization?.name, currentOrganization?._id);
      console.log('Using language:', language);
      
      // Set up headers
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
      };
      
      // Add language header
      if (language !== 'auto') {
        headers['X-Language'] = language;
      }
      
      // Add organization header if needed
      if (onlyBloomsActive) {
        // New general approach
        headers['X-Organization-Name'] = 'Blooms';
        
        // Keep backward compatibility
        headers['X-Only-Blooms'] = 'true';
        
        console.log('Adding organization headers for API request - targeting Blooms organization');
      } else if (currentOrganization) {
        // For other organizations, we can specify the organization directly
        headers['X-Organization-Name'] = currentOrganization.name;
        console.log(`Adding organization header for API request - targeting ${currentOrganization.name}`);
      }
      
      const response = await fetch(apiUrl + '/api/analyze', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          transcript: transcript,
          callType: callType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze transcript. Please try again.');
      }

      const data = await response.json();
      console.log('API Response:', data); // Log the full response for debugging
      
      // The API returns data.analysis which contains the actual analysis
      if (data && data.analysis) {
        setAnalysis(data.analysis);
      } else if (data) {
        setAnalysis(data);
      } else {
        throw new Error('No analysis data returned from the server.');
      }
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
      
      // Check if "Only Blooms" is active
      const onlyBloomsActive = localStorage.getItem('onlyBlooms') === 'true';
      
      // Make sure we have the correct organization set if Only Blooms is active
      if (onlyBloomsActive && userOrganizations.length > 0) {
        const bloomsOrg = userOrganizations.find(org => org.name.includes('Blooms') || org.code.includes('blooms'));
        if (bloomsOrg && (!currentOrganization || currentOrganization._id !== bloomsOrg._id)) {
          console.log('Only Blooms mode active but wrong organization selected. Setting to:', bloomsOrg.name);
          setCurrentOrganization(bloomsOrg);
          
          // Update localStorage
          localStorage.setItem('selectedOrganization', JSON.stringify({
            id: bloomsOrg._id,
            name: bloomsOrg.name,
            code: bloomsOrg.code
          }));
        }
      }
      
      console.log('Transcribing audio for organization:', currentOrganization?.name, currentOrganization?._id);
      console.log('Using language:', language);
      
      // Set up headers (everything except Content-Type which is set by FormData)
      const headers = {
        'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
      };
      
      // Add language header
      if (language !== 'auto') {
        headers['X-Language'] = language;
      }
      
      // Add organization header if needed
      if (onlyBloomsActive) {
        // New general approach
        headers['X-Organization-Name'] = 'Blooms';
        
        // Keep backward compatibility
        headers['X-Only-Blooms'] = 'true';
        
        console.log('Adding organization headers for API request - targeting Blooms organization');
      } else if (currentOrganization) {
        // For other organizations, we can specify the organization directly
        headers['X-Organization-Name'] = currentOrganization.name;
        console.log(`Adding organization header for API request - targeting ${currentOrganization.name}`);
      }
      
      // Add call type to formData
      formData.append('callType', callType);
      
      const response = await fetch(apiUrl + '/api/transcribe' || fallbackUrl + '/api/transcribe', {
        method: 'POST',
        headers: headers,
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to transcribe audio');
      }

      const data = await response.json();
      console.log('Transcribe API Response:', data); // Log the full response for debugging
      
      if (data.transcript) {
        setTranscript(data.transcript);
        
        if (data.analysis) {
          setAnalysis(data.analysis);
          console.log('Setting analysis data:', data.analysis);
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
                    
                    <div className="form-group">
                      <label htmlFor="language">Language</label>
                      <select
                        id="language"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="select"
                        disabled={isLoading}
                      >
                        <option value="auto">Auto-detect</option>
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
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
                    language={language}
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
                  
                  <div className="form-group">
                    <label htmlFor="audioLanguage">Language</label>
                    <select
                      id="audioLanguage"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="select"
                      disabled={isLoading}
                    >
                      <option value="auto">Auto-detect</option>
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
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

            {isLoading ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Analyzing your call...</p>
              </div>
            ) : analysis && !error ? (
              <div className="analyzer-results">
                <div className="call-summary-section">
                  <h2>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 19H2v-8H6V5h12v6h4v8h-9" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="M13 11l2 2 4-4" />
                    </svg>
                    Call Summary
                  </h2>
                  
                  <div className="overview-card">
                    {analysis && analysis.callSummary && analysis.callSummary.briefSummary && (
                      <div className="brief-summary">
                        <strong>Brief Summary:</strong> {analysis.callSummary.briefSummary}
                      </div>
                    )}
                    <div className="overview-text">
                      {analysis && analysis.callSummary ? Object.entries(analysis.callSummary)
                        .filter(([key]) => key !== 'briefSummary') // Filter out the brief summary as it's shown separately
                        .map(([key, value]) => value ? value : null)
                        .filter(Boolean)
                        .join('. ') : 'No summary available'}
                    </div>
                  </div>
                  
                  <div className="metrics-grid">
                    <div className={`metric-card ${analysis && analysis.scorecard && analysis.scorecard.customerService ? 
                      (analysis.scorecard.customerService > 7 ? 'positive-sentiment' : 
                       analysis.scorecard.customerService < 4 ? 'negative-sentiment' : 
                       'neutral-sentiment') : ''}`}>
                      <h3>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                          <line x1="9" y1="9" x2="9.01" y2="9"></line>
                          <line x1="15" y1="9" x2="15.01" y2="9"></line>
                        </svg>
                        Sentiment
                      </h3>
                      <div className="metric-value">
                        {analysis && analysis.scorecard && analysis.scorecard.customerService 
                          ? (analysis.scorecard.customerService > 7 ? 'Positive' : 
                             analysis.scorecard.customerService < 4 ? 'Negative' : 'Neutral') 
                          : 'N/A'}
                      </div>
                      <div className="metric-decoration"></div>
                    </div>
                    
                    <div className="metric-card satisfaction-metric">
                      <h3>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                        </svg>
                        Customer Satisfaction
                      </h3>
                      <div className="metric-value">
                        {analysis && analysis.scorecard && analysis.scorecard.customerService ? Math.round(analysis.scorecard.customerService * 10) : 0}
                        <span>%</span>
                      </div>
                      <div className="metric-decoration"></div>
                    </div>
                    
                    <div className="metric-card agent-metric">
                      <h3>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        Agent Performance
                      </h3>
                      <div className="metric-value">
                        {analysis && analysis.scorecard && analysis.scorecard.overallScore ? Math.round(analysis.scorecard.overallScore * 10) : 0}
                        <span>%</span>
                      </div>
                      <div className="metric-decoration"></div>
                    </div>
                    
                    <div className="metric-card efficiency-metric">
                      <h3>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        Call Efficiency
                      </h3>
                      <div className="metric-value">
                        {analysis && analysis.scorecard && analysis.scorecard.processEfficiency ? Math.round(analysis.scorecard.processEfficiency * 10) : 0}
                        <span>%</span>
                      </div>
                      <div className="metric-decoration"></div>
                    </div>
                  </div>
                </div>
                
                <div className="key-insights-section">
                  <h2>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    Key Insights
                  </h2>
                  <ul className="insights-list">
                    {analysis && analysis.agentPerformance && analysis.agentPerformance.strengths && analysis.agentPerformance.strengths.map((insight, index) => (
                      <li key={`strength-${index}`} className="insight-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                        </svg>
                        <div className="insight-content">{insight}</div>
                      </li>
                    ))}
                    {analysis && analysis.agentPerformance && analysis.agentPerformance.areasForImprovement && analysis.agentPerformance.areasForImprovement.map((insight, index) => (
                      <li key={`improvement-${index}`} className="insight-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
                        </svg>
                        <div className="insight-content">{insight}</div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="scorecard-section">
                  <h2>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                    Performance Scorecard
                  </h2>
                  <div className="scorecard">
                    {analysis && analysis.scorecard && Object.entries(analysis.scorecard).map(([key, value]) => (
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

                <div className="recommendation-section">
                  <h2>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                    Recommended Actions
                  </h2>
                  <ul className="recommendations-list">
                    {analysis && analysis.improvementSuggestions && analysis.improvementSuggestions.map((item, index) => (
                      <li key={index} className="recommendation-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="16"></line>
                          <line x1="8" y1="12" x2="16" y2="12"></line>
                        </svg>
                        <div className="recommendation-content">{item}</div>
                      </li>
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

  // Check if the current organization is the master organization
  const isMasterOrganizationSelected = () => {
    if (!currentOrganization) return false;
    return currentOrganization.code === 'master-org';
  };
  
  // Home route component with conditional rendering
  const HomeRoute = () => {
    // If user is master admin but not in master organization context
    if (currentUser?.isMasterAdmin && !isMasterOrganizationSelected()) {
      console.log("Master admin in non-master organization context. Showing analyzer page.");
      return <AnalyzerPage />;
    }
    
    // Normal routing logic
    return currentUser?.isMasterAdmin && isMasterOrganizationSelected() ? 
      <MasterAdminDashboard /> : 
      <AnalyzerPage />;
  };

  return (
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
                    <Link to="/transcripts-history">Call Transcripts</Link>
                  </li>
                  <li>
                    <Link to="/agents">Agents</Link>
                  </li>
                  {currentUser && currentUser.isMasterAdmin && (
                    <>
                      {currentOrganization && (
                        <li>
                          <Link to={`/organizations/${currentOrganization._id || currentOrganization.id}/users`}>Users</Link>
                        </li>
                      )}
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
                  onSelectOrganization={handleSwitchOrganization}
                  isMasterAdmin={currentUser?.isMasterAdmin}
                />
              )}
              
              {/* Add Master Admin Menu only for master admin users in master organization */}
              {currentUser?.isMasterAdmin && isMasterOrganizationSelected() && (
                <MasterAdminMenu />
              )}
              
              <div className="user-menu">
                {currentUser && (
                  <div className="user-info">
                    <span className="user-name">{currentUser.firstName}</span>
                  </div>
                )}
                
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
              <HomeRoute />
            </ProtectedRoute>
          } />
          
          <Route path="/analyzer" element={
            <ProtectedRoute>
              <AnalyzerPage />
            </ProtectedRoute>
          } />
          
          <Route path="/transcripts-history" element={
            <ProtectedRoute>
              <TranscriptsHistoryPage />
            </ProtectedRoute>
          } />
          
          <Route path="/transcripts/:id" element={
            <ProtectedRoute>
              <TranscriptDetail />
            </ProtectedRoute>
          } />
          
          <Route path="/call-types" element={
            <ProtectedRoute>
              <CallTypeManager />
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
          
          <Route path="/agents" element={
            <ProtectedRoute>
              <AgentsPage />
            </ProtectedRoute>
          } />
          
          <Route path="/agents/add" element={
            <ProtectedRoute>
              <AgentsPage />
            </ProtectedRoute>
          } />
          
          <Route path="/agents/:id" element={
            <ProtectedRoute>
              <AgentDetailPage />
            </ProtectedRoute>
          } />
          
          <Route path="/agents/:id/edit" element={
            <ProtectedRoute>
              <AgentsPage />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      
      <footer className="app-footer">
        <p>AI Nectar Desk © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default AppWrapper;