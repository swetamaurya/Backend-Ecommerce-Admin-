// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    // Basic
    name: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, unique: true, index: true },
    description: { type: String, required: true },

    // Catalog
    category: {
      type: String,
      enum: [
        'Area Rugs',
        'Bath Mats',
        'Bedside Runners',
        'Cotton Yoga Mats',
        // 'Mats Collection',
        'Aasan Mats',
        'In Door Mats',
        'Out Door Mats',
        'Animal Rugs',
       
      ],
      default: '',
      index: true
    },
    brand: { type: String, default: 'Royal Thread', index: true },
    meterial: { type: String, required: true },

    // Options (simple products)
    colors: { type: [String], default: [] },   // e.g., ["Blue","Gray"]
    sizes:  { type: [String], default: [] },   // e.g., ["Small","Large"]

    // Pricing/Inventory (single SKU inventory)
    price: { type: Number, min: 0, required: true },
    mrp: { type: Number, min: 0, default: 0 },
    stock: { type: Number, default: 0 },

    // Media
    images: [
      {
        url: { type: String, required: true },
        alt: { type: String, default: '' },
        thumbnail: { type: String },
        isPrimary: { type: Boolean, default: false }
      }
    ],

    // Flags
    specialFeature: { type: String, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },

    // Product-level SKU (auto)
    sku: { type: String, unique: true, index: true }
  },
  { timestamps: true }
);

/* ---------- Virtuals ---------- */
productSchema.virtual('primaryImage').get(function () {
  const primary = this.images?.find(i => i.isPrimary);
  return primary || (Array.isArray(this.images) && this.images.length ? this.images : null);
}); [2]

productSchema.virtual('thumbnail').get(function () {
  const p = this.images?.find(i => i.isPrimary) || (Array.isArray(this.images) ? this.images : null);
  if (!p) return null;
  return p.thumbnail || p.url;
}); [2]

/* ---------- Atomic counter for product SKU ---------- */
async function getNextSequence(conn, name) {
  const Counter = conn.model(
    'Counter',
    new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } }, { versionKey: false }),
    'counters'
  );
  const doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  ).lean();
  return doc.seq;
}

/* ---------- Pre-save: slug + SKU + mrp guard ---------- */
productSchema.pre('save', async function () {
  if (!this.slug && this.name) {
    this.slug = this.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  if (!this.sku) {
    const seq = await getNextSequence(this.constructor.db, 'product_sku');
    this.sku = `SKU${String(seq).padStart(5, '0')}`;
  }

  if (!this.mrp || this.mrp < this.price) {
    this.mrp = Math.max(this.price, this.mrp || 0);
  }
});

/* ---------- Inventory helper ---------- */
productSchema.statics.decrementProductStock = function (productId, qty) {
  return this.updateOne(
    { _id: productId, stock: { $gte: qty } },
    { $inc: { stock: -qty } }
  );
};

module.exports = mongoose.model('Product', productSchema);
