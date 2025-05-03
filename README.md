# AI Nectar Desk

An application for analyzing call center transcripts and providing performance insights. Supports both text transcript analysis and audio file transcription and analysis.

## Project Overview

AI Nectar Desk is a call analytics system designed for analyzing call center transcripts and providing performance insights for call center agents. The system uses AI to analyze conversations, extract key information, and provide actionable insights to improve call center performance.

### Key Features

- Text transcript analysis using Claude AI
- Audio upload and automatic transcription using Deepgram
- Direct audio recording in the browser
- Agent performance analytics dashboard
- Historical transcript records
- Custom call type template management
- Multi-organization support with data isolation

## Architecture

The project follows a modern full-stack architecture:

- **Frontend**: React-based single page application
- **Backend**: Node.js with Express RESTful API
- **Database**: MongoDB for document storage
- **AI Services**: 
  - Claude API for natural language processing and analysis
  - Deepgram API for audio transcription

## Project Structure

```
/
├── client/                  # React frontend application
│   ├── public/              # Static files
│   └── src/                 # React source code
│       ├── components/      # UI components
│       ├── pages/           # Page components
│       ├── services/        # API service calls
│       └── utils/           # Utility functions
│
├── server/                  # Node.js backend
│   ├── controllers/         # Request handlers
│   ├── middleware/          # Express middleware
│   ├── models/              # MongoDB schema definitions
│   ├── routes/              # API route definitions
│   ├── scripts/             # Utility scripts
│   ├── services/            # External service integrations
│   └── server.js            # Main server entry point
│
├── scripts/                 # General project scripts
│
└── docs/                    # Project documentation
```

## Deployment

The project uses a split deployment architecture:

### Frontend - Vercel
- React application is deployed to Vercel
- Configuration in vercel.json
- Static site hosting optimized for React SPA

### Backend - Render
- Node.js/Express API deployed to Render
- Can be deployed using Docker or build script
- Configuration in Dockerfile and render-build.sh

### Database - MongoDB Atlas
- Cloud-hosted MongoDB instance
- Connected via MONGODB_URI environment variable

### CI/CD Process
1. Push code to GitHub repository
2. Vercel automatically deploys frontend changes
3. Render automatically deploys backend changes
4. Environment variables managed in respective platforms

## Requirements

- Node.js 18 or higher
- MongoDB database
- Claude API key
- Deepgram API key
- FFmpeg (for audio processing)

## Environment Variables

### Server Required Variables
- `MONGODB_URI` - MongoDB connection string
- `CLAUDE_API_KEY` - Anthropic API key for Claude
- `DEEPGRAM_API_KEY` - Deepgram API key for audio transcription
- `JWT_SECRET` - Secret for JWT token generation/validation
- `EXTERNAL_API_KEY` - API key for external applications

### Optional Variables
- `PORT` - Server port (default: 3001)
- `EMAIL_USER` - Email for notifications (optional)
- `EMAIL_PASS` - Email password for notifications (optional)
- `EMAIL_FROM` - Email sender address
- `EMAIL_TO` - Email recipient address
- `SLACK_WEBHOOK_URL` - Slack webhook for notifications

### Client Variables
- `REACT_APP_API_URL` - URL for the backend API

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
   JWT_SECRET=your-jwt-secret
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
   - `JWT_SECRET`
   - `EXTERNAL_API_KEY`
4. Deploy

### Method 2: Using Render Build Script

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set Build Command to: `chmod +x ./server/render-build.sh && ./server/render-build.sh && cd server && npm install`
4. Set Start Command to: `cd server && node server.js`
5. Add required environment variables
6. Deploy

## Deploying to Vercel

1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect the frontend React app in the client directory
3. Set the output directory to "client/build"
4. Add any client-side environment variables
5. Deploy

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

## Troubleshooting

### Common Deployment Issues

1. **Environment Variables Missing**: Ensure all required environment variables are set in both Vercel and Render.
2. **FFmpeg Installation**: For audio processing, ensure FFmpeg is properly installed (handled by Dockerfile or render-build.sh).
3. **MongoDB Connection**: Verify your MongoDB Atlas connection string and network access settings.
4. **API Limits**: Check Claude and Deepgram usage limits and quotas if analysis fails.

### Render Deployment Troubleshooting

If deployment fails, check:

1. FFmpeg installation - ensure the build script is running correctly
2. Environment variables - make sure all required variables are set
3. Logs - check Render logs for specific error messages

## Documentation
- [Agent Analytics Module Fixes](docs/agent-analytics-fixes.md) - Documentation of fixes and functionality for the Agent Analytics module.
- [Agent Analytics Database Implementation](docs/agent-analytics-database-implementation.md) - Comprehensive documentation of the database schema, queries, and operations for the Agent Analytics module.

## License

MIT 