let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (error) {
  console.error('Failed to load nodemailer:', error.message);
  // Create a fallback version of nodemailer that doesn't crash the app
  nodemailer = {
    createTransport: () => ({
      verify: () => Promise.resolve(false),
      sendMail: () => Promise.resolve({ messageId: 'mock-email-id' })
    })
  };
}

// Get email configuration from environment variables
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = process.env.EMAIL_PORT || 587;
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@nectardesk.ai';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Create a transporter
const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_PORT === 465, // true for 465, false for other ports
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

// Test email configuration on startup
const verifyEmailConfig = async () => {
  try {
    // Skip verification if credentials are not available (development/testing)
    if (!EMAIL_USER || !EMAIL_PASS) {
      console.log('Email service: No credentials provided, skipping verification.');
      return false;
    }
    
    await transporter.verify();
    console.log('Email service: Ready to send emails');
    return true;
  } catch (error) {
    console.error('Email service configuration error:', error);
    return false;
  }
};

// Send email with provided options
const sendEmail = async (options) => {
  try {
    // Log email attempt
    console.log('Attempting to send email:');
    console.log(`- To: ${options.to}`);
    console.log(`- Subject: ${options.subject}`);
    console.log(`- Using EMAIL_HOST: ${EMAIL_HOST}`);
    console.log(`- Using EMAIL_PORT: ${EMAIL_PORT}`);
    console.log(`- Using EMAIL_FROM: ${EMAIL_FROM}`);
    console.log(`- Email credentials available: ${Boolean(EMAIL_USER && EMAIL_PASS)}`);
    
    // Skip sending if credentials are not available (development/testing)
    if (!EMAIL_USER || !EMAIL_PASS) {
      console.log('Email not sent (no credentials available):', options.subject);
      return false;
    }
    
    // Create the email object for sending
    const mailOptions = {
      from: `"AI Nectar Desk" <${EMAIL_FROM}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };
    
    console.log('Sending email with nodemailer...');
    const result = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:');
    console.log(`- Message ID: ${result.messageId}`);
    console.log(`- Response: ${JSON.stringify(result)}`);
    return true;
  } catch (error) {
    console.error('Error sending email:');
    console.error(`- Error name: ${error.name}`);
    console.error(`- Error message: ${error.message}`);
    if (error.stack) {
      console.error(`- Stack trace: ${error.stack}`);
    }
    return false;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (user, resetToken) => {
  try {
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4a69bd;">Reset Your Password</h2>
        <p>Hello ${user.firstName},</p>
        <p>We received a request to reset your password for your AI Nectar Desk account.</p>
        <p>To reset your password, click the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4a69bd; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p>If you didn't request this password reset, you can safely ignore this email.</p>
        <p>This link is valid for 1 hour.</p>
        <p>Thanks,<br/>The AI Nectar Desk Team</p>
      </div>
    `;
    
    const text = `
      Reset Your Password
      
      Hello ${user.firstName},
      
      We received a request to reset your password for your AI Nectar Desk account.
      
      To reset your password, visit this link:
      ${resetUrl}
      
      If you didn't request this password reset, you can safely ignore this email.
      
      This link is valid for 1 hour.
      
      Thanks,
      The AI Nectar Desk Team
    `;
    
    return await sendEmail({
      to: user.email,
      subject: 'Reset Your AI Nectar Desk Password',
      text,
      html
    });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};

// Send Master Admin invitation email
const sendMasterAdminInvitation = async (user, resetToken) => {
  try {
    const inviteUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}&welcome=true`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4a69bd;">Welcome to AI Nectar Desk</h2>
        <p>Hello ${user.firstName},</p>
        <p>You have been invited to join AI Nectar Desk as a Master Administrator.</p>
        <p>To set up your account password and get started, click the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="background-color: #4a69bd; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Set Up Your Account
          </a>
        </div>
        <p>This link is valid for 24 hours.</p>
        <p>Thanks,<br/>The AI Nectar Desk Team</p>
      </div>
    `;
    
    const text = `
      Welcome to AI Nectar Desk
      
      Hello ${user.firstName},
      
      You have been invited to join AI Nectar Desk as a Master Administrator.
      
      To set up your account password and get started, visit this link:
      ${inviteUrl}
      
      This link is valid for 24 hours.
      
      Thanks,
      The AI Nectar Desk Team
    `;
    
    return await sendEmail({
      to: user.email,
      subject: 'Welcome to AI Nectar Desk - Set Up Your Account',
      text,
      html
    });
  } catch (error) {
    console.error('Error sending master admin invitation email:', error);
    return false;
  }
};

module.exports = {
  verifyEmailConfig,
  sendEmail,
  sendPasswordResetEmail,
  sendMasterAdminInvitation
}; 