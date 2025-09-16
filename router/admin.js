const express = require('express');
const {
  getAdminStats,
  forgotPassword,
  resetPassword,
  testEmail,
  sendOtp,
  verifyOtp,
  verifyOtpAndResetPassword
} = require('../controller/adminController');
const User = require('../models/User');
// const adminAuth = require('../middilware/adminAuth');
const router = express.Router();

// Apply admin authentication to all routes
// router.use(adminAuth);

// Get admin stats
router.get('/stats', getAdminStats);

// Forgot password routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// OTP routes
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/verify-otp-reset-password', verifyOtpAndResetPassword);

// Test email configuration
router.get('/test-email', testEmail);

// Get all users (for admin dashboard) - exclude admin users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;

    // Build filter object
    let filter = { role: { $ne: 'admin' } };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter, 'name email mobile role createdAt isActive')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      success: true,
      data: users,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalUsers,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

// Block/Unblock user
router.put('/users/:id/block', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Toggle isActive status
    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: user.isActive ? 'User unblocked successfully' : 'User blocked successfully',
      data: {
        userId: user._id,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Error toggling user block status:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling user block status'
    });
  }
});

module.exports = router;
