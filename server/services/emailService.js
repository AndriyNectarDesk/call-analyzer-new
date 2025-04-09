const nodemailer = require('nodemailer');

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
  // Skip verification if credentials are not available (development/testing)
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.log('Email service: No credentials provided, skipping verification.');
    return false;
  }
  
  try {
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
  // Skip sending if credentials are not available (development/testing)
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.log('Email not sent (development mode):', options.subject);
    return false;
  }
  
  try {
    const result = await transporter.sendMail({
      from: `"AI Nectar Desk" <${EMAIL_FROM}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    });
    
    console.log('Email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (user, resetToken) => {
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
};

module.exports = {
  verifyEmailConfig,
  sendEmail,
  sendPasswordResetEmail
}; 