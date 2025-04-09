import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import './styles/appleDesign.css';

// Icons (would use proper icon components in real implementation)
const AnalyzeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 13V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 7H10.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const HistoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 6V10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.325 2.317C8.751 0.561 11.249 0.561 11.675 2.317C11.7389 2.5808 11.8642 2.82578 12.0405 3.032C12.2168 3.23822 12.4399 3.39985 12.6907 3.50375C12.9414 3.60764 13.2132 3.65085 13.4838 3.62987C13.7544 3.60889 14.0162 3.5243 14.248 3.383C15.791 2.443 17.558 4.209 16.618 5.753C16.4769 5.98466 16.3924 6.24634 16.3715 6.51677C16.3506 6.78721 16.3938 7.05877 16.4975 7.30938C16.6013 7.55999 16.7627 7.78258 16.9687 7.95905C17.1747 8.13553 17.4194 8.26091 17.683 8.325C19.439 8.751 19.439 11.249 17.683 11.675C17.4192 11.7389 17.1742 11.8642 16.968 12.0405C16.7618 12.2168 16.6001 12.4399 16.4963 12.6907C16.3924 12.9414 16.3491 13.2132 16.3701 13.4838C16.3911 13.7544 16.4757 14.0162 16.617 14.248C17.557 15.791 15.791 17.558 14.247 16.618C14.0153 16.4769 13.7537 16.3924 13.4832 16.3715C13.2128 16.3506 12.9412 16.3938 12.6906 16.4975C12.44 16.6013 12.2174 16.7627 12.0409 16.9687C11.8645 17.1747 11.7391 17.4194 11.675 17.683C11.249 19.439 8.751 19.439 8.325 17.683C8.26108 17.4192 8.13578 17.1742 7.95949 16.968C7.7832 16.7618 7.56011 16.6001 7.30935 16.4963C7.05859 16.3924 6.78683 16.3491 6.51621 16.3701C6.24559 16.3911 5.98375 16.4757 5.752 16.617C4.209 17.557 2.442 15.791 3.382 14.247C3.5231 14.0153 3.60755 13.7537 3.62848 13.4832C3.64942 13.2128 3.60624 12.9412 3.50247 12.6906C3.3987 12.44 3.23726 12.2174 3.03127 12.0409C2.82529 11.8645 2.58056 11.7391 2.317 11.675C0.561 11.249 0.561 8.751 2.317 8.325C2.5808 8.26108 2.82578 8.13578 3.032 7.95949C3.23822 7.7832 3.39985 7.56011 3.50375 7.30935C3.60764 7.05859 3.65085 6.78683 3.62987 6.51621C3.60889 6.24559 3.5243 5.98375 3.383 5.752C2.443 4.209 4.209 2.442 5.753 3.382C6.753 3.99 8.049 3.452 8.325 2.317Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 13C11.6569 13 13 11.6569 13 10C13 8.34315 11.6569 7 10 7C8.34315 7 7 8.34315 7 10C7 11.6569 8.34315 13 10 13Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const OrganizationIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 3V7C14 7.26522 13.8946 7.51957 13.7071 7.70711C13.5196 7.89464 13.2652 8 13 8H8M8 8V4C8 3.73478 8.10536 3.48043 8.29289 3.29289C8.48043 3.10536 8.73478 3 9 3H17C17.2652 3 17.5196 3.10536 17.7071 3.29289C17.8946 3.48043 18 3.73478 18 4V16C18 16.2652 17.8946 16.5196 17.7071 16.7071C17.5196 16.8946 17.2652 17 17 17H9C8.73478 17 8.48043 16.8946 8.29289 16.7071C8.10536 16.5196 8 16.2652 8 16V8ZM8 8H3C2.73478 8 2.48043 7.89464 2.29289 7.70711C2.10536 7.51957 2 7.26522 2 7V4C2 3.73478 2.10536 3.48043 2.29289 3.29289C2.48043 3.10536 2.73478 3 3 3H6C6.26522 3 6.51957 3.10536 6.70711 3.29289C6.89464 3.48043 7 3.73478 7 4V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.6666 18V16.3333C16.6666 15.4493 16.3155 14.6014 15.6904 13.9763C15.0652 13.3512 14.2174 13 13.3333 13H6.66665C5.78259 13 4.93474 13.3512 4.30962 13.9763C3.6845 14.6014 3.33331 15.4493 3.33331 16.3333V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 9.66667C11.8409 9.66667 13.3333 8.17428 13.3333 6.33333C13.3333 4.49238 11.8409 3 10 3C8.15905 3 6.66666 4.49238 6.66666 6.33333C6.66666 8.17428 8.15905 9.66667 10 9.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const AppPreview = () => {
  const [callType, setCallType] = useState('auto');
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Mock available call types
  const availableCallTypes = [
    { _id: '1', code: 'customer_service', name: 'Customer Service' },
    { _id: '2', code: 'hearing', name: 'Hearing Aid Clinic' },
    { _id: '3', code: 'flower', name: 'Flower Shop' },
    { _id: '4', code: 'insurance', name: 'Insurance Claim' }
  ];

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle('dark');
  };

  // Simulated analysis result
  const mockAnalysis = {
    callSummary: {
      agentName: "Sarah Johnson",
      customerName: "Michael Thompson",
      purpose: "Scheduling a hearing test appointment",
      resolution: "Appointment scheduled for Tuesday at 10:30 AM",
      followUp: "Reminder call day before appointment"
    },
    agentPerformance: {
      strengths: [
        "Excellent product knowledge",
        "Clear communication of appointment details",
        "Friendly and professional tone"
      ],
      areasForImprovement: [
        "Could have explained hearing test procedure",
        "Missed opportunity to mention available hearing aid models",
        "Did not verify contact information"
      ]
    },
    improvementSuggestions: [
      "Always explain what the patient can expect during their appointment",
      "Mention the range of hearing aid options available",
      "Confirm all contact information is current"
    ],
    scorecard: {
      customerService: 8,
      productKnowledge: 9,
      processEfficiency: 7,
      problemSolving: 8,
      overallScore: 8
    }
  };

  return (
    <Router>
      <div className={`app-container ${isDarkMode ? 'dark' : ''}`}>
        <header className="app-header">
          <div className="header-content">
            <Link to="/" className="app-title">
              <h1>AI Nectar Desk</h1>
            </Link>
            
            <nav>
              <ul className="nav-links">
                <li>
                  <NavLink to="/" className="nav-link">
                    <AnalyzeIcon /> Analyze
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/history" className="nav-link">
                    <HistoryIcon /> History
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/settings" className="nav-link">
                    <SettingsIcon /> Settings
                  </NavLink>
                </li>
                {/* Only visible for master admin */}
                <li>
                  <NavLink to="/organizations" className="nav-link">
                    <OrganizationIcon /> Organizations
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/users" className="nav-link">
                    <UserIcon /> Users
                  </NavLink>
                </li>
              </ul>
            </nav>
            
            <div className="user-menu">
              <div className="toggle-container" onClick={toggleDarkMode}>
                <input type="checkbox" className="toggle-input" checked={isDarkMode} onChange={() => {}} />
                <span className="toggle-slider"></span>
              </div>
            </div>
          </div>
        </header>
        
        <Routes>
          <Route path="/" element={
            <div className="main-content">
              <div className="analyzer-container">
                <div className="input-section">
                  <div className="card">
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
                    
                    <h3>Call Transcript</h3>
                    <textarea 
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      placeholder="Paste your call transcript here or upload an audio file below..."
                      className="textarea"
                    />
                    
                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
                      <button className="button button-subtle">
                        Upload Audio
                      </button>
                      
                      <button 
                        className="button"
                        disabled={!transcript.trim() || isLoading}
                      >
                        {isLoading ? 'Analyzing...' : 'Analyze Transcript'}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="results-section">
                  <h2>Analysis Results</h2>
                  
                  <div className="card">
                    <h3>Call Summary</h3>
                    <ul className="summary-list">
                      {Object.entries(mockAnalysis.callSummary).map(([key, value]) => (
                        <li key={key}>
                          <strong>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong> <span>{value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="card">
                    <h3>Agent Performance</h3>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <h4>Strengths</h4>
                      <ul>
                        {mockAnalysis.agentPerformance.strengths.map((strength, index) => (
                          <li key={index}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <h4>Areas for Improvement</h4>
                      <ul>
                        {mockAnalysis.agentPerformance.areasForImprovement.map((area, index) => (
                          <li key={index}>{area}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="card">
                    <h3>Scorecard</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                      {Object.entries(mockAnalysis.scorecard).map(([key, value]) => (
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
                </div>
              </div>
            </div>
          } />
          
          {/* Other routes would be defined here */}
        </Routes>
        
        <footer className="app-footer">
          <p>AI Nectar Desk © {new Date().getFullYear()}</p>
        </footer>
      </div>
    </Router>
  );
};

// Helper function to get color based on score
const getScoreColor = (score) => {
  if (score >= 9) return 'var(--success-color)';
  if (score >= 7) return 'var(--primary-color)';
  if (score >= 5) return 'var(--warning-color)';
  return 'var(--error-color)';
};

export default AppPreview; 