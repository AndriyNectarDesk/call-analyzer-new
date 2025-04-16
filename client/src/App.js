import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
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
import NewTranscriptHistory from './components/NewTranscriptHistory';
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

// Create a wrapper component for App that provides the router context
function AppWrapper() {
  return (
    <Router>
      <AppContent />
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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showDemoMode, setShowDemoMode] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [isOnlyBloomsMode, setIsOnlyBloomsMode] = useState(localStorage.getItem('onlyBlooms') === 'true');
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);

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
          setIsMasterAdmin(response.data.user.isMasterAdmin || false);
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
  
  // Check dark mode preference
  useEffect(() => {
    const darkModePreference = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(darkModePreference);
    
    if (darkModePreference) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, []);
  
  // Check for demo mode
  useEffect(() => {
    // Only show and enable demo mode in development or specified environments
    const allowDemo = process.env.REACT_APP_ALLOW_DEMO === 'true' || process.env.NODE_ENV === 'development';
    setShowDemoMode(allowDemo);
    
    if (allowDemo) {
      const isDemoActive = localStorage.getItem('demoMode') === 'true';
      setDemoMode(isDemoActive);
    }
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
        id: org._id,
        name: org.name,
        code: org.code
      }));
    } catch (e) {
      console.error('Error saving organization to localStorage:', e);
    }
    
    // Navigate to the organization's page
    window.location.href = `/organizations/${org._id}/users`;
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode);
    document.body.classList.toggle('dark', newDarkMode);
  };

  const toggleDemoMode = () => {
    const newDemoMode = !demoMode;
    setDemoMode(newDemoMode);
    localStorage.setItem('demoMode', newDemoMode);
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
      
      // Set up headers
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
      };
      
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
      
      // Add call type to the FormData
      formData.append('callType', callType);
      
      // Set up headers
      const headers = {
        'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
      };
      
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
                    <div className="overview-text">
                      {analysis && analysis.callSummary ? Object.values(analysis.callSummary).filter(Boolean).join('. ') : 'No summary available'}
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

  // Helper function to get badge class based on subscription tier
  const getTierBadgeClass = (tier) => {
    switch (tier.toLowerCase()) {
      case 'premium':
      case 'enterprise':
        return 'badge-success';
      case 'pro':
      case 'professional':
      case 'business':
        return 'badge-primary';
      case 'basic':
        return 'badge-secondary';
      case 'free':
      case 'trial':
        return 'badge-warning';
      default:
        return 'badge-secondary';
    }
  };

  // Helper function to get color based on score
  const getScoreColor = (score) => {
    if (score >= 0.8) return '#4CAF50'; // green
    if (score >= 0.6) return '#2196F3'; // blue
    if (score >= 0.4) return '#FF9800'; // orange
    return '#F44336'; // red
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
                      <Link to="/history">History</Link>
                    </li>
                    <li>
                      <Link to="/new-history">New History</Link>
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
                        {currentOrganization && (
                          <li>
                            <Link to={`/organizations/${currentOrganization.id}/users`}>Users</Link>
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
                <HomeRoute />
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
            
            <Route path="/new-history" element={
              <ProtectedRoute>
                <NewTranscriptHistory />
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
  );
}

export default AppWrapper;