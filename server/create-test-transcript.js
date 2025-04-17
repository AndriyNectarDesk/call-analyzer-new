require('dotenv').config();
const mongoose = require('mongoose');
const Transcript = require('./models/transcript');
const Organization = require('./models/organization');
const User = require('./models/user');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Connection Error:', err));

// Function to create a test transcript
async function createTestTranscript() {
  try {
    // Find an organization
    const organization = await Organization.findOne();
    if (!organization) {
      console.error('No organization found. Please create an organization first.');
      process.exit(1);
    }
    
    console.log(`Using organization: ${organization.name} (${organization._id})`);
    
    // Find a user (optional)
    const user = await User.findOne({ organizationId: organization._id });
    console.log(`Using user: ${user ? user.email : 'No user found'} (${user ? user._id : 'N/A'})`);
    
    // Create a test transcript
    const transcript = new Transcript({
      title: 'Test Transcript ' + new Date().toISOString(),
      rawTranscript: 'This is a test transcript for debugging purposes. This is a conversation between an agent and a customer about a product issue.',
      callType: 'Flower',
      organizationId: organization._id,
      createdBy: user ? user._id : null,
      metadata: {
        title: 'Test Call',
        agentName: 'Test Agent',
        customerName: 'Test Customer',
        duration: 120,
        date: new Date()
      },
      analysis: {
        callSummary: {
          agentName: 'Test Agent',
          customerName: 'Test Customer',
          summary: 'This was a test call for debugging purposes.'
        },
        agentPerformance: {
          strengths: ['Good communication', 'Friendly tone'],
          areasForImprovement: ['Response time']
        },
        scorecard: {
          customerService: 4,
          productKnowledge: 3,
          processEfficiency: 3,
          problemSolving: 4,
          overallScore: 3.5
        }
      }
    });
    
    await transcript.save();
    console.log('Test transcript created successfully with ID:', transcript._id);
    console.log('Transcript details:', JSON.stringify(transcript, null, 2));
    
  } catch (error) {
    console.error('Error creating test transcript:', error);
  } finally {
    mongoose.disconnect();
  }
}

// Execute the function
createTestTranscript(); 