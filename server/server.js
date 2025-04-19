const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const os = require('os');
const jwt = require('jsonwebtoken');

const mongoose = require('mongoose');
const Transcript = require(require('path').resolve(__dirname, 'models', 'transcript'));
const CallType = require(require('path').resolve(__dirname, 'models', 'callType'));
const Organization = require(require('path').resolve(__dirname, 'models', 'organization'));
const { authenticateApiKey, authenticateJWT, handleOrganizationContext, verifyToken, requireMasterAdmin, organizationContextMiddleware } = require('./middleware/authMiddleware');
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

// Add request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log when request completes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const userInfo = req.user ? `user: ${req.user.userId}, org: ${req.user.organizationId}` : 'unauthenticated';
    console.log(`[${req.method}] ${req.path} - ${res.statusCode} - ${duration}ms - ${userInfo}`);
  });
  
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

app.post('/api/call-types', authenticateApiKey, async (req, res) => {
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

app.put('/api/call-types/:id', authenticateApiKey, async (req, res) => {
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

app.delete('/api/call-types/:id', authenticateApiKey, async (req, res) => {
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
      // Add brief summary to the JSON structure if doesn't exist
      let jsonStructure = customCallType.jsonStructure || {};
      let promptTemplate = customCallType.promptTemplate || '';
      
      // Make sure the promptTemplate contains a briefSummary field
      if (!promptTemplate.includes('"briefSummary"')) {
        // Find the callSummary opening brace position
        const callSummaryPos = promptTemplate.indexOf('"callSummary"');
        if (callSummaryPos !== -1) {
          // Find the opening brace after callSummary
          const openBracePos = promptTemplate.indexOf('{', callSummaryPos);
          if (openBracePos !== -1) {
            // Insert the briefSummary field after the opening brace
            promptTemplate = promptTemplate.slice(0, openBracePos + 1) + 
              '\n    "briefSummary": "",' + 
              promptTemplate.slice(openBracePos + 1);
          }
        }
      }
      
      return `${basePrompt}
${promptTemplate}

${jsonStructure.instructions || `This is a call center transcript from ${customCallType.name}. Be sure to identify the agent's name at the beginning of the call. Include a one-sentence summary of the entire call in the briefSummary field.`}

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
    "briefSummary": "",
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

This is a call center transcript from a hearing aid clinic. Be sure to identify the agent's name at the beginning of the call and include it in the agentName field. Provide a one-sentence summary of the entire call in the briefSummary field. Focus on patient information, appointment scheduling, hearing concerns, and hearing aid details in your analysis.

Here's the transcript:

${transcript}`;
  } else {
    // Default to flower shop
    return `${basePrompt}
{
  "callSummary": {
    "briefSummary": "",
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

This is a call center transcript from a flower shop. Be sure to identify the agent's name at the beginning of the call and include it in the agentName field. Provide a one-sentence summary of the entire call in the briefSummary field. Focus on order details, delivery information, and flower preferences in your analysis.

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
    console.log('Analyze API called:', new Date().toISOString());
    
    // Extract data from request
    const { transcript, callType } = req.body;
    
    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    // Get organization ID and user ID
    const token = req.headers.authorization?.split(' ')[1];
    let organizationId = null;
    let userId = null;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
        
        // Get Organization ID
        const user = await User.findById(userId);
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        // If custom header is provided, use that
        if (req.headers['x-organization-id']) {
          organizationId = req.headers['x-organization-id'];
          console.log('Using organization ID from header:', organizationId);
        } else {
          // Otherwise use the user's organization
          organizationId = user.organizationId;
          console.log('Using organization ID from user profile:', organizationId);
        }
      } catch (err) {
        console.error('JWT verification failed:', err);
        return res.status(401).json({ error: 'Invalid token' });
      }
    } else {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    
    // Handle Only Blooms special case - backward compatibility
    if (req.headers['x-only-blooms'] === 'true') {
      const bloomsOrg = await Organization.findOne({ 
        $or: [
          { name: { $regex: /blooms/i } },
          { code: { $regex: /blooms/i } }
        ]
      });
      
      if (bloomsOrg) {
        console.log('Override: Using Blooms organization:', bloomsOrg.name);
        organizationId = bloomsOrg._id;
      }
    }
    
    // Handle organization name header
    if (req.headers['x-organization-name']) {
      const orgName = req.headers['x-organization-name'];
      
      // Only search by name if it's not an ID format
      if (!mongoose.Types.ObjectId.isValid(orgName)) {
        const org = await Organization.findOne({ 
          name: { $regex: new RegExp(orgName, 'i') }
        });
        
        if (org) {
          console.log('Override: Using organization by name:', org.name);
          organizationId = org._id;
        }
      }
    }
    
    // Check if organization exists
    if (mongoose.Types.ObjectId.isValid(organizationId)) {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
    } else {
      console.error('Invalid organization ID format:', organizationId);
      return res.status(400).json({ error: 'Invalid organization ID format' });
    }
    
    console.log(`Processing analyze request for organizationId: ${organizationId}`);

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
    
    // Extract the response content
    const assistantMessage = response.data.content[0].text;
    
    // Get the raw response for debugging
    console.log('Claude raw response for analysis:', assistantMessage);
    
    // Extract JSON from response
    let jsonData = null;
    const jsonMatch = assistantMessage.match(/\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\}))*\}/);
    
    if (jsonMatch) {
      try {
        jsonData = sanitizeJson(jsonMatch[0]);
      } catch (error) {
        console.error('JSON parsing failed:', error.message);
        throw new Error('Claude response did not contain valid JSON format');
      }
    } else {
      throw new Error('Claude response did not contain valid JSON format');
    }
    
    // Check if we have valid data
    if (!jsonData) {
      throw new Error('Failed to extract valid JSON from Claude response');
    }
    
    // Log the structure of the parsed data
    console.log('Parsed JSON data structure:', Object.keys(jsonData));
    
    // Add an extra log to show callSummary fields
    if (jsonData.callSummary) {
      console.log('Call Summary fields:', Object.keys(jsonData.callSummary));
    }
    
    // Verify the data has the expected structure
    if (!jsonData.callSummary) {
      console.warn('Missing callSummary in analysis data');
    }
    if (!jsonData.agentPerformance) {
      console.warn('Missing agentPerformance in analysis data');
    }
    if (!jsonData.scorecard) {
      console.warn('Missing scorecard in analysis data');
    }

    // Ensure callType is a string, not an array
    let callTypeValue = callType || 'auto';
    if (Array.isArray(callTypeValue)) {
      console.log('callType is an array, using first value:', callTypeValue);
      callTypeValue = callTypeValue[0] || 'auto';
    }

    // Save transcript and analysis to database
    const newTranscript = new Transcript({
      rawTranscript: transcript,
      analysis: jsonData,
      source: 'web',
      callType: callTypeValue,
      organizationId: organizationId,
      createdBy: userId
    });

    console.log(`Saving transcript with organizationId: ${organizationId}`);
    await newTranscript.save();
    
    // Update organization transcript count
    await Organization.findByIdAndUpdate(
      organizationId,
      { $inc: { 'usageStats.totalTranscripts': 1 } }
    );

    // Return the analysis
    return res.json({
      success: true,
      transcript: transcript,
      analysis: jsonData,
      id: newTranscript._id,
      organizationId: organizationId
    });
  } catch (error) {
    next(error);
  }
});

