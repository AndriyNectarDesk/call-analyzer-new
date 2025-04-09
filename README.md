# AI Nectar Desk

An application for analyzing call center transcripts and providing performance insights. Supports both text transcript analysis and audio file transcription and analysis.

## Features

- Text transcript analysis using Claude AI
- Audio upload and automatic transcription using Deepgram
- Direct audio recording in the browser
- Agent performance analytics dashboard
- Historical transcript records
- Custom call type template management

## Requirements

- Node.js 18 or higher
- MongoDB database
- Claude API key
- Deepgram API key
- FFmpeg (for audio processing)

## Local Development

1. Clone the repository
2. Install dependencies:
   ```
   cd server && npm install
   cd ../client && npm install
   ```
3. Set up environment variables by creating a `.env` file in the server directory with:
   ```
   PORT=3001
   CLAUDE_API_KEY=your-claude-api-key
   MONGODB_URI=your-mongodb-connection-string
   DEEPGRAM_API_KEY=your-deepgram-api-key
   ```
4. Start the server and client:
   ```
   # Terminal 1
   cd server && npm start
   
   # Terminal 2
   cd client && npm start
   ```

## Deploying to Render

### Method 1: Docker Deployment (Recommended)

1. Connect your GitHub repository to Render
2. Create a new Web Service using Docker
3. Set these environment variables:
   - `CLAUDE_API_KEY`
   - `MONGODB_URI`
   - `DEEPGRAM_API_KEY`
4. Deploy

### Method 2: Using Render Build Script

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set Build Command to: `chmod +x ./server/render-build.sh && ./server/render-build.sh && cd server && npm install`
4. Set Start Command to: `cd server && node server.js`
5. Add these environment variables:
   - `CLAUDE_API_KEY`
   - `MONGODB_URI`
   - `DEEPGRAM_API_KEY`
6. Deploy

### Troubleshooting Render Deployment

If deployment fails, check:

1. FFmpeg installation - ensure the build script is running correctly
2. Environment variables - make sure all required variables are set
3. Logs - check Render logs for specific error messages

## License

MIT

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

### Deepgram

- `DEEPGRAM_API_KEY` - Deepgram API key for audio transcription 