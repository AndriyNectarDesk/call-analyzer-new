import React, { useState, useEffect } from 'react';

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

  // Base URL for the API, defaulting to localhost in development
  const baseApiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  
  // Generate a fake API key for display (last 8 chars are real)
  const maskApiKey = (key) => {
    if (!key) return 'Not available';
    return `••••••••••••••••${key.slice(-8)}`;
  };

  // Check API key status from server
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        setIsLoading(true);
        
        // In a real app, we'd fetch the actual key from the server
        // For this demo, we'll just get it from .env file or use a dummy value
        const dummyKey = "sk_test_api_key_12345abcdef";
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setApiKey(dummyKey);
        setApiStatus('Valid');
      } catch (err) {
        console.error('Error fetching API key:', err);
        setError('Error loading API key information.');
        setApiStatus('Error');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkApiKey();
  }, [baseApiUrl]);

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
      
      <div className="api-info-section">
        <h3>Your API Key</h3>
        <div className="api-key-container">
          <div className="api-key-display">
            <span className="key-label">API Key:</span>
            <span className="key-value">{maskApiKey(apiKey)}</span>
            <span className={`api-status ${apiStatus.toLowerCase()}`}>{apiStatus}</span>
          </div>
          
          <button 
            className="copy-button"
            onClick={() => {
              navigator.clipboard.writeText(apiKey);
              handleCopy('apiKey');
            }}
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