// Update external API route to use async createPrompt
app.post('/api/external/analyze', authenticateApiKey, async (req, res, next) => {
  try {
    const { transcript, metadata, callType, audioUrl } = req.body;
    
    // Get organization ID from the request (set by authenticateApiKey middleware)
    if (!req.organization || !req.organization.id) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }
    
    const organizationId = req.organization.id;
    let finalTranscript = transcript;
    let tempDir = null;
    let filePath = null;
    let outputPath = null;

    // If audioUrl is provided, download and transcribe it
    if (audioUrl && !transcript) {
      console.log(`Processing audio from URL: ${audioUrl}`);
      
      try {
        // Create a temporary directory for downloaded files
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-'));
        filePath = path.join(tempDir, 'downloaded-audio');
        
        // Check if this is a nectar domain URL that needs special handling
        const isNectarDomainUrl = audioUrl.includes('nectardesk.io') || audioUrl.includes('nectarflowers');
        
        // Custom headers for Nectar domain URLs
        const headers = {
          'User-Agent': 'Call-Analyzer/1.0'
        };
        
        // Add any domain-specific headers if needed
        if (isNectarDomainUrl) {
          console.log('Detected Nectar platform URL, adding special headers');
          // NectarDesk recordings are publicly accessible, no token needed
          
          // Add headers needed for Nectar platform
          headers['Accept'] = '*/*';
          headers['Origin'] = 'https://call-analyzer-api.onrender.com';
        }
        
        // Download the file from the URL
        console.log('Downloading audio file...');
        const response = await axios({
          method: 'GET',
          url: audioUrl,
          responseType: 'arraybuffer',
          timeout: 60000, // 60 second timeout for longer files
          headers: headers
        });
        
        // Check content type - but be more lenient with Nectar URLs which might not set proper content types
        const contentType = response.headers['content-type'];
        if (!isNectarDomainUrl && !contentType?.includes('audio/')) {
          console.warn(`URL content-type is not audio: ${contentType}, proceeding anyway as it might be misconfigured`);
        }
        
        // Get the response data
        const responseData = response.data;
        if (!responseData || responseData.length === 0) {
          throw new Error('Downloaded file is empty');
        }
        
        console.log(`Downloaded file size: ${responseData.length} bytes`);
        
        // Write the downloaded file to disk
        fs.writeFileSync(filePath, Buffer.from(responseData));
        console.log(`Downloaded audio file to ${filePath}`);
        
        // Convert to MP3 for consistent handling
        outputPath = filePath + '.mp3';
        console.log('Starting FFmpeg conversion...');
        
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
        finalTranscript = deepgramResponse.data.results?.channels[0]?.alternatives[0]?.transcript;
        
        if (!finalTranscript) {
          return res.status(400).json({ error: 'Failed to transcribe audio or audio contained no speech' });
        }

        console.log(`Transcription successful: ${finalTranscript.substring(0, 100)}...`);

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
          tempDir = null;
          filePath = null;
          outputPath = null;
        } catch (err) {
          console.error('Error cleaning up files:', err);
          // Continue processing even if cleanup fails
        }
      } catch (err) {
        // Clean up files if there was an error
        try {
          if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          if (outputPath && fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
          if (tempDir && fs.existsSync(tempDir)) {
            fs.rmdirSync(tempDir, { recursive: true });
          }
        } catch (cleanupErr) {
          console.error('Error cleaning up files after transcription error:', cleanupErr);
        }
        
        console.error('Error processing audio from URL:', err);
        return res.status(400).json({ 
          error: 'Failed to process audio from URL',
          details: err.message
        });
      }
    }
    
    // Validate we have a transcript at this point
    if (!finalTranscript) {
      return res.status(400).json({ error: 'Either transcript or audioUrl is required' });
    }
    
    // Call Claude API with the async createPrompt
    const prompt = await createPrompt(finalTranscript, callType);
    
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
    
    // Extract the response content
    const assistantMessage = response.data.content[0].text;
    
    // Get the raw response for debugging
    console.log('Claude raw response for audio analysis:', assistantMessage);
    
    // Extract JSON from response
    let jsonData = null;
    const jsonMatch = assistantMessage.match(/\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\}))*\}/);
    
    if (jsonMatch) {
      try {
        jsonData = sanitizeJson(jsonMatch[0]);
      } catch (error) {
        console.error('JSON parsing failed:', error.message);
        throw new Error('Claude response did not contain valid JSON format');
      }
    } else {
      throw new Error('Claude response did not contain valid JSON format');
    }
    
    // Check if we have valid data
    if (!jsonData) {
      throw new Error('Failed to extract valid JSON from Claude response');
    }
    
    // Log the structure of the parsed data
    console.log('Parsed JSON data structure:', Object.keys(jsonData));
    
    // Verify the data has the expected structure
    if (!jsonData.callSummary) {
      console.warn('Missing callSummary in analysis data');
    }
    if (!jsonData.agentPerformance) {
      console.warn('Missing agentPerformance in analysis data');
    }
    if (!jsonData.scorecard) {
      console.warn('Missing scorecard in analysis data');
    }
    
    try {
      // Save transcript and analysis to database (same as analyze endpoint)
      console.log('Saving audio transcript to database...');
      
      // Ensure callType is a string, not an array
      let callTypeValue = callType || 'auto';
      if (Array.isArray(callTypeValue)) {
        console.log('callType is an array, using first value:', callTypeValue);
        callTypeValue = callTypeValue[0] || 'auto';
      }
      
      const newTranscript = new Transcript({
        rawTranscript: finalTranscript,
        analysis: jsonData,
        source: audioUrl ? 'audio' : 'api',
        metadata: metadata || {},
        callType: callTypeValue,
        organizationId: organizationId
      });

      await newTranscript.save();
      console.log('Transcript saved successfully to database with ID:', newTranscript._id);
      
      // Update organization transcript count
      await Organization.findByIdAndUpdate(
        organizationId,
        { $inc: { 'usageStats.totalTranscripts': 1 } }
      );
      
      // Return success response
      return res.json({
        success: true,
        transcript: finalTranscript,
        analysis: jsonData,
        id: newTranscript._id
      });
    } catch (dbError) {
      console.error('Error saving transcript to database:', dbError);
      // If there's a database error, still return the analysis to the client
      return res.json({
        success: true,
        transcript: finalTranscript,
        analysis: jsonData,
        error: 'Warning: Analysis not saved to database',
        details: dbError.message
      });
    }
  } catch (error) {
    next(error); // Pass to the error handling middleware
  }
});

