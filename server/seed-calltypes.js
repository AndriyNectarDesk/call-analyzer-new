const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const CallType = require('./models/callType');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
console.log('MongoDB URI:', MONGODB_URI ? 'Found' : 'Not found');

// Default call types
const defaultCallTypes = [
  {
    code: 'flower',
    name: 'Flower Shop',
    description: 'Calls related to flower shops, handling orders, deliveries, and floral arrangements',
    promptTemplate: `{
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
}`,
    jsonStructure: {
      callSummary: {
        agentName: "The agent handling the call",
        customerName: "The customer's name",
        orderType: "Type of flower arrangement or product ordered",
        deliveryAddress: "Where the flowers should be delivered",
        totalValue: "Total cost of the order",
        specialInstructions: "Any special requests for the order"
      },
      instructions: "This is a call center transcript from a flower shop. Be sure to identify the agent's name at the beginning of the call. Focus on order details, delivery information, and flower preferences in your analysis."
    }
  },
  {
    code: 'hearing',
    name: 'Hearing Aid Clinic',
    description: 'Calls related to hearing aid clinics, appointments, and hearing device inquiries',
    promptTemplate: `{
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
}`,
    jsonStructure: {
      callSummary: {
        agentName: "The agent handling the call",
        patientName: "The patient's name",
        appointmentType: "Type of appointment requested",
        appointmentDetails: "Date, time, and other appointment details",
        hearingAidInfo: "Information about hearing aid models, features, or issues",
        specialConsiderations: "Any special needs or requests from the patient"
      },
      instructions: "This is a call center transcript from a hearing aid clinic. Be sure to identify the agent's name at the beginning of the call. Focus on patient information, appointment scheduling, hearing concerns, and hearing aid details in your analysis."
    }
  }
];

// Connect to MongoDB and seed the data
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('MongoDB Connected');
    
    // Check if call types already exist
    for (const callType of defaultCallTypes) {
      const existing = await CallType.findOne({ code: callType.code });
      
      if (!existing) {
        await CallType.create(callType);
        console.log(`Added call type: ${callType.name}`);
      } else {
        console.log(`Call type '${callType.name}' already exists, skipping`);
      }
    }
    
    console.log('Seed completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  }); 