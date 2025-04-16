import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

function ApiPage() {
  const [apiKey, setApiKey] = useState('');
  const [apiStatus, setApiStatus] = useState('Loading...');
  const [copied, setCopied] = useState({
    apiKey: false,
    curlCommand: false,
    nodeCommand: false,
    curlAudioCommand: false,
    nodeAudioCommand: false,
    curlNectarCommand: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [exampleTab, setExampleTab] = useState('transcript');
  const [currentOrganization, setCurrentOrganization] = useState(null);

  // Base URL for the API, defaulting to localhost in development
  const baseApiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  
  // Generate a masked API key for display (last 8 chars are real)
  const maskApiKey = (key) => {
    if (!key) return 'Not available';
    return `••••••••••••••••${key.slice(-8)}`;
  };

  // Check API key status from server
  useEffect(() => {
    fetchApiKey();
  }, []);

  const fetchApiKey = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get the token from localStorage
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        console.error('Authentication token not found');
        setError('Authentication token not found. Please log in again.');
        setApiStatus('Error');
        setIsLoading(false);
        return;
      }
      
      // Get user info to check organization ID
      try {
        const userResponse = await axios.get(`${baseApiUrl}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('Current user info:', userResponse.data);
        if (!userResponse.data.user?.organization?._id) {
          console.error('User has no organization ID', userResponse.data);
          setError('Your account is not associated with an organization. Please contact an administrator.');
          setApiStatus('Error');
          setIsLoading(false);
          return;
        }
      } catch (userErr) {
        console.error('Error fetching user info:', userErr);
      }
      
      console.log('Fetching API key from:', `${baseApiUrl}/api/organizations/api-key`);
      
      // Fetch the API key from the server
      const response = await axios.get(`${baseApiUrl}/api/organizations/api-key`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('API key response:', { 
        status: response.status, 
        data: response.data ? '(data received)' : 'no data',
        hasKey: response.data?.key ? 'yes' : 'no'
      });
      
      if (response.data && response.data.key) {
        setApiKey(response.data.key);
        setApiStatus('Valid');
      } else {
        console.error('No key in response data:', response.data);
        setApiKey('');
        setApiStatus('Not Found');
      }
    } catch (err) {
      console.error('Error fetching API key:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response ? {
          status: err.response.status,
          data: err.response.data
        } : 'No response',
        request: err.request ? 'Request was made but no response' : 'No request'
      });
      
      let errorMessage = 'Error loading API key information. ';
      if (err.response && err.response.data) {
        errorMessage += err.response.data.message || JSON.stringify(err.response.data);
      } else {
        errorMessage += err.message;
      }
      
      setError(errorMessage);
      setApiStatus('Error');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate a new API key
  const generateNewApiKey = async () => {
    try {
      setIsGenerating(true);
      setSuccessMessage('');
      setError(null);
      
      // Get the token from localStorage
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setIsGenerating(false);
        return;
      }
      
      // First check user information to ensure we have a valid organization
      let userOrganizationId;
      try {
        const userResponse = await axios.get(`${baseApiUrl}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('Current user info for key generation:', userResponse.data);
        userOrganizationId = userResponse.data.user?.organization?._id;
        
        if (!userOrganizationId) {
          console.error('User has no organization ID for key generation', userResponse.data);
          setError('Your account is not associated with an organization. Please contact an administrator.');
          setIsGenerating(false);
          return;
        }
      } catch (userErr) {
        console.error('Error fetching user info for key generation:', userErr);
        setError('Error fetching user information: ' + userErr.message);
        setIsGenerating(false);
        return;
      }
      
      try {
        console.log('Generating new API key for organization:', userOrganizationId);
        
        // Call the API to generate a new API key with explicit organizationId
        const response = await axios.post(`${baseApiUrl}/api/organizations/${userOrganizationId}/api-keys`, {
          name: `API Key - ${new Date().toLocaleDateString()}`
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('API key generation response:', {
          status: response.status,
          hasData: !!response.data,
          keyInfo: response.data ? 'API key data received' : 'No key data'
        });
        
        if (response.data && response.data.key) {
          setApiKey(response.data.key);
          setApiStatus('Valid');
          setSuccessMessage('New API key generated successfully');
          
          // Clear success message after 5 seconds
          setTimeout(() => {
            setSuccessMessage('');
          }, 5000);
        } else {
          console.error('No key in generation response:', response.data);
          setError('Failed to generate API key. Please try again.');
        }
      } catch (userErr) {
        console.error('Error fetching user info for key generation:', userErr);
      }
    } catch (err) {
      console.error('Error generating API key:', err);
      
      let errorMessage = 'Failed to generate API key. ';
      if (err.response) {
        console.error('Error response:', err.response.status, err.response.data);
        errorMessage += err.response.data?.message || JSON.stringify(err.response.data);
      } else if (err.request) {
        console.error('Error request:', err.request);
        errorMessage += 'No response received from server.';
      } else {
        errorMessage += err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle copy events
  const handleCopy = (field) => {
    setCopied({
      ...copied,
      [field]: true
    });
    
    // Reset copied status after 2 seconds
    setTimeout(() => {
      setCopied({
        ...copied,
        [field]: false
      });
    }, 2000);
  };

  // Generate example curl command
  const curlExample = `curl -X POST ${baseApiUrl}/api/external/analyze \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "transcript": "Agent: Thank you for calling our hearing aid clinic. My name is Sarah. How can I help you today?\\nCustomer: Hi Sarah, this is John. I received my new hearing aids last week, but I'm having trouble with the volume adjustment.",
    "callType": "hearing-aid-clinic",
    "metadata": {
      "agentId": "12345",
      "callId": "call-98765",
      "customer": "John Smith"
    }
  }'`;

  // Alternative curl example with audioUrl
  const curlAudioExample = `curl -X POST ${baseApiUrl}/api/external/analyze \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "audioUrl": "https://example.com/calls/recording123.mp3",
    "callType": "hearing-aid-clinic",
    "metadata": {
      "agentId": "12345",
      "callId": "call-98765",
      "customer": "John Smith"
    }
  }'`;

  // NectarDesk specific curl example
  const curlNectarExample = `curl -X POST ${baseApiUrl}/api/external/analyze \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "audioUrl": "https://nectarflowers.nectardesk.io/api/call/recording/52751",
    "callType": "flower-shop",
    "metadata": {
      "agentId": "agent123",
      "callId": "52751",
      "department": "sales"
    }
  }'`;

  // Generate example Node.js code
  const nodeExample = `const axios = require('axios');

async function analyzeTranscript() {
  try {
    const response = await axios.post('${baseApiUrl}/api/external/analyze', {
      transcript: "Agent: Thank you for calling our hearing aid clinic. My name is Sarah. How can I help you today?\\nCustomer: Hi Sarah, this is John. I received my new hearing aids last week, but I'm having trouble with the volume adjustment.",
      callType: "hearing-aid-clinic",
      metadata: {
        agentId: "12345",
        callId: "call-98765",
        customer: "John Smith"
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'YOUR_API_KEY'
      }
    });
    
    console.log('Analysis results:', response.data);
  } catch (error) {
    console.error('Analysis error:', error.response?.data || error.message);
  }
}

analyzeTranscript();`;

  // Alternative Node.js example with audioUrl
  const nodeAudioExample = `const axios = require('axios');

async function analyzeAudioUrl() {
  try {
    const response = await axios.post('${baseApiUrl}/api/external/analyze', {
      audioUrl: "https://example.com/calls/recording123.mp3",
      callType: "hearing-aid-clinic",
      metadata: {
        agentId: "12345",
        callId: "call-98765",
        customer: "John Smith"
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'YOUR_API_KEY'
      }
    });
    
    console.log('Analysis results:', response.data);
  } catch (error) {
    console.error('Analysis error:', error.response?.data || error.message);
  }
}

analyzeAudioUrl();`;

  // Get the current organization info from state/local storage
  useEffect(() => {
    // Get the token
    const token = localStorage.getItem('auth_token');
    
    if (token) {
      // Check if Only Blooms mode is active
      const onlyBloomsActive = localStorage.getItem('onlyBlooms') === 'true';
      console.log('Only Blooms mode active in API page?', onlyBloomsActive);
      
      // First get the user info to determine the appropriate organization
      axios.get(`${baseApiUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        console.log('User info for organization:', response.data);
        if (response.data && response.data.user) {
          if (onlyBloomsActive) {
            // When Only Blooms is active, we need to find the Blooms organization
            console.log('Only Blooms mode is active, fetching organizations to find Blooms');
            
            // For any user, we need to find the Blooms organization
            axios.get(`${baseApiUrl}/api/master-admin/organizations`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            .then(orgsResponse => {
              if (orgsResponse.data && orgsResponse.data.length > 0) {
                // Find the Blooms organization
                const bloomsOrg = orgsResponse.data.find(org => 
                  org.name.includes('Blooms') || org.code.includes('blooms')
                );
                
                if (bloomsOrg) {
                  console.log('Found Blooms organization for API key:', bloomsOrg.name, bloomsOrg._id);
                  setCurrentOrganization(bloomsOrg);
                  
                  // Now fetch the API key for this specific organization
                  fetchOrganizationApiKey(token, bloomsOrg._id);
                } else {
                  console.error('Only Blooms mode active but no Blooms organization found');
                  setError('Only Blooms mode active but no Blooms organization found');
                }
              }
            })
            .catch(err => console.error('Error fetching organizations for Only Blooms mode:', err));
          }
          // If not in Only Blooms mode, use the regular flow
          else if (response.data.user.organization && response.data.user.organization._id) {
            const userOrg = response.data.user.organization;
            console.log('Using user organization for API key:', userOrg.name, userOrg._id);
            setCurrentOrganization(userOrg);
            
            // Now fetch the API key for this user's organization
            fetchOrganizationApiKey(token, userOrg._id);
          } 
          // For master admins without an organization, find the appropriate one
          else if (response.data.user.isMasterAdmin) {
            axios.get(`${baseApiUrl}/api/master-admin/organizations`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            .then(orgsResponse => {
              if (orgsResponse.data && orgsResponse.data.length > 0) {
                // Find master org or use first org
                const masterOrg = orgsResponse.data.find(org => org.isMaster) || orgsResponse.data[0];
                console.log('Master admin using organization for API key:', masterOrg.name, masterOrg._id);
                setCurrentOrganization(masterOrg);
                
                // Now fetch the API key for this master org
                fetchOrganizationApiKey(token, masterOrg._id);
              }
            })
            .catch(err => console.error('Error fetching organizations for master admin:', err));
          }
        }
      })
      .catch(err => {
        console.error('Error fetching user info for organization ID:', err);
        setError('Failed to determine your organization. Please try refreshing the page.');
      });
    }
  }, []);
  
  // Helper function to fetch the API key for a specific organization
  const fetchOrganizationApiKey = (token, orgId) => {
    console.log(`Fetching API key for organization: ${orgId}`);
    
    axios.get(`${baseApiUrl}/api/organizations/${orgId}/api-key`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (response.data && response.data.key) {
        console.log('Successfully retrieved API key for organization:', orgId);
        setApiKey(response.data.key);
        setApiStatus('Valid');
      } else {
        console.log('No API key found for organization:', orgId);
        setApiKey('');
        setApiStatus('Not Found');
      }
    })
    .catch(err => {
      console.error(`Error fetching API key for organization ${orgId}:`, err);
      setError(`Failed to retrieve API key for your organization: ${err.response?.data?.message || err.message}`);
    })
    .finally(() => {
      setIsLoading(false);
    });
  };

  if (isLoading) {
    return (
      <div className="api-page loading">
        <div className="spinner"></div>
        <p>Loading API information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="api-page error">
        <h2>API Access</h2>
        <div className="error-container">
          <p className="error-message">{error}</p>
          {error.includes('No active API key found') && (
            <div className="no-key-message">
              <p>No API key has been created for your organization yet. Click the button below to generate one.</p>
              <button 
                className="generate-button"
                onClick={generateNewApiKey}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <span className="generate-spinner"></span>
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="generate-icon">🔑</span>
                    Generate New API Key
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="api-page">
      <h2>API Access</h2>
      
      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}
      
      <div className="api-info-section">
        <h3>Your API Key</h3>
        <div className="api-key-container">
          <div className="api-key-display">
            <span className="key-label">API Key:</span>
            <span className="key-value">{maskApiKey(apiKey)}</span>
            <span className={`api-status ${apiStatus.toLowerCase()}`}>{apiStatus}</span>
          </div>
          
          <div className="api-key-actions">
            <button 
              className="copy-button"
              onClick={() => {
                navigator.clipboard.writeText(apiKey);
                handleCopy('apiKey');
              }}
              disabled={!apiKey || apiStatus !== 'Valid'}
            >
              {copied.apiKey ? (
                <>
                  <span className="copy-icon">✓</span>
                  Copied!
                </>
              ) : (
                <>
                  <span className="copy-icon">📋</span>
                  Copy Key
                </>
              )}
            </button>
            
            <button 
              className="generate-button"
              onClick={generateNewApiKey}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <span className="generate-spinner"></span>
                  Generating...
                </>
              ) : (
                <>
                  <span className="generate-icon">🔑</span>
                  Generate New API Key
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="api-security-note">
          <p>
            <strong>Security Note:</strong> Keep your API key secure. Don't share it or expose it in client-side code.
            If you believe your key has been compromised, please contact support to have it regenerated.
          </p>
        </div>
      </div>
      
      <div className="api-endpoints-section">
        <h3>API Endpoints</h3>
        
        <div className="endpoint-card">
          <h4>Analyze Transcript</h4>
          <div className="endpoint-details">
            <div className="endpoint-url">
              <span className="method">POST</span>
              <span className="url">{baseApiUrl}/api/external/analyze</span>
            </div>
            
            <div className="endpoint-description">
              <p>Analyze a call transcript to get performance insights and scores. You can provide either a transcript directly or an audio URL for automatic transcription and analysis.</p>
            </div>
            
            <div className="endpoint-params">
              <h5>Request Parameters</h5>
              <table className="params-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Type</th>
                    <th>Required</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>transcript</td>
                    <td>string</td>
                    <td>Conditional*</td>
                    <td>The call transcript text to analyze. *Either transcript or audioUrl is required.</td>
                  </tr>
                  <tr>
                    <td>audioUrl</td>
                    <td>string</td>
                    <td>Conditional*</td>
                    <td>URL to an audio file to download, transcribe, and analyze. *Either transcript or audioUrl is required.</td>
                  </tr>
                  <tr>
                    <td>callType</td>
                    <td>string</td>
                    <td>No</td>
                    <td>The type of call (e.g., "hearing-aid-clinic", "flower-shop", or "auto" for automatic detection)</td>
                  </tr>
                  <tr>
                    <td>metadata</td>
                    <td>object</td>
                    <td>No</td>
                    <td>Additional metadata about the call (agentId, callId, timestamp, etc.)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="endpoint-card">
          <h4>NectarDesk Webhook</h4>
          <div className="endpoint-details">
            <div className="endpoint-url">
              <span className="method">POST</span>
              <span className="url">{baseApiUrl}/api/webhooks/nectar-desk/:organizationId</span>
            </div>
            
            <div className="endpoint-description">
              <p>Webhook endpoint that receives call data from NectarDesk and automatically processes the associated call recording. The URL path must include your organization ID to ensure calls are assigned to the correct organization.</p>
              <div className="info-note">
                <strong>Important:</strong> Each organization should use their own unique webhook URL with their organization ID in the path.
              </div>
              
              {currentOrganization && currentOrganization._id && (
                <div className="your-endpoint-section">
                  <h5>Your Webhook URL</h5>
                  <div className="integration-url with-copy">
                    {baseApiUrl}/api/webhooks/nectar-desk/{currentOrganization._id}
                    <button 
                      className="copy-inline-button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${baseApiUrl}/api/webhooks/nectar-desk/${currentOrganization._id}`);
                        toast.success('Webhook URL copied to clipboard!');
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                  </div>
                  
                  <div className="org-id-section">
                    <span>Your Organization ID: </span>
                    <code>{currentOrganization._id}</code>
                    <button 
                      className="copy-inline-button"
                      onClick={() => {
                        navigator.clipboard.writeText(currentOrganization._id);
                        toast.success('Organization ID copied to clipboard!');
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              
              {(!currentOrganization || !currentOrganization._id) && (
                <div className="your-endpoint-section error">
                  <h5>Your Organization ID</h5>
                  <p>To use the NectarDesk webhook, you'll need your organization ID.</p>
                  <p>Please contact support or check your account settings to obtain your organization ID.</p>
                  <p className="manual-instruction">Your webhook URL will be: <br />
                  <code>{baseApiUrl}/api/webhooks/nectar-desk/YOUR_ORGANIZATION_ID</code></p>
                </div>
              )}
            </div>
            
            <div className="endpoint-params">
              <h5>URL Parameters</h5>
              <table className="params-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Type</th>
                    <th>Required</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>organizationId</td>
                    <td>string</td>
                    <td>Yes</td>
                    <td>The ID of your organization in the Call Analyzer system</td>
                  </tr>
                </tbody>
              </table>
              
              <h5>Request Parameters</h5>
              <p>The webhook expects NectarDesk's standard call data format, including:</p>
              <table className="params-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Type</th>
                    <th>Required</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>id</td>
                    <td>number</td>
                    <td>Yes</td>
                    <td>The unique identifier for the call in NectarDesk</td>
                  </tr>
                  <tr>
                    <td>call_recordings</td>
                    <td>array</td>
                    <td>Yes</td>
                    <td>Array of recording URLs for the call</td>
                  </tr>
                  <tr>
                    <td>type</td>
                    <td>string</td>
                    <td>No</td>
                    <td>Call direction (inbound, outbound)</td>
                  </tr>
                  <tr>
                    <td>duration</td>
                    <td>number</td>
                    <td>No</td>
                    <td>Total call duration in seconds</td>
                  </tr>
                  <tr>
                    <td>contact</td>
                    <td>object</td>
                    <td>No</td>
                    <td>Contact information for the customer</td>
                  </tr>
                  <tr>
                    <td>agents</td>
                    <td>array</td>
                    <td>No</td>
                    <td>Information about agents who handled the call</td>
                  </tr>
                </tbody>
              </table>
              
              <h5>Webhook Setup in NectarDesk</h5>
              <ol className="setup-steps">
                <li>Navigate to the NectarDesk webhooks configuration page.</li>
                <li>Create a new webhook targeting: <div className="integration-url">{baseApiUrl}/api/webhooks/nectar-desk/{'{your-organization-id}'}</div></li>
                <li>Replace <code>{'{your-organization-id}'}</code> with your actual organization ID from Call Analyzer.</li>
                <li>Configure the webhook to trigger on call completion events.</li>
                <li>Ensure the call recordings are included in the payload.</li>
              </ol>
              
              <h5>Example Request Payload</h5>
              <div className="code-block-container">
                <pre className="code-block">
                  <code>{`{
  "id": 65123,
  "type": "outbound",
  "startedDate": "2025-04-15T18:41:22-04:00",
  "endedDate": "2025-04-15T18:41:40-04:00",
  "duration": 13,
  "talkTime": 13,
  "waitingTime": 5,
  "tags": [],
  "call_type": "answered",
  "call_recordings": [
    "nectarflowers.nectardesk.io/api/call/recording/52751"
  ],
  "number": {
    "id": 3,
    "number": "16138007406",
    "numberWithAlias": "16138007406 (RIDEAU FLORIST)",
    "alias": "RIDEAU FLORIST"
  },
  "contact": {
    "id": 113,
    "firstName": "John",
    "lastName": "Smith",
    "email": "john@example.com",
    "phone": "16135551234"
  },
  "agents": [
    {
      "id": 3,
      "name": "Customer Service",
      "action": "Normal clearing",
      "type": "Normal call"
    }
  ]
}`}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="api-advanced-section">
        <h3>Audio Transcription Details</h3>
        <div className="details-card">
          <h4>Supported Audio Formats</h4>
          <p>When using the <code>audioUrl</code> parameter, the system supports various audio formats including:</p>
          <ul>
            <li>MP3</li>
            <li>WAV</li>
            <li>M4A</li>
            <li>FLAC</li>
            <li>OGG</li>
            <li>WMA</li>
          </ul>
          <p>Files are automatically converted to an optimal format for transcription.</p>
          
          <h4>NectarDesk Integration</h4>
          <p>The API has special support for NectarDesk platform audio URLs in the format:</p>
          <pre className="integration-url">https://nectarflowers.nectardesk.io/api/call/recording/{'{recording_id}'}</pre>
          <p>When using NectarDesk URLs:</p>
          <ul>
            <li>The recordings are publicly accessible - no authentication is required</li>
            <li>The system adds appropriate headers to ensure cross-domain access</li>
            <li>Content-Type validation is relaxed to handle NectarDesk API responses</li>
          </ul>
          
          <h4>Audio Processing Limitations</h4>
          <ul>
            <li><strong>File Size:</strong> Maximum 25MB</li>
            <li><strong>Duration:</strong> Up to 2 hours of audio recommended</li>
            <li><strong>Audio Quality:</strong> Clear audio with minimal background noise yields the best results</li>
            <li><strong>URL Access:</strong> The audio URL must be publicly accessible or include authentication in the URL</li>
            <li><strong>Processing Time:</strong> Audio transcription adds 10-60 seconds to the processing time depending on file length</li>
          </ul>
          
          <div className="info-note">
            <strong>Note:</strong> For best results with audio files, ensure the recording has clear separation between speakers. The system will automatically detect and label speakers as "Agent" and "Customer" when possible.
          </div>
        </div>
      </div>
      
      <div className="api-examples-section">
        <h3>Code Examples</h3>
        
        <div className="examples-tabs">
          <button 
            className={`tab-button ${exampleTab === 'transcript' ? 'active' : ''}`}
            onClick={() => setExampleTab('transcript')}
          >
            Transcript Examples
          </button>
          <button 
            className={`tab-button ${exampleTab === 'audio' ? 'active' : ''}`}
            onClick={() => setExampleTab('audio')}
          >
            Audio URL Examples
          </button>
        </div>
        
        {exampleTab === 'transcript' ? (
          <>
            <div className="example-container">
              <h4>cURL Example with Transcript</h4>
              <div className="code-block-container">
                <pre className="code-block">
                  <code>{curlExample}</code>
                </pre>
                <button 
                  className="copy-code-button"
                  onClick={() => {
                    navigator.clipboard.writeText(curlExample);
                    handleCopy('curlCommand');
                  }}
                >
                  {copied.curlCommand ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            
            <div className="example-container">
              <h4>Node.js Example with Transcript</h4>
              <div className="code-block-container">
                <pre className="code-block">
                  <code>{nodeExample}</code>
                </pre>
                <button 
                  className="copy-code-button"
                  onClick={() => {
                    navigator.clipboard.writeText(nodeExample);
                    handleCopy('nodeCommand');
                  }}
                >
                  {copied.nodeCommand ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="example-container">
              <h4>cURL Example with Audio URL</h4>
              <div className="code-block-container">
                <pre className="code-block">
                  <code>{curlAudioExample}</code>
                </pre>
                <button 
                  className="copy-code-button"
                  onClick={() => {
                    navigator.clipboard.writeText(curlAudioExample);
                    handleCopy('curlAudioCommand');
                  }}
                >
                  {copied.curlAudioCommand ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            
            <div className="example-container">
              <h4>NectarDesk Audio URL Example</h4>
              <div className="code-block-container">
                <pre className="code-block">
                  <code>{curlNectarExample}</code>
                </pre>
                <button 
                  className="copy-code-button"
                  onClick={() => {
                    navigator.clipboard.writeText(curlNectarExample);
                    handleCopy('curlNectarCommand');
                  }}
                >
                  {copied.curlNectarCommand ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            
            <div className="example-container">
              <h4>Node.js Example with Audio URL</h4>
              <div className="code-block-container">
                <pre className="code-block">
                  <code>{nodeAudioExample}</code>
                </pre>
                <button 
                  className="copy-code-button"
                  onClick={() => {
                    navigator.clipboard.writeText(nodeAudioExample);
                    handleCopy('nodeAudioCommand');
                  }}
                >
                  {copied.nodeAudioCommand ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ApiPage;

// Add styles for API page components
const styles = `
  .api-page {
    padding: 20px;
    max-width: 1000px;
    margin: 0 auto;
  }
  
  .api-key-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    background-color: #f8f9fa;
    border-radius: 8px;
    padding: 16px;
    margin-top: 12px;
    border: 1px solid #e9ecef;
  }
  
  .api-key-display {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  
  .api-key-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 12px;
  }
  
  .copy-button,
  .generate-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 4px;
    border: none;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .copy-button {
    background-color: #e9ecef;
    color: #495057;
  }
  
  .copy-button:hover:not(:disabled) {
    background-color: #dde1e5;
  }
  
  .generate-button {
    background-color: #cfe2ff;
    color: #0a58ca;
  }
  
  .generate-button:hover:not(:disabled) {
    background-color: #b6d4fe;
  }
  
  .copy-button:disabled,
  .generate-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .generate-spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(0, 0, 0, 0.1);
    border-left-color: #0a58ca;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .success-message {
    background-color: #d1e7dd;
    color: #146c43;
    padding: 12px 16px;
    border-radius: 4px;
    margin-bottom: 16px;
    border: 1px solid #a3cfbb;
  }
  
  .examples-tabs {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }
  
  .examples-tabs .tab-button {
    padding: 8px 16px;
    background-color: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }
  
  .examples-tabs .tab-button.active {
    background-color: #0d6efd;
    color: white;
    border-color: #0d6efd;
  }
  
  .examples-tabs .tab-button:hover:not(.active) {
    background-color: #e0e0e0;
  }
  
  .details-card {
    background-color: #f8f9fa;
    border-radius: 8px;
    padding: 20px;
    margin-top: 15px;
    margin-bottom: 30px;
    border: 1px solid #e9ecef;
  }
  
  .details-card h4 {
    margin-top: 20px;
    margin-bottom: 10px;
    color: #495057;
  }
  
  .details-card h4:first-child {
    margin-top: 0;
  }
  
  .details-card ul {
    padding-left: 20px;
    margin-bottom: 15px;
  }
  
  .details-card li {
    margin-bottom: 5px;
  }
  
  .info-note {
    background-color: #f1f8ff;
    border-left: 4px solid #0366d6;
    padding: 12px 15px;
    margin: 15px 0;
    border-radius: 0 4px 4px 0;
    color: #24292e;
  }
  
  .integration-url {
    background-color: #f6f8fa;
    border: 1px solid #e1e4e8;
    border-radius: 4px;
    padding: 10px;
    margin: 10px 0;
    font-family: monospace;
    overflow-x: auto;
    font-size: 13px;
    color: #24292e;
  }
  
  .setup-steps {
    background-color: #f8f9fa;
    border-radius: 4px;
    padding: 15px 15px 15px 35px;
    margin: 15px 0;
    border-left: 4px solid #4a69bd;
  }
  
  .setup-steps li {
    margin-bottom: 8px;
    line-height: 1.5;
  }
  
  .setup-steps li:last-child {
    margin-bottom: 0;
  }
  
  .integration-url.with-copy {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .copy-inline-button {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: #0366d6;
    opacity: 0.7;
    transition: opacity 0.2s;
  }
  
  .copy-inline-button:hover {
    opacity: 1;
  }
  
  .your-endpoint-section {
    margin-top: 16px;
    padding: 12px;
    background-color: #f0f7ff;
    border-radius: 4px;
    border-left: 4px solid #2b88ff;
  }
  
  .your-endpoint-section h5 {
    margin-top: 0;
    margin-bottom: 8px;
    color: #2b88ff;
  }
  
  .your-endpoint-section.error {
    background-color: #fff8f8;
    border-left: 4px solid #e74c3c;
  }
  
  .your-endpoint-section.error h5 {
    color: #e74c3c;
  }
  
  .manual-instruction {
    margin-top: 12px;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 4px;
  }
  
  .manual-instruction code {
    display: block;
    margin-top: 8px;
    padding: 8px;
    background: #f1f1f1;
    border-radius: 4px;
    font-family: monospace;
    word-break: break-all;
  }
  
  .org-id-section {
    display: flex;
    align-items: center;
    margin-top: 12px;
    background: #f6f8fa;
    padding: 8px 12px;
    border-radius: 4px;
    border: 1px dashed #ccd1d5;
  }
  
  .org-id-section code {
    margin: 0 8px;
    padding: 3px 6px;
    background: #fff;
    border-radius: 4px;
    font-family: monospace;
    color: #0366d6;
    flex: 1;
  }
`;

// Inject styles into the document
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = styles;
  document.head.appendChild(styleEl);
} 