// Admin route to check API key status (protected with your external API key)
app.get('/api/admin/check-api-keys', authenticateApiKey, async (req, res) => {
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

// Debug endpoint to check API keys in the database (only for development/testing)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug/api-keys', async (req, res) => {
    try {
      const ApiKey = require('./models/ApiKey');
      const apiKeys = await ApiKey.find({ isActive: true })
        .select('prefix key name organizationId createdAt lastUsed')
        .populate('organizationId', 'name code')
        .lean();
      
      // Format the data for security reasons (don't expose full keys)
      const formattedKeys = apiKeys.map(key => ({
        id: key._id,
        prefix: key.prefix,
        key: key.key ? `${key.key.substring(0, 4)}...${key.key.substring(key.key.length - 4)}` : 'N/A',
        name: key.name,
        organization: key.organizationId ? {
          id: key.organizationId._id,
          name: key.organizationId.name,
          code: key.organizationId.code
        } : 'N/A',
        fullKeyFormat: `${key.prefix}_${key.key ? key.key.substring(0, 4) + '...' : 'N/A'}`,
        createdAt: key.createdAt,
        lastUsed: key.lastUsed
      }));
      
      res.json({
        apiKeys: formattedKeys,
        count: formattedKeys.length
      });
    } catch (error) {
      console.error('Error fetching API keys:', error);
      res.status(500).json({ error: 'Failed to fetch API keys', details: error.message });
    }
  });
}

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
    
    // Extract user info from token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Verify and decode the token
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (tokenError) {
      console.error('Token verification failed:', tokenError);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const userId = decodedToken.userId;
    let organizationId = null;
    
    // Check if organization override is provided in headers - process this with highest priority
    const orgNameHeader = req.headers['x-organization-name'];
    
    let targetOrgName = null;
    
    if (orgNameHeader) {
      // New general approach - any organization can be specified by name
      targetOrgName = orgNameHeader;
      console.log(`Organization override detected via X-Organization-Name: ${targetOrgName}`);
    }
    
    // If we have a target organization name, try to find the matching organization
    if (targetOrgName) {
      try {
        const Organization = require('./models/organization');
        const targetOrg = await Organization.findOne({
          $or: [
            { name: { $regex: targetOrgName, $options: 'i' } },
            { code: { $regex: targetOrgName, $options: 'i' } }
          ]
        });
        
        if (targetOrg) {
          console.log(`Found and using organization: ${targetOrg.name} (${targetOrg._id})`);
          organizationId = targetOrg._id;
        } else {
          console.warn(`Organization override requested but no organization matching '${targetOrgName}' found`);
        }
      } catch (err) {
        console.error('Error finding organization:', err);
      }
    }
    
    // If no organization was found or specified, fall back to token organization
    if (!organizationId) {
      organizationId = decodedToken.organizationId;
      
      // If organizationId is missing in the token, fetch it from the user record
      if (!organizationId) {
        console.log(`organizationId missing in token for user: ${userId}, fetching from database...`);
        try {
          const User = require('./models/user');
          const user = await User.findById(userId);
          if (user && user.organizationId) {
            organizationId = user.organizationId;
            console.log(`Retrieved organizationId ${organizationId} for user ${userId}`);
          } else {
            console.error(`User ${userId} has no organization assigned`);
            return res.status(400).json({ error: 'User has no organization assigned' });
          }
        } catch (userLookupError) {
          console.error('Error fetching user organization:', userLookupError);
          return res.status(500).json({ error: 'Error verifying user organization' });
        }
      } else {
        console.log(`Using user's default organization ID from token: ${organizationId}`);
      }
    }
    
    console.log(`Processing transcribe request for organizationId: ${organizationId}`);

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
      console.log('Claude raw response for audio analysis:', assistantMessage);
      
      // Extract JSON from response
      let jsonData = null;
      const jsonMatch = assistantMessage.match(/\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\}))*\}/);
      
      if (jsonMatch) {
        try {
          jsonData = sanitizeJson(jsonMatch[0]);
        } catch (error) {
          console.error('JSON parsing failed:', error.message);
          throw new Error('Claude response did not contain valid JSON format');
        }
      } else {
        throw new Error('Claude response did not contain valid JSON format');
      }
      
      // Check if we have valid data
      if (!jsonData) {
        throw new Error('Failed to extract valid JSON from Claude response');
      }
      
      // Log the structure of the parsed data
      console.log('Parsed JSON data structure:', Object.keys(jsonData));
      
      // Verify the data has the expected structure
      if (!jsonData.callSummary) {
        console.warn('Missing callSummary in analysis data');
      }
      if (!jsonData.agentPerformance) {
        console.warn('Missing agentPerformance in analysis data');
      }
      if (!jsonData.scorecard) {
        console.warn('Missing scorecard in analysis data');
      }
      
      try {
        // Save transcript and analysis to database (same as analyze endpoint)
        console.log('Saving audio transcript to database...');
        
        // Ensure callType is a string, not an array
        let callTypeValue = callType || 'auto';
        if (Array.isArray(callTypeValue)) {
          console.log('callType is an array, using first value:', callTypeValue);
          callTypeValue = callTypeValue[0] || 'auto';
        }
        
        const newTranscript = new Transcript({
          rawTranscript: transcript,
          analysis: jsonData,
          source: 'audio',
          callType: callTypeValue,
          organizationId: organizationId,
          createdBy: userId
        });

        await newTranscript.save();
        console.log('Transcript saved successfully to database with ID:', newTranscript._id);
        
        // Update organization transcript count
        await Organization.findByIdAndUpdate(
          organizationId,
          { $inc: { 'usageStats.totalTranscripts': 1 } }
        );
        
        // Return success response
        return res.json({
          success: true,
          transcript: transcript,
          analysis: jsonData,
          id: newTranscript._id
        });
      } catch (dbError) {
        console.error('Error saving transcript to database:', dbError);
        // If there's a database error, still return the analysis to the client
        return res.json({
          success: true,
          transcript: transcript,
          analysis: jsonData,
          error: 'Warning: Analysis not saved to database',
          details: dbError.message
        });
      }
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

