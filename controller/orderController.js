const Order = require('../models/Order'); // Your Order Mongoose model
const { broadcastOrderUpdate } = require('./sseController');

// Get all orders (unified for both users and admins)
exports.getAllOrders = async (req, res) => {
  try {
    const { admin } = req.query;
    
    // Check if this is an admin request
    const isAdmin = admin === 'true' && req.user && req.user.role === 'admin';
    
    let orders;
    
    if (isAdmin) {
      // Admin can see all orders with user details
      orders = await Order.find()
        .populate('userId', 'name email')
        .sort({ createdAt: -1 });
    } else {
      // Regular users see all orders (public endpoint)
      orders = await Order.find().sort({ createdAt: -1 });
    }
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching orders' 
    });
  }
};

// Get orders by user ID
exports.getOrdersByUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.find({ userId: userId }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching orders' 
    });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const orderId = req.params.id;
    
    console.log('Fetching order with ID:', orderId, 'for user:', userId);
    
    // Try to find by _id first, then by orderId
    let order = await Order.findOne({ _id: orderId, userId: userId });
    
    if (!order) {
      order = await Order.findOne({ orderId: orderId, userId: userId });
    }
    
    if (!order) {
      console.log('Order not found for ID:', orderId);
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }
    
    console.log('Order found:', order.orderId);
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching order' 
    });
  }
};

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = req.user;
    
    // Get cart data
    const Cart = require('../models/Cart');
    const cart = await Cart.findOne({ user: userId });
    
    console.log('Cart data found:', {
      itemsCount: cart?.items?.length || 0,
      total: cart?.total || 0,
      items: cart?.items || []
    });
    
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Cart is empty' 
      });
    }

    // Generate order ID first
    const orderCount = await Order.countDocuments();
    const orderId = `ORD-${String(orderCount + 1).padStart(6, '0')}`;

    // Prepare order data
    const orderData = {
      orderId: orderId,
      userId: userId,
      customerName: req.body.customerName || user.name,
      customerEmail: req.body.customerEmail || user.email,
      customerPhone: req.body.customerPhone || user.mobile || '',
      shippingAddress: req.body.shippingAddress || {},
      items: cart.items.map(item => ({
        productId: item.product || item.productId,
        productName: item.title,
        price: item.price,
        quantity: item.quantity,
        image: item.image
      })),
      totalAmount: cart.total,
      discountAmount: req.body.discountAmount || 0,
      shippingAmount: req.body.shippingAmount || 0,
      taxAmount: req.body.taxAmount || 0,
      status: 'Order Received',
      paymentStatus: req.body.paymentStatus || 'Pending',
      paymentMethod: req.body.paymentMethod || 'COD',
      notes: req.body.notes || '',
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
    };

    console.log('Creating order with data:', {
      orderId: orderData.orderId,
      itemsCount: orderData.items.length,
      totalAmount: orderData.totalAmount,
      items: orderData.items.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price
      }))
    });
    
    const newOrder = new Order(orderData);
    await newOrder.save();

    console.log('Order created successfully:', {
      orderId: newOrder.orderId,
      itemsCount: newOrder.items.length,
      totalAmount: newOrder.totalAmount,
      items: newOrder.items
    });

    // Clear the cart after successful order creation
    cart.items = [];
    cart.total = 0;
    await cart.save();

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: newOrder
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error creating order' 
    });
  }
};

// Update order by ID
exports.updateOrder = async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedOrder) return res.status(404).json({ message: 'Order not found' });
    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ message: 'Server error updating order' });
  }
};

// Delete order by ID
exports.deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: 'Server error deleting order' });
  }
};

// Update order status (admin only)
exports.updateOrderStatus = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { orderId } = req.params;
    const { status, trackingNumber, notes, estimatedDelivery } = req.body;

    console.log('Admin updating order status:', {
      orderId,
      status,
      trackingNumber,
      notes,
      estimatedDelivery,
      estimatedDeliveryType: typeof estimatedDelivery
    });

    // Validate status
    const validStatuses = ['Pending','Cancelled', 'Returned', 'Order Received', 'Processing', 'Packed', 'Shipped', 'In Transit', 'Out for Delivery', 'Delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Find and update order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const oldStatus = order.status;
    order.status = status;
    
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (notes) order.notes = notes;
    if (estimatedDelivery) order.estimatedDelivery = new Date(estimatedDelivery);
    
    // Set delivered date if status is delivered
    if (status === 'Delivered') {
      order.deliveredAt = new Date();
    }

    await order.save();

    console.log('Order updated successfully:', {
      orderId: order.orderId,
      status: order.status,
      trackingNumber: order.trackingNumber,
      notes: order.notes,
      estimatedDelivery: order.estimatedDelivery,
      estimatedDeliveryType: typeof order.estimatedDelivery,
      deliveredAt: order.deliveredAt
    });

    // Broadcast update to user
    console.log('Broadcasting order update to user:', order.userId);
    console.log('Order data:', {
      orderId: order.orderId,
      status: order.status,
      trackingNumber: order.trackingNumber,
      notes: order.notes,
      estimatedDelivery: order.estimatedDelivery,
      deliveredAt: order.deliveredAt
    });
    
    broadcastOrderUpdate(order.userId, orderId, status, {
      orderId: order.orderId,
      status: order.status,
      trackingNumber: order.trackingNumber,
      notes: order.notes,
      estimatedDelivery: order.estimatedDelivery,
      deliveredAt: order.deliveredAt
    });

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        orderId: order.orderId,
        oldStatus,
        newStatus: status,
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery,
        notes: order.notes
      }
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating order status'
    });
  }
};

// Get order details (unified for both users and admins)
exports.getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { admin } = req.query;
    
    // Check if this is an admin request
    const isAdmin = admin === 'true' && req.user && req.user.role === 'admin';
    
    let order;
    
    if (isAdmin) {
      // Admin can see any order with full details
      order = await Order.findById(orderId)
        .populate('userId', 'name email mobile')
        .populate('items.productId', 'name images');
    } else {
      // Regular users can only see their own orders
      const userId = req.user.id;
      order = await Order.findOne({ 
        $or: [
          { _id: orderId, userId: userId },
          { orderId: orderId, userId: userId }
        ]
      })
      .populate('items.productId', 'name images');
    }
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching order details'
    });
  }
};

// Get order statistics (admin only)
exports.getOrderStats = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const stats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalOrders = await Order.countDocuments();
    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
    });

    res.json({
      success: true,
      data: {
        totalOrders,
        todayOrders,
        statusBreakdown: stats
      }
    });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching order statistics'
    });
  }
};
