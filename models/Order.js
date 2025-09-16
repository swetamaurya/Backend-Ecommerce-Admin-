const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String, required: true },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    image: String
  }],
  totalAmount: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  shippingAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['Pending','Cancelled', 'Returned', 'Order Received', 'Processing', 'Packed', 'Shipped', 'In Transit', 'Out for Delivery', 'Delivered'],
    default: 'Pending' 
  },
  paymentStatus: { 
    type: String, 
    enum: ['Pending', 'Paid', 'Failed', 'Refunded','COD' ],
    default: 'Pending' 
  },
  paymentMethod: { type: String, required: true },
  trackingNumber: String,
  notes: String,
  estimatedDelivery: Date,
  deliveredAt: Date
}, { timestamps: true });

// Generate order ID before saving
orderSchema.pre('save', async function(next) {
  if (!this.orderId) {
    try {
      const count = await mongoose.model('Order').countDocuments();
      this.orderId = `ORD-${String(count + 1).padStart(6, '0')}`;
      console.log('Generated orderId:', this.orderId);
    } catch (error) {
      console.error('Error generating orderId:', error);
      // Fallback orderId
      this.orderId = `ORD-${Date.now()}`;
    }
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