// Add API routes BEFORE applying API middleware 
// This prevents route conflicts and path-to-regexp errors
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/organizations', require('./routes/organizationRoutes'));
app.use('/api/transcripts', require('./routes/transcriptRoutes'));
app.use('/api/call-types', require('./routes/callTypeRoutes'));
app.use('/api/master-admin', require('./routes/masterAdminRoutes'));

// Add webhook endpoints BEFORE authentication middleware
// to allow incoming webhooks without authentication

// Add webhook endpoint with original path for backward compatibility
app.post('/api/webhooks/nectar-desk/:organizationId', async (req, res, next) => {
  try {
    console.log('Received webhook from NectarDesk on original endpoint');
    
    const callData = req.body;
    const { organizationId } = req.params;
    
    // Validate the incoming data
    if (!callData || !callData.id || !callData.call_recordings || callData.call_recordings.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid webhook data', 
        details: 'Missing required fields: id or call_recordings' 
      });
    }

    // Validate organizationId
    if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
      console.error(`Invalid organization ID in webhook URL: ${organizationId}`);
      return res.status(400).json({ 
        error: 'Invalid organization ID', 
        details: 'The URL must include a valid organization ID'
      });
    }
    
    // Extract call details
    const {
      id: callId,
      type: callDirection,
      duration,
      talkTime,
      waitingTime,
      tags,
      call_type: callStatus,
      startedDate,
      endedDate,
      contact,
      agents,
      number,
      call_recordings,
      // New fields from expanded payload
      campaign,
      abandoned,
      disposition,
      external_numbers,
      transfer_details
    } = callData;
    
    // Debug log for agents data
    console.log('Agents data received:', JSON.stringify(agents, null, 2));
    
    // Prepare metadata for analysis
    const metadata = {
      callId,
      callDirection,
      duration,
      talkTime,
      waitingTime,
      tags,
      call_type: callStatus,
      startedDate,
      endedDate,
      contactId: contact?.id,
      contactName: contact ? `${contact.firstName} ${contact.lastName}`.trim() : 'Unknown',
      contactEmail: contact?.email,
      contactPhone: contact?.phone,
      contactCreateDate: contact?.createDate,
      contactAdditionalFields: contact?.additionalFields,
      numberId: number?.id,
      phoneNumber: number?.number,
      phoneAlias: number?.alias,
      // Add new metadata fields
      campaign,
      abandoned,
      disposition,
      external_numbers,
      transfer_details,
      source: 'nectar-desk-webhook'
    };
    
    // Handle agents data - could be an array of objects, single object, or other format
    if (agents) {
      if (Array.isArray(agents) && agents.length > 0) {
        // If it's an array with at least one element, use the first agent
        metadata.agent = agents[0];
        // Also keep individual fields for backward compatibility
        metadata.agentId = agents[0].id;
        metadata.agentName = agents[0].name;
        metadata.agentAction = agents[0].action;
        metadata.agentType = agents[0].type;
      } else if (typeof agents === 'object') {
        // If it's a single object
        metadata.agent = agents;
        metadata.agentId = agents.id;
        metadata.agentName = agents.name;
        metadata.agentAction = agents.action;
        metadata.agentType = agents.type;
      } else {
        // Otherwise just store it as is
        metadata.agent = agents;
      }
    }
    
    // Get the audio URL - remove any http:// or https:// prefix and add https://
    let audioUrl = call_recordings[0];
    if (!audioUrl.startsWith('http')) {
      audioUrl = `https://${audioUrl}`;
    }
    
    console.log(`Processing NectarDesk call recording: ${audioUrl} for organization: ${organizationId}`);
    
    // Find the organization by ID
    const Organization = require('./models/organization');
    const organization = await Organization.findById(organizationId);
    
    if (!organization) {
      console.error(`Organization not found: ${organizationId}`);
      return res.status(404).json({ 
        error: 'Organization not found', 
        details: 'The provided organization ID does not exist in the system' 
      });
    }

    // Check if the organization has API access enabled
    if (!organization.features || !organization.features.apiAccess) {
      console.error(`Organization ${organizationId} does not have API access enabled`);
      return res.status(403).json({ 
        error: 'API access not enabled', 
        details: 'This organization does not have API access enabled'
      });
    }
    
    // Queue the analysis job - we'll respond to webhook quickly and process in background
    // Send 200 OK response immediately to acknowledge receipt
    res.status(200).json({ 
      success: true, 
      message: 'Webhook received and processing started',
      callId,
      organization: organization.name
    });
    
    // Process in background - don't wait for completion
    processWebhookRecording(audioUrl, metadata, organizationId)
      .then(result => {
        console.log(`Successfully processed NectarDesk webhook call ${callId} for organization ${organization.name}`);
      })
      .catch(error => {
        console.error(`Error processing NectarDesk webhook call ${callId} for organization ${organization.name}:`, error);
      });
      
  } catch (error) {
    console.error('Error handling NectarDesk webhook:', error);
    // Even on error, return 200 so NectarDesk doesn't retry unnecessarily
    res.status(200).json({ 
      success: false, 
      error: 'Error processing webhook',
      message: error.message
    });
  }
});

