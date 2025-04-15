import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ApiPage() {
  const [apiKey, setApiKey] = useState('');
  const [apiStatus, setApiStatus] = useState('Loading...');
  const [copied, setCopied] = useState({
    apiKey: false,
    curlCommand: false,
    nodeCommand: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
        setError('Authentication token not found. Please log in again.');
        setApiStatus('Error');
        setIsLoading(false);
        return;
      }
      
      // Fetch the API key from the server
      const response = await axios.get(`${baseApiUrl}/api/organization/api-key`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.key) {
        setApiKey(response.data.key);
        setApiStatus('Valid');
      } else {
        setApiKey('');
        setApiStatus('Not Found');
      }
    } catch (err) {
      console.error('Error fetching API key:', err);
      setError('Error loading API key information.');
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
      
      // Call the API to generate a new API key
      const response = await axios.post(`${baseApiUrl}/api/organization/api-key`, {
        name: `API Key - ${new Date().toLocaleDateString()}`
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
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
        setError('Failed to generate API key. Please try again.');
      }
    } catch (err) {
      console.error('Error generating API key:', err);
      
      let errorMessage = 'Failed to generate API key. ';
      if (err.response) {
        errorMessage += err.response.data?.message || JSON.stringify(err.response.data);
      } else if (err.request) {
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
              <p>Analyze a call transcript to get performance insights and scores.</p>
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
                    <td>Yes</td>
                    <td>The call transcript text to analyze</td>
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
      </div>
      
      <div className="api-examples-section">
        <h3>Code Examples</h3>
        
        <div className="example-container">
          <h4>cURL Example</h4>
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
          <h4>Node.js Example</h4>
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
`;

// Inject styles into the document
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = styles;
  document.head.appendChild(styleEl);
} 