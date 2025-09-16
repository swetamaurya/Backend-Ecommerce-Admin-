const express = require('express');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const User = require('../models/User');
const router = express.Router();

// Get all payments (for admin dashboard)
router.get('/getAll', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, method, search } = req.query;
    const skip = (page - 1) * limit;

    // Build filter object
    let filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (method && method !== 'all') {
      filter.paymentMethod = method;
    }
    if (search) {
      filter.$or = [
        { paymentId: { $regex: search, $options: 'i' } },
        { transactionId: { $regex: search, $options: 'i' } },
        { 'user.name': { $regex: search, $options: 'i' } }
      ];
    }

    const payments = await Payment.find(filter)
      .populate('order', 'orderNumber totalAmount')
      .populate('user', 'name email mobile')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalPayments = await Payment.countDocuments(filter);
    const totalPages = Math.ceil(totalPayments / limit);

    res.json({
      success: true,
      data: payments,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPayments,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payments'
    });
  }
});

// Get payment by ID
router.get('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('order', 'orderNumber totalAmount items')
      .populate('user', 'name email mobile address');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment'
    });
  }
});

// Update payment status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        ...(status === 'Completed' && { processedAt: new Date() }),
        ...(status === 'Refunded' && { refundedAt: new Date() })
      },
      { new: true }
    ).populate('order', 'orderNumber').populate('user', 'name email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: payment
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payment status'
    });
  }
});

// Refund payment
router.post('/:id/refund', async (req, res) => {
  try {
    const { refundAmount, reason } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed payments can be refunded'
      });
    }

    const refund = await Payment.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'Refunded',
        refundedAt: new Date(),
        refundAmount: refundAmount || payment.amount,
        notes: reason || 'Payment refunded'
      },
      { new: true }
    ).populate('order', 'orderNumber').populate('user', 'name email');

    res.json({
      success: true,
      message: 'Payment refunded successfully',
      data: refund
    });
  } catch (error) {
    console.error('Error refunding payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error refunding payment'
    });
  }
});

module.exports = router;