// Also add back a simple version of the generic endpoint
app.post('/api/webhooks/nectar-desk', async (req, res) => {
  try {
    console.log('DEPRECATION WARNING: Received webhook on deprecated generic endpoint - this endpoint will be removed in the future');
    
    const callData = req.body;
    
    // Validate the incoming data
    if (!callData || !callData.id || !callData.call_recordings || callData.call_recordings.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid webhook data', 
        details: 'Missing required fields: id or call_recordings' 
      });
    }
    
    // For legacy endpoint, use the Master Organization
    const Organization = require('./models/organization');
    const masterOrg = await Organization.findOne({ isMaster: true });
    
    if (!masterOrg) {
      console.error('No master organization found for webhook processing');
      return res.status(500).json({ error: 'Configuration error - organization not found' });
    }
    
    // Inform about the deprecated endpoint
    console.log(`Using generic webhook endpoint with master organization: ${masterOrg.name} (${masterOrg._id})`);
    
    // Extract call details
    const {
      id: callId,
      type: callDirection,
      duration,
      talkTime,
      waitingTime,
      tags,
      call_type: callStatus,
      startedDate,
      endedDate,
      contact,
      agents,
      number,
      call_recordings,
      // New fields from expanded payload
      campaign,
      abandoned,
      disposition,
      external_numbers,
      transfer_details
    } = callData;
    
    // Track usage of this deprecated endpoint
    trackWebhookUsage('genericEndpoint', callId, masterOrg._id);
    
    // Debug log for agents data
    console.log('Agents data received (generic):', JSON.stringify(agents, null, 2));
    
    // Prepare metadata for analysis
    const metadata = {
      callId,
      callDirection,
      duration,
      talkTime,
      waitingTime,
      tags,
      call_type: callStatus,
      startedDate,
      endedDate,
      contactId: contact?.id,
      contactName: contact ? `${contact.firstName} ${contact.lastName}`.trim() : 'Unknown',
      contactEmail: contact?.email,
      contactPhone: contact?.phone,
      contactCreateDate: contact?.createDate,
      contactAdditionalFields: contact?.additionalFields,
      numberId: number?.id,
      phoneNumber: number?.number,
      phoneAlias: number?.alias,
      // Add new metadata fields
      campaign,
      abandoned,
      disposition,
      external_numbers,
      transfer_details,
      source: 'nectar-desk-webhook-generic'
    };
    
    // Handle agents data - could be an array of objects, single object, or other format
    if (agents) {
      if (Array.isArray(agents) && agents.length > 0) {
        // If it's an array with at least one element, use the first agent
        metadata.agent = agents[0];
        // Also keep individual fields for backward compatibility
        metadata.agentId = agents[0].id;
        metadata.agentName = agents[0].name;
        metadata.agentAction = agents[0].action;
        metadata.agentType = agents[0].type;
      } else if (typeof agents === 'object') {
        // If it's a single object
        metadata.agent = agents;
        metadata.agentId = agents.id;
        metadata.agentName = agents.name;
        metadata.agentAction = agents.action;
        metadata.agentType = agents.type;
      } else {
        // Otherwise just store it as is
        metadata.agent = agents;
      }
    }
    
    // Get the audio URL
    let audioUrl = call_recordings[0];
    if (!audioUrl.startsWith('http')) {
      audioUrl = `https://${audioUrl}`;
    }
    
    // Send 200 OK response immediately
    res.status(200).json({ 
      success: true, 
      message: 'Webhook received and processing started',
      callId,
      organization: masterOrg.name,
      note: 'DEPRECATED: This endpoint is deprecated and will be removed. Please update to the organization-specific endpoint: /api/webhooks/nectar-desk/:organizationId'
    });
    
    // Process in background 
    processWebhookRecording(audioUrl, metadata, masterOrg._id)
      .then(result => {
        console.log(`Successfully processed generic webhook call ${callId}`);
      })
      .catch(error => {
        console.error(`Error processing generic webhook call ${callId}:`, error);
      });
      
  } catch (error) {
    console.error('Error handling generic webhook:', error);
    res.status(200).json({ 
      success: false, 
      error: 'Error processing webhook',
      message: error.message
    });
  }
});

