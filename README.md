# Call Center Transcript Analyzer

A web application for analyzing call center transcripts using Claude AI to provide insights, recommendations, and performance scoring.

## Features

- Upload and analyze call center transcripts
- Get detailed analysis of customer interactions
- View agent performance metrics and improvement suggestions
- Access historical transcript analyses
- Submit transcripts via API for external integrations

## API Documentation

### External API Integration

The application provides an API endpoint for external applications to submit call transcripts for analysis.

#### Authentication

All API requests require an API key that should be included in the request headers:

```
x-api-key: YOUR_API_KEY
```

The API key can be configured in the server's environment variables as `EXTERNAL_API_KEY`.

#### Endpoints

##### POST /api/external/analyze

Analyze a call transcript and store the results.

**Request Body:**

```json
{
  "transcript": "string", // Required: The call transcript text
  "metadata": {           // Optional: Additional information about the call
    "agentId": "string",
    "callId": "string",
    "callDuration": "number",
    "callDate": "string",
    "department": "string",
    // Any other custom fields
  }
}
```

**Response:**

```json
{
  "analysisId": "string", // MongoDB ID of the saved transcript
  "analysis": {
    "callSummary": {
      "customerName": "string",
      "orderType": "string",
      "deliveryAddress": "string",
      "totalValue": "string",
      "specialInstructions": "string"
    },
    "agentPerformance": {
      "strengths": ["string"],
      "areasForImprovement": ["string"]
    },
    "improvementSuggestions": ["string"],
    "scorecard": {
      "customerService": "number",
      "productKnowledge": "number",
      "processEfficiency": "number",
      "problemSolving": "number",
      "overallScore": "number"
    }
  }
}
```

#### Example Usage with cURL

```bash
curl -X POST https://your-api-url/api/external/analyze \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "transcript": "Agent: Thank you for calling Flower Shop, how can I help you today?\nCustomer: I'd like to order flowers for my wife's birthday...",
    "metadata": {
      "agentId": "A12345",
      "callDuration": 350,
      "department": "Sales"
    }
  }'
```

#### Example Usage with JavaScript/Node.js

```javascript
const axios = require('axios');

async function analyzeTranscript() {
  try {
    const response = await axios.post(
      'https://your-api-url/api/external/analyze',
      {
        transcript: "Agent: Thank you for calling Flower Shop, how can I help you today?\nCustomer: I'd like to order flowers for my wife's birthday...",
        metadata: {
          agentId: "A12345",
          callDuration: 350,
          department: "Sales"
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'YOUR_API_KEY'
        }
      }
    );
    
    console.log(response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

analyzeTranscript();
```

## Environment Variables

### Server

- `PORT` - Server port (default: 3001)
- `MONGODB_URI` - MongoDB connection string
- `CLAUDE_API_KEY` - Anthropic API key for Claude
- `EXTERNAL_API_KEY` - API key for external applications

### Client

- `REACT_APP_API_URL` - URL for the backend API

## Deployment

- Frontend: Deployed with Vercel
- Backend: Deployed with Render 