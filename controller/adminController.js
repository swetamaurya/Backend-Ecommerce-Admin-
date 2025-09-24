const Admin = require('../models/Admin');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendPasswordResetEmail, sendOtpEmail, testEmailConfig } = require('../services/emailService');

// Admin controller - simplified for admin-only panel
exports.getAdminStats = async (req, res) => {
  try {
    const totalAdmins = await Admin.countDocuments();
    const activeAdmins = await Admin.countDocuments({ isActive: true });
    
    res.json({
      success: true,
      data: {
        message: 'Admin panel is ready',
        totalAdmins,
        activeAdmins,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching admin stats'
    });
  }
};

// Forgot Password functionality
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if admin exists
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    
    if (!admin) {
      // For security reasons, don't reveal if email exists or not
      return res.json({
        success: true,
        message: 'If the email exists, password reset instructions have been sent'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

    // Save reset token to admin using updateOne to avoid validation
    await Admin.updateOne(
      { _id: admin._id },
      {
        resetPasswordToken: resetToken,
        resetPasswordExpiry: resetTokenExpiry
      }
    );

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(email, resetToken, admin.name);
    
    if (emailResult.success) {
      console.log('Password reset email sent successfully to:', email);
    } else {
      console.error('Failed to send password reset email:', emailResult.error);
      // Still return success to user for security (don't reveal if email sending failed)
    }

    // Log token for development (remove in production)
    console.log('Password reset token for', email, ':', resetToken);
    console.log('Reset link: /admin/reset-password?token=' + resetToken);

    res.json({
      success: true,
      message: 'If the email exists, password reset instructions have been sent'
    });

  } catch (error) {
    console.error('Error in forgot password:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing forgot password request'
    });
  }
};

// Reset Password functionality
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    // Find admin with valid reset token
    const admin = await Admin.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password fields
    admin.password = newPassword; // Store plain password for simplicity
    admin.passwordHash = hashedPassword; // Store hashed password for authentication
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpiry = undefined;
    await admin.save();

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Error in reset password:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resetting password'
    });
  }
};

// Test email configuration
exports.testEmail = async (req, res) => {
  try {
    const result = await testEmailConfig();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Email configuration is working correctly'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Email configuration error',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error testing email configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Server error testing email configuration'
    });
  }
};

// Generate and send OTP for password reset
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if admin exists
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    
    if (!admin) {
      // For security reasons, don't reveal if email exists or not
      return res.json({
        success: true,
        message: 'If the email exists, OTP has been sent'
      });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 600000; // 10 minutes from now

    // Save OTP to admin
    await Admin.updateOne(
      { _id: admin._id },
      {
        otpCode: otpCode,
        otpExpiry: otpExpiry,
        otpAttempts: 0 // Reset attempts
      }
    );

    // Send OTP email
    const emailResult = await sendOtpEmail(email, otpCode, admin.name);
    
    if (emailResult.success) {
      console.log('OTP email sent successfully to:', email);
    } else {
      console.error('Failed to send OTP email:', emailResult.error);
    }

    // Log OTP for development (remove in production)
    console.log('OTP for', email, ':', otpCode);

    res.json({
      success: true,
      message: 'If the email exists, OTP has been sent',
      email: email // Return email for frontend to use in verification
    });

  } catch (error) {
    console.error('Error in send OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Server error sending OTP'
    });
  }
};

// Verify OTP and reset password
exports.verifyOtpAndResetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and new password are required'
      });
    }

    // Find admin with valid OTP
    const admin = await Admin.findOne({
      email: email.toLowerCase(),
      otpCode: otp,
      otpExpiry: { $gt: Date.now() }
    });

    if (!admin) {
      // Increment attempts if admin exists but OTP is wrong
      const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
      if (existingAdmin) {
        await Admin.updateOne(
          { _id: existingAdmin._id },
          { $inc: { otpAttempts: 1 } }
        );
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Check if too many attempts
    if (admin.otpAttempts >= 3) {
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP'
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password and clear OTP
    await Admin.updateOne(
      { _id: admin._id },
      {
        password: newPassword,
        passwordHash: hashedPassword,
        otpCode: null,
        otpExpiry: null,
        otpAttempts: 0
      }
    );

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Error in verify OTP and reset password:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resetting password'
    });
  }
};

// Verify OTP only (without resetting password)
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Find admin with valid OTP
    const admin = await Admin.findOne({
      email: email.toLowerCase(),
      otpCode: otp,
      otpExpiry: { $gt: Date.now() }
    });

    if (!admin) {
      // Increment attempts if admin exists but OTP is wrong
      const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
      if (existingAdmin) {
        await Admin.updateOne(
          { _id: existingAdmin._id },
          { $inc: { otpAttempts: 1 } }
        );
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Check if too many attempts
    if (admin.otpAttempts >= 3) {
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP'
      });
    }

    res.json({
      success: true,
      message: 'OTP verified successfully',
      email: email
    });

  } catch (error) {
    console.error('Error in verify OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Server error verifying OTP'
    });
  }
};