// Apply API middleware to remaining unmatched /api routes
app.use('/api', verifyToken); 
app.use('/api', organizationContextMiddleware);

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../client/build')));

// Add better error handling for static file serving
app.use((req, res, next) => {
  // Skip API routes - only handle frontend routes
  if (req.path.startsWith('/api')) {
    return next();
  }

  // Log request for debugging
  console.log(`Serving static file for path: ${req.path}`);
  
  try {
    // Try to send the index.html file for all client-side routes
    // This supports React Router's client-side routing
    const indexPath = path.join(__dirname, '../client/build/index.html');
    
    // Check if the file exists
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // Log the error and potential paths for debugging
      console.error(`Static file not found: ${indexPath}`);
      console.error(`Current directory: ${__dirname}`);
      console.error(`Attempted to serve: ${path.resolve(indexPath)}`);
      
      // List available directories for debugging
      try {
        const parentDir = path.join(__dirname, '..');
        console.error(`Parent directory contents: ${fs.readdirSync(parentDir).join(', ')}`);
        
        if (fs.existsSync(path.join(parentDir, 'client'))) {
          console.error(`Client directory contents: ${fs.readdirSync(path.join(parentDir, 'client')).join(', ')}`);
        }
      } catch (e) {
        console.error(`Error listing directories: ${e.message}`);
      }
      
      res.status(404).send('Client application not found. Please check server logs for details.');
    }
  } catch (err) {
    console.error(`Error serving static file: ${err.message}`);
    next(err);
  }
});

