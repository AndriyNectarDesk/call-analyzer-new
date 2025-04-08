const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const mongoose = require('mongoose');
const Transcript = require(require('path').resolve(__dirname, 'models', 'transcript'));
const app = express();
const PORT = process.env.PORT || 3001;

// API KEY for external applications
const API_KEY = process.env.EXTERNAL_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());

// API Key validation middleware
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized - Invalid API Key' });
  }
  
  next();
};

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Connection Error:', err));

// Claude API Configuration
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// Define the prompt template for Claude
const createPrompt = (transcript) => {
  return `I need you to analyze this call center transcript from our flower shop. Please provide:

1. A concise summary of the call (customer details, order information, special requests)
2. Agent performance analysis (what they did well, what could be improved)
3. Specific suggestions for improving customer service
4. A scorecard rating these areas on a scale of 1-10:
   - Customer Service
   - Product Knowledge
   - Process Efficiency
   - Problem Solving
   - Overall Score

Format your response as JSON with the following structure:
{
  "callSummary": {
    "customerName": "",
    "orderType": "",
    "deliveryAddress": "",
    "totalValue": "",
    "specialInstructions": ""
  },
  "agentPerformance": {
    "strengths": ["", "", ""],
    "areasForImprovement": ["", "", ""]
  },
  "improvementSuggestions": ["", "", ""],
  "scorecard": {
    "customerService": 0,
    "productKnowledge": 0,
    "processEfficiency": 0,
    "problemSolving": 0,
    "overallScore": 0
  }
}

Here's the transcript:

${transcript}`;
};

// API route to analyze transcript
app.post('/api/analyze', async (req, res) => {
  try {
    const { transcript } = req.body;
    
    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' });
    }
    
    // Call Claude API
    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: 'claude-3-opus-20240229',
        messages: [
          {
            role: 'user',
            content: createPrompt(transcript)
          }
        ],
        max_tokens: 4000,
        temperature: 0.0
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );
    
    // Extract and parse the JSON response from Claude
    const assistantMessage = response.data.content[0].text;
    
    // Find JSON in the response
    const jsonMatch = assistantMessage.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Failed to parse Claude response' });
    }
    
    const analysisData = JSON.parse(jsonMatch[0]);

    // Save transcript and analysis to database
    const newTranscript = new Transcript({
      rawTranscript: transcript,
      analysis: analysisData,
      source: 'web'
    });

    await newTranscript.save();

    return res.json(analysisData);
    
  } catch (error) {
    console.error('Error analyzing transcript:', error);
    
    // Handle Claude API specific errors
    if (error.response && error.response.data) {
      console.error('Claude API Error:', error.response.data);
    }
    
    return res.status(500).json({ 
      error: 'Failed to analyze transcript',
      details: error.message
    });
  }
});

// Route for external API to submit transcripts
app.post('/api/external/analyze', validateApiKey, async (req, res) => {
  try {
    const { transcript, metadata } = req.body;
    
    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' });
    }
    
    // Call Claude API
    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: 'claude-3-opus-20240229',
        messages: [
          {
            role: 'user',
            content: createPrompt(transcript)
          }
        ],
        max_tokens: 4000,
        temperature: 0.0
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );
    
    // Extract and parse the JSON response from Claude
    const assistantMessage = response.data.content[0].text;
    
    // Find JSON in the response
    const jsonMatch = assistantMessage.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Failed to parse Claude response' });
    }
    
    const analysisData = JSON.parse(jsonMatch[0]);

    // Save transcript and analysis to database with source flag
    const newTranscript = new Transcript({
      rawTranscript: transcript,
      analysis: analysisData,
      source: 'api',
      metadata: metadata || {}
    });

    await newTranscript.save();

    return res.json({
      analysisId: newTranscript._id,
      analysis: analysisData
    });
    
  } catch (error) {
    console.error('Error analyzing transcript:', error);
    
    // Handle Claude API specific errors
    if (error.response && error.response.data) {
      console.error('Claude API Error:', error.response.data);
    }
    
    return res.status(500).json({ 
      error: 'Failed to analyze transcript',
      details: error.message
    });
  }
});

// Route to get transcript history
app.get('/api/transcripts', async (req, res) => {
  try {
    const transcripts = await Transcript.find().sort({ createdAt: -1 });
    res.json(transcripts);
  } catch (error) {
    console.error('Error fetching transcripts:', error);
    res.status(500).json({ error: 'Failed to fetch transcripts' });
  }
});

// Route to get a single transcript by ID
app.get('/api/transcripts/:id', async (req, res) => {
  try {
    const transcript = await Transcript.findById(req.params.id);
    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }
    res.json(transcript);
  } catch (error) {
    console.error('Error fetching transcript:', error);
    res.status(500).json({ error: 'Failed to fetch transcript' });
  }
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});