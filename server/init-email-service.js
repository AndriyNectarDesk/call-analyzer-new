const { emailService } = require('./services');

const initEmailService = async () => {
  console.log('\n====== INITIALIZING EMAIL SERVICE ======');
  
  // Log environment variables
  console.log('Email Environment Variables:');
  console.log(`- EMAIL_HOST: ${process.env.EMAIL_HOST || 'not set (default: smtp.gmail.com)'}`);
  console.log(`- EMAIL_PORT: ${process.env.EMAIL_PORT || 'not set (default: 587)'}`);
  console.log(`- EMAIL_USER: ${process.env.EMAIL_USER ? 'set' : 'not set'}`);
  console.log(`- EMAIL_PASS: ${process.env.EMAIL_PASS ? 'set' : 'not set'}`);
  console.log(`- EMAIL_FROM: ${process.env.EMAIL_FROM || 'not set (default: noreply@nectardesk.ai)'}`);
  console.log(`- FRONTEND_URL: ${process.env.FRONTEND_URL || 'not set (default: http://localhost:3000)'}`);
  
  try {
    const isConfigured = await emailService.verifyEmailConfig();
    
    if (isConfigured) {
      console.log('✅ Email service is configured and ready');
    } else {
      console.log('❌ Email service verification failed');
      console.log('Email functionality (password reset, invitations) will not work');
      
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('\nMissing email credentials. To enable email functionality, add these environment variables:');
        console.log('- EMAIL_USER: Your email address/username');
        console.log('- EMAIL_PASS: Your email password or app password');
        
        if (process.env.EMAIL_HOST && process.env.EMAIL_HOST.includes('gmail')) {
          console.log('\nFor Gmail, you need to:');
          console.log('1. Enable 2-Step Verification in your Google Account');
          console.log('2. Create an App Password at https://myaccount.google.com/apppasswords');
          console.log('3. Use that App Password as EMAIL_PASS');
        }
      }
    }
  } catch (error) {
    console.error('Error initializing email service:', error);
    console.log('The application will continue without email functionality');
  }
  
  console.log('===========================================\n');
};

module.exports = initEmailService; 