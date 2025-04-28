/**
 * Simple script to create a test agent and test the Agent model
 * 
 * Usage: node scripts/createTestAgent.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Agent = require('../server/models/agent');
const Organization = require('../server/models/organization');

async function createTestAgent() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    
    // Get MongoDB URI from environment
    let mongoUri = process.env.MONGODB_URI;
    
    // Add connection options to the URI if they're not already there
    if (!mongoUri.includes('connectTimeoutMS')) {
      // Add ? or & as needed
      const separator = mongoUri.includes('?') ? '&' : '?';
      mongoUri += `${separator}connectTimeoutMS=30000&socketTimeoutMS=30000&serverSelectionTimeoutMS=30000`;
    }
    
    // Connect to MongoDB with explicit URI including timeout parameters
    connection = await mongoose.connect(mongoUri);
    console.log('Connected to database');
    
    // First, find a valid organization to use
    console.log('Finding an organization to use...');
    const organization = await Organization.findOne().lean();
    
    if (!organization) {
      throw new Error('No organizations found in the database!');
    }
    
    console.log(`Using organization: ${organization.name || 'Unnamed'} (${organization._id})`);
    
    // Create a test agent
    const testAgent = new Agent({
      externalId: 'TEST-AGENT-001',
      firstName: 'Test',
      lastName: 'Agent',
      email: 'test.agent@example.com',
      phone: '123-456-7890',
      department: 'Customer Support',
      position: 'Support Specialist',
      status: 'active',
      organizationId: organization._id, // Use the found organization's ID
      skills: ['Product Knowledge', 'Problem Solving', 'Customer Service'],
      createdAt: new Date()
    });
    
    // Save the agent
    const savedAgent = await testAgent.save();
    console.log('Test agent created successfully:');
    console.log(JSON.stringify(savedAgent, null, 2));
    
    // Now let's add a reference to this agent in a transcript
    const Transcript = require('../server/models/transcript');
    
    console.log('Finding a transcript to update...');
    const transcript = await Transcript.findOne({ 
      organizationId: organization._id,
      'callDetails.agent': { $exists: true }
    });
    
    if (transcript) {
      console.log(`Found transcript: ${transcript._id}`);
      transcript.agentId = savedAgent._id;
      await transcript.save();
      console.log('Transcript updated with agent reference');
    } else {
      console.log('No suitable transcript found to update');
    }
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      // Close the connection
      await mongoose.connection.close();
      console.log('Database connection closed');
    }
  }
}

// Run the function
createTestAgent().catch(console.error); 