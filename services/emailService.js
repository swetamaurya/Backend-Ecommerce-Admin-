const nodemailer = require('nodemailer');
require('dotenv').config();

// Email configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // You can use other services like 'outlook', 'yahoo', etc.
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD  
    }
  });
};

// Alternative configuration for other email services
const createCustomTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER ,
      pass: process.env.EMAIL_PASSWORD 
    }
  });
};

// Email templates
const emailTemplates = {
  passwordReset: (resetToken, adminName = 'Admin') => {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/reset-password?token=${resetToken}`;
    
    return {
      subject: 'Admin Password Reset Request - Royal Thread',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - Royal Thread Admin</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background-color: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #3b82f6;
            }
            .content {
              margin-bottom: 30px;
            }
            .button {
              display: inline-block;
              background-color: #3b82f6;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 20px 0;
            }
            .button:hover {
              background-color: #2563eb;
            }
            .footer {
              border-top: 1px solid #eee;
              padding-top: 20px;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
            .warning {
              background-color: #fef3c7;
              border: 1px solid #f59e0b;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Royal Thread Admin</div>
              <p>Admin Password Reset</p>
            </div>
            
            <div class="content">
              <h2>Hello ${adminName},</h2>
              
              <p>We received a request to reset your admin password for the Royal Thread admin panel.</p>
              
              <p>Click the button below to reset your password:</p>
              
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password</a>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul>
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>For security, this link can only be used once</li>
                </ul>
              </div>
              
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 5px;">
                ${resetLink}
              </p>
              
              <p>If you continue to have problems, please contact your system administrator.</p>
            </div>
            
            <div class="footer">
              <p>This is an automated message from Royal Thread Admin Panel</p>
              <p>© ${new Date().getFullYear()} Royal Thread. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hello ${adminName},
        
        We received a request to reset your admin password for the Royal Thread admin panel.
        
        To reset your password, please click the following link:
        ${resetLink}
        
        Important:
        - This link will expire in 1 hour
        - If you didn't request this reset, please ignore this email
        - For security, this link can only be used once
        
        If you continue to have problems, please contact your system administrator.
        
        This is an automated message from Royal Thread Admin Panel
        © ${new Date().getFullYear()} Royal Thread. All rights reserved.
      `
    };
  },

  otpVerification: (otpCode, adminName = 'Admin') => {
    return {
      subject: 'OTP for Password Reset - Royal Thread Admin',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>OTP Verification - Royal Thread Admin</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background-color: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #3b82f6;
            }
            .otp-box {
              background-color: #f3f4f6;
              border: 2px solid #3b82f6;
              padding: 20px;
              text-align: center;
              border-radius: 10px;
              margin: 20px 0;
            }
            .otp-code {
              font-size: 32px;
              font-weight: bold;
              color: #3b82f6;
              letter-spacing: 5px;
              margin: 10px 0;
            }
            .warning {
              background-color: #fef3c7;
              border: 1px solid #f59e0b;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              border-top: 1px solid #eee;
              padding-top: 20px;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Royal Thread Admin</div>
              <p>OTP Verification for Password Reset</p>
            </div>
            
            <div class="content">
              <h2>Hello ${adminName},</h2>
              
              <p>You requested to reset your admin password. Please use the following OTP (One-Time Password) to verify your identity:</p>
              
              <div class="otp-box">
                <p><strong>Your OTP Code:</strong></p>
                <div class="otp-code">${otpCode}</div>
                <p><small>This code will expire in 10 minutes</small></p>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important Security Information:</strong>
                <ul>
                  <li>This OTP is valid for 10 minutes only</li>
                  <li>Do not share this code with anyone</li>
                  <li>If you didn't request this, please ignore this email</li>
                  <li>You have 3 attempts to enter the correct OTP</li>
                </ul>
              </div>
              
              <p>Enter this OTP code in the verification page to proceed with password reset.</p>
              
              <p>If you continue to have problems, please contact your system administrator.</p>
            </div>
            
            <div class="footer">
              <p>This is an automated message from Royal Thread Admin Panel</p>
              <p>© ${new Date().getFullYear()} Royal Thread. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hello ${adminName},
        
        You requested to reset your admin password. Please use the following OTP to verify your identity:
        
        Your OTP Code: ${otpCode}
        
        This code will expire in 10 minutes.
        
        Important Security Information:
        - This OTP is valid for 10 minutes only
        - Do not share this code with anyone
        - If you didn't request this, please ignore this email
        - You have 3 attempts to enter the correct OTP
        
        Enter this OTP code in the verification page to proceed with password reset.
        
        If you continue to have problems, please contact your system administrator.
        
        This is an automated message from Royal Thread Admin Panel
        © ${new Date().getFullYear()} Royal Thread. All rights reserved.
      `
    };
  }
};

// Send email function
const sendEmail = async (to, subject, html, text) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Royal Thread Admin" <${process.env.EMAIL_USER }>`,
      to: to,
      subject: subject,
      html: html,
      text: text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, adminName) => {
  try {
    const template = emailTemplates.passwordReset(resetToken, adminName);
    return await sendEmail(email, template.subject, template.html, template.text);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

// Send OTP email
const sendOtpEmail = async (email, otpCode, adminName) => {
  try {
    const template = emailTemplates.otpVerification(otpCode, adminName);
    return await sendEmail(email, template.subject, template.html, template.text);
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, error: error.message };
  }
};

// Test email configuration
const testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email configuration is valid');
    return { success: true, message: 'Email configuration is valid' };
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendOtpEmail,
  testEmailConfig,
  createTransporter,
  createCustomTransporter
};
