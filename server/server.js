const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Deepgram } = require('@deepgram/sdk');
const ffmpeg = require('fluent-ffmpeg');

const mongoose = require('mongoose');
const Transcript = require(require('path').resolve(__dirname, 'models', 'transcript'));
const CallType = require(require('path').resolve(__dirname, 'models', 'callType'));
const app = express();
const PORT = process.env.PORT || 3001;

// API KEY for external applications
const API_KEY = process.env.EXTERNAL_API_KEY;

// Configure multer for file uploads
const uploadDir = path.join(__dirname, 'uploads');
// Ensure uploads directory exists
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Created uploads directory');
  } catch (err) {
    console.error('Error creating uploads directory:', err);
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept audio files only
  if (file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB file size limit
});

// Initialize Deepgram using the v3 SDK format
const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
const deepgram = new Deepgram({ apiKey: deepgramApiKey });

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

// Helper function to check API key status
const checkApiKeyStatus = async () => {
  try {
    // Make a minimal request to Claude API to verify key
    await axios.post(
      CLAUDE_API_URL,
      {
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'API key check' }],
        max_tokens: 1
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );
    console.log('Claude API key check successful');
    return true;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.error('URGENT: Claude API key validation failed on startup. The API key is invalid or expired.');
      // Send notification to the team
      sendNotification('API_KEY_ERROR', 'Claude API key validation failed on startup. The API key is invalid or expired.');
    } else {
      console.error('Claude API check error (not auth related):', error.message);
    }
    return false;
  }
};

// Notification helper (customize this for your preferred notification method)
const sendNotification = async (type, message) => {
  try {
    // Store the event in the database for tracking
    // This is optional but helpful for tracking issues
    console.log(`NOTIFICATION [${type}]: ${message}`);
    
    // Example: Email notification (commented out - implement with your preferred email service)
    /*
    if (process.env.NOTIFICATION_EMAIL) {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.NOTIFICATION_EMAIL,
        subject: `ALERT: Call Analyzer - ${type}`,
        text: message
      });
    }
    */
    
    // Example: Slack notification (commented out - implement with your preferred method)
    /*
    if (process.env.SLACK_WEBHOOK_URL) {
      await axios.post(process.env.SLACK_WEBHOOK_URL, {
        text: `*ALERT: Call Analyzer - ${type}*\n${message}`
      });
    }
    */
    
  } catch (notificationError) {
    console.error('Failed to send notification:', notificationError);
  }
};

// Add request ID middleware for better error tracking
app.use((req, res, next) => {
  req.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
  next();
});

// Call Types API routes
app.get('/api/call-types', async (req, res) => {
  try {
    const callTypes = await CallType.find({ active: true }).sort('name');
    res.json(callTypes);
  } catch (error) {
    console.error('Error fetching call types:', error);
    res.status(500).json({ error: 'Failed to fetch call types' });
  }
});

app.get('/api/call-types/:id', async (req, res) => {
  try {
    const callType = await CallType.findById(req.params.id);
    if (!callType) {
      return res.status(404).json({ error: 'Call type not found' });
    }
    res.json(callType);
  } catch (error) {
    console.error('Error fetching call type:', error);
    res.status(500).json({ error: 'Failed to fetch call type' });
  }
});

app.post('/api/call-types', validateApiKey, async (req, res) => {
  try {
    const { code, name, description, promptTemplate, jsonStructure } = req.body;
    
    // Check if call type with this code already exists
    const existing = await CallType.findOne({ code: code.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'A call type with this code already exists' });
    }
    
    const newCallType = new CallType({
      code,
      name,
      description,
      promptTemplate,
      jsonStructure
    });
    
    await newCallType.save();
    res.status(201).json(newCallType);
  } catch (error) {
    console.error('Error creating call type:', error);
    res.status(500).json({ error: 'Failed to create call type' });
  }
});

app.put('/api/call-types/:id', validateApiKey, async (req, res) => {
  try {
    const { name, description, promptTemplate, jsonStructure, active } = req.body;
    
    const callType = await CallType.findById(req.params.id);
    if (!callType) {
      return res.status(404).json({ error: 'Call type not found' });
    }
    
    // Update fields
    if (name) callType.name = name;
    if (description !== undefined) callType.description = description;
    if (promptTemplate) callType.promptTemplate = promptTemplate;
    if (jsonStructure) callType.jsonStructure = jsonStructure;
    if (active !== undefined) callType.active = active;
    
    await callType.save();
    res.json(callType);
  } catch (error) {
    console.error('Error updating call type:', error);
    res.status(500).json({ error: 'Failed to update call type' });
  }
});

