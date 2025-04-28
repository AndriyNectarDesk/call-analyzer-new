let emailService;
let schedulerService;

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
    sendMasterAdminInvitation: async () => false,
    sendTestEmail: async () => false
  };
}

try {
  schedulerService = require('./schedulerService');
  console.log('Scheduler service module loaded successfully');
} catch (error) {
  console.error('Failed to load scheduler service:', error.message);
  // Create a minimal fallback implementation
  schedulerService = {
    initializeScheduler: () => {},
    scheduleJob: () => false,
    stopJob: () => false,
    runJobNow: async () => false,
    getScheduledJobs: () => []
  };
}

module.exports = {
  emailService,
  schedulerService
}; 