// Register the error handling middleware
app.use(handleApiError);

// Initialize email service
const initEmailService = require('./init-email-service');
initEmailService().catch(err => {
  console.error('Error during email service initialization:', err);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Initial API key check
  checkApiKeyStatus().then(isValid => {
    if (!isValid) {
      console.warn('Server starting with invalid Claude API key. Transcript analysis will not work.');
    }
  });
  
  // Ensure Master Organization exists and all Master Admins are assigned to it
  const masterAdminController = require('./controllers/masterAdminController');
  masterAdminController.ensureMasterOrganization()
    .then(masterOrg => {
      console.log('Master Organization check complete:', masterOrg.name);
    })
    .catch(err => {
      console.error('Error ensuring Master Organization:', err);
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

// Helper function to process NectarDesk recordings in the background
async function processWebhookRecording(audioUrl, metadata, organizationId) {
  try {
    console.log(`Starting background processing of recording: ${audioUrl}`);
    
    // Create temporary directory for downloaded files
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webhook-audio-'));
    const filePath = path.join(tempDir, 'downloaded-audio');
    
    console.log('Downloading audio file...');
    const response = await axios({
      method: 'GET',
      url: audioUrl,
      responseType: 'arraybuffer',
      timeout: 60000, // 60 second timeout for longer files
      headers: {
        'User-Agent': 'Call-Analyzer/1.0',
        'Accept': '*/*',
        'Origin': 'https://call-analyzer-api.onrender.com'
      }
    });
    
    // Get the response data
    const responseData = response.data;
    if (!responseData || responseData.length === 0) {
      throw new Error('Downloaded file is empty');
    }
    
    console.log(`Downloaded file size: ${responseData.length} bytes`);
    
    // Write the downloaded file to disk
    fs.writeFileSync(filePath, Buffer.from(responseData));
    console.log(`Downloaded audio file to ${filePath}`);
    
    // Convert to MP3 for consistent handling
    const outputPath = filePath + '.mp3';
    console.log('Starting FFmpeg conversion...');
    
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
    
    // Read the converted file
    const audioBuffer = fs.readFileSync(outputPath);
    
    // Transcribe with Deepgram
    console.log('Sending to Deepgram...');
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
      throw new Error('Failed to transcribe audio or audio contained no speech');
    }
    
    console.log(`Transcription successful: ${transcript.substring(0, 100)}...`);
    
    // Analyze with Claude
    const prompt = await createPrompt(transcript, 'flower-shop');
    
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
    
    // Extract JSON from response
    let jsonData = null;
    const jsonMatch = assistantMessage.match(/\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\}))*\}/);
    
    if (jsonMatch) {
      try {
        jsonData = sanitizeJson(jsonMatch[0]);
      } catch (error) {
        console.error('JSON parsing failed:', error.message);
        throw new Error('Claude response did not contain valid JSON format');
      }
    } else {
      throw new Error('Claude response did not contain valid JSON format');
    }
    
    // Prepare call details from metadata - handle complex data like agent info
    const callDetails = {
      callId: metadata.callId,
      callDirection: metadata.callDirection,
      duration: metadata.duration,
      talkTime: metadata.talkTime,
      waitingTime: metadata.waitingTime,
      startedDate: metadata.startedDate,
      endedDate: metadata.endedDate,
      tags: metadata.tags || [],
      callStatus: metadata.call_type,
      // Add new fields
      campaign: metadata.campaign || '',
      abandoned: metadata.abandoned || 0,
      disposition: metadata.disposition ? { code: metadata.disposition.code } : null,
      external_numbers: metadata.external_numbers || [],
      transfer_details: metadata.transfer_details || null,
      number: {
        id: metadata.numberId,
        number: metadata.phoneNumber,
        alias: metadata.phoneAlias
      },
      customer: {
        id: metadata.contactId,
        firstName: metadata.contactName ? metadata.contactName.split(' ')[0] : 'Unknown',
        lastName: metadata.contactName ? metadata.contactName.split(' ').slice(1).join(' ') : '',
        email: metadata.contactEmail,
        phone: metadata.contactPhone,
        createDate: metadata.contactCreateDate || null,
        additionalFields: metadata.contactAdditionalFields || null
      }
    };

    // Handle agent data specially - could be an object, array, or primitive
    // If agent is already available directly in metadata (already as object/array)
    if (metadata.agent) {
      callDetails.agent = metadata.agent;
    } 
    // Otherwise try to construct it from individual fields if they exist
    else if (metadata.agentId || metadata.agentName || metadata.agentAction || metadata.agentType) {
      callDetails.agent = {
        id: metadata.agentId,
        name: metadata.agentName,
        action: metadata.agentAction,
        type: metadata.agentType
      };
    }
    
    // Save transcript and analysis to database
    const newTranscript = new Transcript({
      rawTranscript: transcript,
      analysis: jsonData,
      source: 'nectar-desk-webhook',
      metadata: metadata,
      callDetails: callDetails,
      callType: 'flower-shop',
      organizationId: organizationId
    });
    
    await newTranscript.save();
    console.log('Transcript saved successfully to database with ID:', newTranscript._id);
    
    // Update organization transcript count
    await Organization.findByIdAndUpdate(
      organizationId,
      { $inc: { 'usageStats.totalTranscripts': 1 } }
    );
    
    // Clean up files
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      if (fs.existsSync(tempDir)) {
        fs.rmdirSync(tempDir, { recursive: true });
      }
    } catch (cleanupErr) {
      console.error('Error cleaning up files:', cleanupErr);
    }
    
    return {
      success: true,
      transcriptId: newTranscript._id
    };
    
  } catch (error) {
    console.error('Error processing webhook recording:', error);
    throw error;
  }
}

