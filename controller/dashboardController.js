const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const Payment = require('../models/Payment');

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Get counts in parallel for better performance
    const [
      totalProducts,
      totalUsers,
      totalOrders,
      totalPayments,
      recentOrders,
      topProducts
    ] = await Promise.all([
      // Total counts
      Product.countDocuments(),
      User.countDocuments({ role: { $ne: 'admin' } }), // Exclude admin users
      Order.countDocuments(),
      Payment.countDocuments(),
      
      // Recent orders (last 5)
      Order.find()
        .populate('userId', 'name email mobile')
        .populate('items.productId', 'name price images')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      
      // Top products (most recent 5)
      Product.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    // Calculate total revenue from orders
    const revenueOrders = await Order.find({}, 'totalAmount').lean();
    const totalRevenue = revenueOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    res.json({
      success: true,
      data: {
        totalProducts,
        totalUsers,
        totalOrders,
        totalPayments,
        totalRevenue,
        recentOrders,
        topProducts
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardStats
};
