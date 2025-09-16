const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  paymentId: { type: String, unique: true, required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  paymentMethod: { 
    type: String, 
    enum: ['Credit Card', 'PayPal', 'Bank Transfer', 'Cash on Delivery', 'UPI', 'Wallet'],
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Completed', 'Failed', 'Refunded', 'Cancelled'], 
    default: 'Pending' 
  },
  transactionId: String,
  gateway: { 
    type: String, 
    enum: ['Stripe', 'PayPal', 'Razorpay', 'PayU', 'COD', 'UPI'],
    required: true 
  },
  fees: { type: Number, default: 0 },
  processedAt: Date,
  refundedAt: Date,
  refundAmount: Number,
  gatewayResponse: mongoose.Schema.Types.Mixed,
  notes: String
}, { timestamps: true });

// Generate payment ID before saving
PaymentSchema.pre('save', async function(next) {
  if (!this.paymentId) {
    const count = await mongoose.model('Payment').countDocuments();
    this.paymentId = `PAY${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model("Payment", PaymentSchema);
