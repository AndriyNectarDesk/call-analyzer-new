const mongoose = require('mongoose');
const config = require('../config/config');
const Agent = require('../models/agent');
const Transcript = require('../models/transcript');
const Organization = require('../models/organization');

mongoose.connect(config.mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
  createTestData();
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function createTestData() {
  try {
    // Get a list of existing organizations
    const organizations = await Organization.find({ active: true });
    
    if (!organizations || organizations.length === 0) {
      console.error('No organizations found in the database');
      process.exit(1);
    }
    
    console.log(`Found ${organizations.length} organizations`);
    
    // For each organization, get its agents
    for (const org of organizations) {
      console.log(`Processing organization: ${org.name}`);
      
      const agents = await Agent.find({ organizationId: org._id });
      
      if (!agents || agents.length === 0) {
        console.log(`No agents found for organization ${org.name}`);
        continue;
      }
      
      console.log(`Found ${agents.length} agents for organization ${org.name}`);
      
      // Generate test transcripts for each agent
      for (const agent of agents) {
        console.log(`Creating transcripts for agent: ${agent.firstName} ${agent.lastName}`);
        
        // Generate 3 test transcripts per agent
        for (let i = 0; i < 3; i++) {
          const transcript = new Transcript({
            rawTranscript: `This is a test transcript ${i + 1} for agent ${agent.firstName} ${agent.lastName}`,
            organizationId: org._id,
            agentId: agent._id,
            callType: ['sales', 'support', 'inquiry'][Math.floor(Math.random() * 3)],
            source: 'web',
            analysis: {
              callSummary: {
                briefSummary: `This is a summary of test call ${i + 1} for ${agent.firstName} ${agent.lastName}`
              },
              scorecard: {
                customerService: Math.floor(Math.random() * 40) + 60, // 60-100
                productKnowledge: Math.floor(Math.random() * 40) + 60,
                processEfficiency: Math.floor(Math.random() * 40) + 60,
                problemSolving: Math.floor(Math.random() * 40) + 60,
                overallScore: Math.floor(Math.random() * 40) + 60
              }
            },
            callDetails: {
              callDirection: ['inbound', 'outbound'][Math.floor(Math.random() * 2)],
              duration: Math.floor(Math.random() * 600) + 60, // 1-10 minutes
              startedDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000), // Random date in last 30 days
              endedDate: new Date(),
              callStatus: 'completed',
              customer: {
                firstName: `TestCustomer${i}`,
                lastName: `LastName${i}`
              }
            },
            metadata: {
              title: `Test Call ${i + 1} with ${agent.firstName} ${agent.lastName}`
            },
            createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000) // Random date in last 30 days
          });
          
          await transcript.save();
          console.log(`Created transcript ${i + 1} for agent ${agent.firstName} ${agent.lastName}`);
        }
      }
    }
    
    console.log('Test data creation completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating test data:', error);
    process.exit(1);
  }
} 