// Webhook usage tracking for deprecation monitoring
const webhookUsageStats = {
  genericEndpoint: {
    lastUsed: null,
    count: 0,
    calls: []
  }
};

// Helper function to track webhook usage
const trackWebhookUsage = (endpointType, callId, organizationId) => {
  const stats = webhookUsageStats[endpointType];
  const now = new Date();
  stats.lastUsed = now;
  stats.count++;
  
  // Keep last 20 calls for analysis
  stats.calls.unshift({
    timestamp: now,
    callId,
    organizationId
  });
  
  if (stats.calls.length > 20) {
    stats.calls.pop();
  }
  
  // Log webhook usage statistics every 10 calls
  if (stats.count % 10 === 0) {
    console.log(`DEPRECATION TRACKING - ${endpointType} endpoint usage statistics:`, {
      totalCalls: stats.count,
      lastUsed: stats.lastUsed,
      recentCalls: stats.calls.length
    });
  }
};

// Add API endpoint to view usage statistics (only available to master admins)
app.get('/api/admin/webhook-usage-stats', validateApiKey, async (req, res) => {
  try {
    // Only accessible to master admins
    if (!req.user || !req.user.isMasterAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    res.json({
      webhookUsageStats,
      message: 'These statistics help track usage of deprecated endpoints'
    });
  } catch (error) {
    console.error('Error retrieving webhook usage stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});