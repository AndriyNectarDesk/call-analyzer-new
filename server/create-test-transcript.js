require('dotenv').config();
const mongoose = require('mongoose');
const Transcript = require('./models/transcript');
const Organization = require('./models/organization');
const User = require('./models/user');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.log('MongoDB Connection Error:', err);
    process.exit(1);
  });

async function createTestTranscript() {
  try {
    console.log('Creating test transcript...');
    
    // Find master organization
    const organization = await Organization.findOne({ isMaster: true });
    if (!organization) {
      console.error('No master organization found');
      return;
    }
    console.log(`Using organization: ${organization.name} (${organization._id})`);
    
    // Find an admin user
    const user = await User.findOne({ role: 'admin' });
    if (!user) {
      console.error('No admin user found');
      return;
    }
    console.log(`Using user: ${user.email} (${user._id})`);
    
    // Sample transcript data
    const sampleTranscript = {
      rawTranscript: "Agent: Thank you for calling NectarDesk, how may I help you today?\nCaller: I'd like to place an order for a dozen roses.\nAgent: Certainly, I'd be happy to help you with that. May I have your name please?\nCaller: My name is John Smith.\nAgent: Thank you, Mr. Smith. Are these roses for a special occasion?\nCaller: Yes, it's for my wife's birthday tomorrow.\nAgent: That's wonderful. We have several rose arrangements available. Would you prefer just roses or a mixed bouquet?\nCaller: Just roses would be perfect.\nAgent: Great choice. We have red, pink, white, and yellow roses. Do you have a color preference?\nCaller: Red roses, please.\nAgent: Excellent. Would you like to add a vase for an additional $15?\nCaller: Yes, that would be great.\nAgent: Perfect. Now, could I get the delivery address?\nCaller: It's 123 Main Street, Apartment 4B, New York, NY 10001.\nAgent: Thank you. And when would you like these delivered?\nCaller: Tomorrow afternoon, if possible.\nAgent: We can definitely do that. We have delivery slots available between 1-3pm or 3-5pm tomorrow.\nCaller: The 1-3pm slot would be perfect.\nAgent: Great. Would you like to include a gift message?\nCaller: Yes, please write 'Happy Birthday, Sarah. Love always, John.'\nAgent: I've got that noted. Now, the total for a dozen red roses with a vase and delivery will be $89.99. How would you like to pay for that today?\nCaller: I'll pay with my credit card.\nAgent: Perfect. I can take that information now if you're ready.\nCaller: Ready.\nAgent: Great, please provide your card number when you're ready.\nCaller: [Provides payment information]\nAgent: Thank you. Your order has been processed successfully. You'll receive a confirmation email shortly with your order details and tracking information. Is there anything else I can help you with today?\nCaller: No, that's all. Thank you for your help.\nAgent: You're very welcome, Mr. Smith. Thank you for choosing NectarDesk Flowers. Have a wonderful day!",
      source: 'test',
      callType: 'flower',
      organizationId: organization._id,
      createdBy: user._id,
      analysis: {
        callSummary: {
          agentName: "NectarDesk Agent",
          customerName: "John Smith",
          orderType: "Dozen red roses with vase",
          deliveryAddress: "123 Main Street, Apartment 4B, New York, NY 10001",
          totalValue: "$89.99",
          specialInstructions: "Gift message: 'Happy Birthday, Sarah. Love always, John.'"
        },
        agentPerformance: {
          strengths: [
            "Professional and courteous throughout the call",
            "Efficiently guided the customer through the ordering process",
            "Provided clear options and pricing information"
          ],
          areasForImprovement: [
            "Could have offered additional items like chocolates or greeting cards",
            "Didn't mention any special birthday arrangements or discounts",
            "Could have verified the spelling of names for the gift message"
          ]
        },
        improvementSuggestions: [
          "Offer complementary add-ons like chocolates, balloons, or greeting cards",
          "Mention available birthday-specific flower arrangements",
          "Create a follow-up reminder to check if the customer was satisfied with the delivery"
        ],
        scorecard: {
          customerService: 9,
          productKnowledge: 8,
          processEfficiency: 9,
          problemSolving: 8,
          overallScore: 8.5
        }
      }
    };
    
    // Create the transcript
    const transcript = new Transcript(sampleTranscript);
    await transcript.save();
    
    console.log(`Test transcript created with ID: ${transcript._id}`);
    
    // Update organization transcript count
    await Organization.findByIdAndUpdate(
      organization._id,
      { $inc: { 'usageStats.totalTranscripts': 1 } }
    );
    
    console.log('Organization transcript count updated');
    
    mongoose.disconnect();
    console.log('Done');
  } catch (error) {
    console.error('Error creating test transcript:', error);
    mongoose.disconnect();
    process.exit(1);
  }
}

createTestTranscript(); 