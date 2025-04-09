const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const os = require('os');

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

// Get Deepgram API key
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

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
    if (process.env.NOTIFICATION_EMAIL) {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'alerts@example.com',
        to: process.env.EMAIL_TO || 'admin@example.com',
        subject: `ALERT: AI Nectar Desk - ${type}`,
        text: message
      };
      
      await transporter.sendMail(mailOptions);
    }
    
    // Example: Slack notification (commented out - implement with your preferred method)
    if (process.env.SLACK_WEBHOOK_URL) {
      await axios.post(process.env.SLACK_WEBHOOK_URL, {
        text: `*ALERT: AI Nectar Desk - ${type}*\n${message}`
      });
    }
    
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

Format your response as valid JSON with the following structure. DO NOT include any text outside the JSON object - just return a single properly formatted JSON object:`;

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

This is a call center transcript from a hearing aid clinic. Be sure to identify the agent's name at the beginning of the call and include it in the agentName field. Focus on patient information, appointment scheduling, hearing concerns, and hearing aid details in your analysis.

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

This is a call center transcript from a flower shop. Be sure to identify the agent's name at the beginning of the call and include it in the agentName field. Focus on order details, delivery information, and flower preferences in your analysis.

Here's the transcript:

${transcript}`;
  }
};

// Error handling middleware
function handleApiError(err, req, res, next) {
  console.error('API Error:', err);
  
  // Check for Claude API authentication errors
  if (err.response && err.response.status === 401 && err.config && 
      (err.config.url.includes('anthropic.com') || err.config.url.includes('claude'))) {
    return res.status(401).json({
      error: 'Claude API Authentication Error',
      message: 'Failed to authenticate with Claude API. Please check your API key.',
      details: err.message
    });
  }
  
  // Check for rate limiting errors
  if (err.response && err.response.status === 429) {
    return res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'Too many requests. Please try again later.',
      details: err.message
    });
  }
  
  // Check for timeout errors
  if (err.code === 'ECONNABORTED' || (err.message && err.message.includes('timeout'))) {
    return res.status(504).json({
      error: 'Request Timeout',
      message: 'The request to the external API timed out. Please try again.',
      details: err.message
    });
  }
  
  // Default error response
  res.status(500).json({
    error: 'Server Error',
    message: 'An unexpected error occurred.',
    details: err.message || 'No additional details available'
  });
}

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
    const jsonMatch = assistantMessage.match(/\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\}))*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Failed to parse Claude response' });
    }
    
    // Parse the JSON using our sanitizer
    try {
      const analysisData = sanitizeJson(jsonMatch[0]);

// Save transcript and analysis to database
const newTranscript = new Transcript({
  rawTranscript: transcript,
        analysis: analysisData,
        source: 'web',
        callType: callType || 'auto'
});

await newTranscript.save();

      return res.json({
        success: true,
        transcript: transcript,
        analysis: analysisData,
        id: newTranscript._id
      });
    } catch (jsonError) {
      console.error('Error parsing JSON from Claude response:', jsonError);
      console.error('Raw match content:', jsonMatch[0]);
      return res.status(500).json({
        error: 'Failed to parse Claude JSON response',
        details: jsonError.message,
        transcript: transcript
      });
    }
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
    console.log('Claude API response received, extracting content...');
    const assistantMessage = response.data.content[0].text;
    
    // Log the full Claude response text
    console.log('Raw Claude response:', assistantMessage.substring(0, 500) + '...(truncated)');
    
    console.log('Looking for JSON in Claude response...');
    // Find JSON in the response
    const jsonMatch = assistantMessage.match(/\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\}))*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in Claude response. Raw response:', assistantMessage);
      return res.status(500).json({ 
        error: 'Failed to parse Claude response',
        details: 'Claude response did not contain valid JSON',
        transcript: transcript
      });
    }
    
    console.log('Found JSON match:', jsonMatch[0].substring(0, 500) + '...(truncated)');
    console.log('Parsing JSON from Claude response...');
    try {
      const analysisData = sanitizeJson(jsonMatch[0]);
      
      // Verify analysis object has required structure
      console.log('Checking analysis data structure...');
      if (!analysisData.callSummary) {
        console.error('Missing callSummary in analysis data');
      }
      if (!analysisData.agentPerformance) {
        console.error('Missing agentPerformance in analysis data');
      }
      if (!analysisData.improvementSuggestions) {
        console.error('Missing improvementSuggestions in analysis data');
      }
      if (!analysisData.scorecard) {
        console.error('Missing scorecard in analysis data');
      }
      
      console.log('Saving transcript to MongoDB...');
      // Save transcript and analysis to database
      const newTranscript = new Transcript({
        rawTranscript: transcript,
        analysis: analysisData,
        source: 'api',
        metadata: metadata || {},
        callType: callType || 'auto'
      });

      await newTranscript.save();
      console.log('Transcript saved successfully, returning response...');

      // Return both transcript and analysis
      return res.json({
        success: true,
        transcript: transcript,
        analysis: analysisData,
        id: newTranscript._id
      });
    } catch (jsonError) {
      console.error('Error parsing JSON from Claude response:', jsonError);
      console.error('Raw match content:', jsonMatch[0]);
    return res.status(500).json({ 
        error: 'Failed to parse Claude JSON response',
        details: jsonError.message,
        transcript: transcript
    });
    }
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
  let tempDir = null;
  
  try {
    const callType = req.body.callType || 'auto';
    let audioBuffer = null;
    
    // Handle audio URL if provided instead of file upload
    if (req.body.audioUrl) {
      console.log(`Processing audio from URL: ${req.body.audioUrl}`);
      
      try {
        // Create a temporary directory for downloaded files
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-'));
        filePath = path.join(tempDir, 'downloaded-audio');
        
        // Download the file from the URL
        console.log('Downloading audio file...');
        const response = await axios({
          method: 'GET',
          url: req.body.audioUrl,
          responseType: 'arraybuffer',
          timeout: 30000, // 30 second timeout
          headers: {
            'User-Agent': 'Call-Analyzer/1.0'
          }
        });
        
        // Check content type to ensure it's an audio file
        const contentType = response.headers['content-type'];
        if (!contentType || !contentType.includes('audio/')) {
          throw new Error(`URL does not point to an audio file (content-type: ${contentType})`);
        }
        
        // Write the downloaded file to disk
        fs.writeFileSync(filePath, Buffer.from(response.data));
        console.log(`Downloaded audio file to ${filePath}`);
        
      } catch (downloadErr) {
        console.error('Error downloading audio from URL:', downloadErr);
        return res.status(400).json({ 
          error: 'Failed to download audio from URL',
          details: downloadErr.message
        });
      }
    } else if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided or URL specified' });
    } else {
      filePath = req.file.path;
    }

    console.log(`Processing audio file: ${filePath}, call type: ${callType}`);

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
    audioBuffer = fs.readFileSync(outputPath);
    
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Converted audio file is empty');
    }
    
    console.log('Sending to Deepgram...');
    
    // Check if Deepgram API key is valid
    if (!DEEPGRAM_API_KEY || DEEPGRAM_API_KEY === 'your-valid-deepgram-api-key') {
      return res.status(500).json({ 
        error: 'Deepgram API key not configured', 
        details: 'Please add a valid Deepgram API key to your .env file or Render environment variables.'
      });
    }

    // Use direct API call with axios instead of SDK
    const deepgramResponse = await axios.post(
      'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&diarize=true&utterances=true&language=en',
      audioBuffer,
      {
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'audio/mp3'
        }
      }
    );
    
    // Extract transcript from Deepgram response
    const transcript = deepgramResponse.data.results?.channels[0]?.alternatives[0]?.transcript;
    
    if (!transcript) {
      return res.status(400).json({ error: 'Failed to transcribe audio or audio contained no speech' });
    }

    console.log(`Transcription successful: ${transcript.substring(0, 100)}...`);

    // Clean up files after transcription
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      // Clean up temp directory if it was created
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmdirSync(tempDir, { recursive: true });
      }
    } catch (err) {
      console.error('Error cleaning up files:', err);
      // Continue processing even if cleanup fails
    }
    
    // If no transcript analysis is needed, we can return early
    if (req.query.transcriptOnly === 'true') {
      return res.json({
        success: true,
        transcript: transcript,
      });
    }
    
    // For audio uploads, just use the same analyze endpoint logic directly 
    // instead of trying to mock express requests
    try {
      // Create the prompt using the existing function
      console.log('Creating prompt for text analysis...');
      const prompt = await createPrompt(transcript, callType);
      
      // Check if Claude API key is valid
      if (!CLAUDE_API_KEY || CLAUDE_API_KEY === 'your-valid-claude-api-key') {
        console.error('Claude API key not configured or invalid');
        return res.status(206).json({ 
          success: true,
          transcript: transcript,
          error: 'Claude API key not configured', 
          details: 'Please add a valid Claude API key to your .env file or environment variables.'
        });
      }

      // Instead of using the analyze endpoint, use the direct Claude API call
      console.log('Sending transcript to Claude API for direct analysis...');
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
      
      // Extract the response content
      const assistantMessage = claudeResponse.data.content[0].text;
      
      // Get the raw response for debugging
      console.log('Claude raw response for audio analysis:', assistantMessage.substring(0, 200) + '...');
      
      // Extract just the JSON part
      console.log('Extracting JSON from response...');
      // Instead of using regex, let's try a more reliable approach
      let jsonData = null;
      let jsonStart = assistantMessage.indexOf('{');
      let jsonEnd = assistantMessage.lastIndexOf('}');
      
      if (jsonStart >= 0 && jsonEnd >= 0 && jsonEnd > jsonStart) {
        const jsonStr = assistantMessage.substring(jsonStart, jsonEnd + 1);
        console.log('Extracted JSON string:', jsonStr.substring(0, 100) + '...');
        
        try {
          jsonData = JSON.parse(jsonStr);
          console.log('Successfully parsed JSON directly');
        } catch (parseError) {
          console.error('Initial JSON parse failed:', parseError.message);
          
          try {
            // Fallback to sanitized parsing
            jsonData = sanitizeJson(jsonStr);
            console.log('Successfully parsed JSON after sanitization');
          } catch (sanitizeError) {
            console.error('Sanitized JSON parsing failed:', sanitizeError.message);
            throw new Error('Failed to parse Claude response as JSON: ' + sanitizeError.message);
          }
        }
      } else {
        console.error('Could not find JSON markers in Claude response');
        throw new Error('Claude response did not contain valid JSON format');
      }
      
      // Check if we have valid data
      if (!jsonData) {
        throw new Error('Failed to extract valid JSON from Claude response');
      }
      
      // Save transcript and analysis to database (same as analyze endpoint)
      console.log('Saving audio transcript to database...');
      const newTranscript = new Transcript({
        rawTranscript: transcript,
        analysis: jsonData,
        source: 'audio',
        callType: callType || 'auto'
      });

      await newTranscript.save();
      
      // Return success response
      return res.json({
        success: true,
        transcript: transcript,
        analysis: jsonData,
        id: newTranscript._id
      });
    } catch (analyzeError) {
      console.error('Error during audio transcript analysis:', analyzeError);
      console.error('Error stack:', analyzeError.stack);
      
      // Return partial success
      return res.status(206).json({
        success: true,
        transcript: transcript,
        error: 'Error analyzing transcript',
        details: analyzeError.message || 'An unexpected error occurred during analysis'
      });
    }
  } catch (error) {
    console.error('Transcription error:', error);
    console.error(error.stack);
    
    // Clean up file if it exists and an error occurred
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Check for MP3 converted file
      if (outputPath && fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      
      // Clean up temp directory if it was created
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmdirSync(tempDir, { recursive: true });
      }
    } catch (cleanupErr) {
      console.error('Error during file cleanup:', cleanupErr);
    }
    
    if (error.message && error.message.includes('Deepgram')) {
      return res.status(500).json({ error: 'Error processing audio: Speech-to-text service error', details: error.message });
    }
    
    return res.status(500).json({ 
      error: 'Error processing audio',
      details: error.message || 'An unexpected error occurred during audio processing'
    });
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