app.delete('/api/call-types/:id', validateApiKey, async (req, res) => {
  try {
    const callType = await CallType.findById(req.params.id);
    if (!callType) {
      return res.status(404).json({ error: 'Call type not found' });
    }
    
    // Soft delete - just mark as inactive
    callType.active = false;
    await callType.save();
    
    res.json({ message: 'Call type deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating call type:', error);
    res.status(500).json({ error: 'Failed to deactivate call type' });
  }
});

// Modify createPrompt function to use dynamic call types
const createPrompt = async (transcript, type = 'auto') => {
  // Detect call type if not specified
  let callType = type;
  if (type === 'auto') {
    // Simple detection based on keywords
    if (transcript.toLowerCase().includes('hearing aid') || 
        transcript.toLowerCase().includes('beltone') || 
        transcript.toLowerCase().includes('audiologist') ||
        transcript.toLowerCase().includes('hearing test')) {
      callType = 'hearing';
    } else {
      callType = 'flower';
    }
  }
  
  // Base prompt structure with shared elements
  const basePrompt = `I need you to analyze this call center transcript. Please provide:

1. A concise summary of the call (customer details, key information, special requests)
2. Agent performance analysis (what they did well, what could be improved)
3. Specific suggestions for improving customer service
4. A scorecard rating these areas on a scale of 1-10:
   - Customer Service
   - Product Knowledge
   - Process Efficiency
   - Problem Solving
   - Overall Score

Format your response as JSON with the following structure:`;

  // Try to find a custom call type
  try {
    const customCallType = await CallType.findOne({ code: callType, active: true });
    if (customCallType) {
      return `${basePrompt}
${customCallType.promptTemplate}

${customCallType.jsonStructure.instructions || `This is a call center transcript from ${customCallType.name}. Be sure to identify the agent's name at the beginning of the call.`}

Here's the transcript:

${transcript}`;
    }
  } catch (error) {
    console.error('Error fetching custom call type:', error);
    // Continue with default templates if there's an error
  }

  // Call type specific JSON structure and instructions (default templates)
  if (callType === 'hearing') {
    return `${basePrompt}
{
  "callSummary": {
    "agentName": "",
    "patientName": "",
    "appointmentType": "",
    "appointmentDetails": "",
    "hearingAidInfo": "",
    "specialConsiderations": ""
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

This is a call center transcript from a hearing aid clinic. Be sure to identify the agent's name at the beginning of the call. Focus on patient information, appointment scheduling, hearing concerns, and hearing aid details in your analysis.

Here's the transcript:

${transcript}`;
  } else {
    // Default to flower shop
    return `${basePrompt}
{
  "callSummary": {
    "agentName": "",
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

This is a call center transcript from a flower shop. Be sure to identify the agent's name at the beginning of the call. Focus on order details, delivery information, and flower preferences in your analysis.

Here's the transcript:

${transcript}`;
  }
};

// Define error handling middleware for API issues
const handleApiError = (error, req, res, next) => {
  // Check if it's an authentication error with Claude API
  if (error.response && error.response.status === 401) {
    console.error('URGENT: Claude API key authentication failed. API key may be expired or invalid.');
    // Send notification to the team
    sendNotification('API_KEY_ERROR', 'Claude API key authentication failed. API key may be expired or invalid.');
    
    // Return a user-friendly error
    return res.status(503).json({ 
      error: 'Service temporarily unavailable',
      details: 'We are experiencing issues with our AI service. Our team has been notified.',
      requestId: req.id // Optional: Add a unique ID for tracking this error
    });
  }
  
  // Handle other types of errors
  console.error('API Error:', error.message, error.stack);
  res.status(500).json({ 
    error: 'Failed to analyze transcript',
    details: error.message
  });
};

// Update the API routes to use the async version of createPrompt
app.post('/api/analyze', async (req, res, next) => {
  try {
    const { transcript, callType } = req.body;
    
    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' });
    }
    
    // Call Claude API with the async createPrompt
    const prompt = await createPrompt(transcript, callType);
    
    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: 'claude-3-opus-20240229',
        messages: [
          {
            role: 'user',
            content: prompt
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
      source: 'web',
      callType: callType || 'auto'
    });

    await newTranscript.save();

    return res.json(analysisData);
    
  } catch (error) {
    next(error); // Pass to the error handling middleware
  }
});

// Update external API route to use async createPrompt
app.post('/api/external/analyze', validateApiKey, async (req, res, next) => {
  try {
    const { transcript, metadata, callType } = req.body;
    
    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' });
    }
    
    // Call Claude API with the async createPrompt
    const prompt = await createPrompt(transcript, callType);
    
    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: 'claude-3-opus-20240229',
        messages: [
          {
            role: 'user',
            content: prompt
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
      metadata: metadata || {},
      callType: callType || 'auto'
    });

    await newTranscript.save();

    return res.json({
      analysisId: newTranscript._id,
      analysis: analysisData
    });
    
  } catch (error) {
    next(error); // Pass to the error handling middleware
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

// Admin route to check API key status (protected with your external API key)
app.get('/api/admin/check-api-keys', validateApiKey, async (req, res) => {
  try {
    const isClaudeKeyValid = await checkApiKeyStatus();
    res.json({
      claudeApiKey: isClaudeKeyValid ? 'valid' : 'invalid',
      externalApiKey: 'valid' // If this endpoint is accessible, external API key is valid
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check API keys', details: error.message });
  }
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Audio upload and transcription endpoint
app.post('/api/transcribe', upload.single('audioFile'), async (req, res, next) => {
  let filePath = null;
  let outputPath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    filePath = req.file.path;
    const callType = req.body.callType || 'auto';

    // Check if we need to convert the file (Deepgram works best with WAV/MP3)
    outputPath = filePath + '.mp3';
    
    // Create FFmpeg command
    console.log('Starting FFmpeg conversion...');
    
    // Convert to MP3 for consistent handling
    await new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .output(outputPath)
        .on('start', (cmd) => {
          console.log('FFmpeg conversion started:', cmd);
        })
        .on('end', () => {
          console.log('FFmpeg conversion completed');
          resolve();
        })
        .on('error', (err) => {
          console.error('Error converting audio with FFmpeg:', err);
          reject(err);
        })
        .run();
    });

    // Check if the output file exists
    if (!fs.existsSync(outputPath)) {
      throw new Error('FFmpeg conversion failed - output file not created');
    }
    
    console.log('Reading converted file...');
    // Read the converted file
    const audioBuffer = fs.readFileSync(outputPath);
    
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Converted audio file is empty');
    }
    
    console.log('Sending to Deepgram...');
    // Send to Deepgram for transcription using v3 format
    const response = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        mimetype: 'audio/mp3',
        smart_format: true,
        punctuate: true,
        utterances: true,
        diarize: true,
        model: 'nova-2',
        language: 'en'
      }
    );

    // Extract transcript from Deepgram response - v3 format
    const transcript = response.results?.channels[0]?.alternatives[0]?.transcript;
    
    if (!transcript) {
      return res.status(400).json({ error: 'Failed to transcribe audio or audio contained no speech' });
    }

    // Clean up files after transcription
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    } catch (err) {
      console.error('Error cleaning up files:', err);
      // Continue processing even if cleanup fails
    }
    
    // Process the transcript through our analysis pipeline
    const prompt = await createPrompt(transcript, callType);
    
    const claudeResponse = await axios.post(
      CLAUDE_API_URL,
      {
        model: 'claude-3-opus-20240229',
        messages: [
          {
            role: 'user',
            content: prompt
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
    const assistantMessage = claudeResponse.data.content[0].text;
    
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
      source: 'audio',
      callType: callType || 'auto'
    });

    await newTranscript.save();

    // Return both transcript and analysis
    return res.json({
      transcript: transcript,
      analysis: analysisData
    });
    
  } catch (error) {
    console.error('Transcription error:', error);
    // Clean up file if it exists and an error occurred
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Check for MP3 converted file
      if (outputPath && fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    } catch (cleanupErr) {
      console.error('Error during file cleanup:', cleanupErr);
    }
    
    if (error.message && error.message.includes('Deepgram')) {
      return res.status(500).json({ error: 'Speech-to-text service error', details: error.message });
    }
    
    next(error);
  }
});

// Register the error handling middleware
app.use(handleApiError);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Initial API key check
  checkApiKeyStatus().then(isValid => {
    if (!isValid) {
      console.warn('Server starting with invalid Claude API key. Transcript analysis will not work.');
    }
  });
  
  // Set up periodic API key check (every 6 hours)
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  setInterval(async () => {
    console.log('Performing scheduled Claude API key health check');
    const isValid = await checkApiKeyStatus();
    if (!isValid) {
      sendNotification(
        'SCHEDULED_KEY_CHECK_FAILED', 
        'Scheduled Claude API key check failed. The key may be expired or invalid.'
      );
    }
  }, SIX_HOURS);
});