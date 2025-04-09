let emailService;

try {
  emailService = require('./emailService');
  console.log('Email service module loaded successfully');
} catch (error) {
  console.error('Failed to load email service:', error.message);
  // Create a minimal fallback implementation
  emailService = {
    verifyEmailConfig: async () => false,
    sendEmail: async () => false,
    sendPasswordResetEmail: async () => false,
    sendMasterAdminInvitation: async () => false
  };
}

module.exports = {
  emailService
}; 