// Helper to sanitize and fix common JSON parsing issues
const sanitizeJson = (jsonString) => {
  try {
    // First attempt to parse the JSON directly
    return JSON.parse(jsonString);
  } catch (initialError) {
    console.log('Initial JSON parse failed, attempting to sanitize...', initialError.message);
    
    try {
      // Try to fix common issues in the JSON
      let sanitized = jsonString;
      
      // Try to extract just the JSON part if there's text before or after
      const betterJsonMatch = jsonString.match(/(\{[\s\S]*\})/);
      if (betterJsonMatch && betterJsonMatch[0]) {
        console.log('Extracted cleaner JSON object');
        sanitized = betterJsonMatch[0];
      }
      
      // Replace any special unicode quotes with standard quotes
      sanitized = sanitized.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
      
      // Ensure property names are properly quoted
      sanitized = sanitized.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":');
      
      // Fix trailing commas in arrays and objects
      sanitized = sanitized.replace(/,\s*([\]}])/g, '$1');
      
      // Ensure string values are properly quoted
      sanitized = sanitized.replace(/:(\s*)([^",\{\}\[\]]+)(\s*)(,|}|])/g, ':"$2"$3$4');
      
      // Fix escaped quotes in string values
      sanitized = sanitized.replace(/\\"/g, '"').replace(/"{2,}/g, '"');
      
      // Fix empty arrays to proper format
      sanitized = sanitized.replace(/:\s*\[\s*\]/g, ':[]');
      
      // Fix empty objects to proper format
      sanitized = sanitized.replace(/:\s*\{\s*\}/g, ':{}');
      
      // Fix missing values
      sanitized = sanitized.replace(/:\s*,/g, ':"",');
      sanitized = sanitized.replace(/:\s*\}/g, ':""}');
      
      // Remove any non-printable characters
      sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
      
      // Attempt to parse the sanitized JSON
      console.log('Sanitized JSON, attempting to parse again...');
      
      // If parsing still fails, try a fallback method to construct valid JSON
      try {
        return JSON.parse(sanitized);
      } catch (sanitizeError) {
        console.error('Sanitized JSON parsing failed:', sanitizeError.message);
        console.log('Attempting more aggressive fixes...');
        
        // If all else fails, try to build a minimal valid object with default structure
        return {
          callSummary: {
            agentName: "Unknown",
            customerName: "Unknown"
          },
          agentPerformance: {
            strengths: ["No data available"],
            areasForImprovement: ["No data available"]
          },
          improvementSuggestions: ["No suggestions available due to parsing error"],
          scorecard: {
            customerService: 0,
            productKnowledge: 0,
            processEfficiency: 0,
            problemSolving: 0,
            overallScore: 0
          }
        };
      }
    } catch (sanitizeError) {
      console.error('Failed to sanitize and parse JSON:', sanitizeError);
      throw new Error(`Failed to parse JSON: ${initialError.message}`);
    }
  }
};

// Import routes
const authRoutes = require('./routes/authRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const userRoutes = require('./routes/userRoutes');
const transcriptRoutes = require('./routes/transcriptRoutes');
const masterAdminRoutes = require('./routes/masterAdminRoutes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transcripts', transcriptRoutes);
app.use('/api/master-admin', masterAdminRoutes);

let emailService;
try {
  emailService = require('./services').emailService;
  
  emailService.verifyEmailConfig()
    .then(isConfigured => {
      if (isConfigured) {
        console.log('Email service is configured and ready');
      } else {
        console.log('Email service is not fully configured - password reset emails will not be sent');
      }
    })
    .catch(err => {
      console.error('Error checking email service configuration:', err);
    });
} catch (error) {
  console.error('Failed to initialize email service:', error.message);
  console.log('The application will continue without email functionality');
}