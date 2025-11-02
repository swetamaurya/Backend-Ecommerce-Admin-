const Product = require('../models/Product');
const { deleteImagesFromCloudinary } = require('./uploadController');

// Helper function to ensure image URLs are properly formatted
const formatImageUrls = (images) => {
  if (!images || !Array.isArray(images)) return images;
  
  return images.map(img => {
    // Cloudinary URLs are already properly formatted
    return {
      ...img,
      url: img.url
    };
  });
};

// Get all products (admin only)
const getAllProducts = async (req, res) => {
  try {
    const { page , limit , category, featured, search } = req.query;
    
    console.log('=== GET ALL PRODUCTS REQUEST ===');
    console.log('Query params:', { page, limit, category, featured, search });
    console.log('User:', req.user?.email);
    
    // Build base query
    let query = {};
    
    // Apply category filter
    if (category) {
      query.category = { $regex: new RegExp(category, 'i') };
    }
    
    // Apply featured filter
    if (featured === 'true') {
      query.isFeatured = true;
    }
    
    // Apply search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Product.countDocuments(query);
    console.log('Total products found:', total);
    
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    console.log('Products returned:', products.length);
    console.log('Product names:', products.map(p => p.name));

    // Add id field for frontend compatibility and format image URLs
    const productsWithId = products.map(product => ({
      ...product.toObject(),
      id: product._id,
      images: formatImageUrls(product.images)
    }));

    console.log('Response data:', {
      success: true,
      dataCount: productsWithId.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        hasNextPage: parseInt(page) < Math.ceil(total / limit),
        hasPrevPage: parseInt(page) > 1
      }
    });

    res.json({
      success: true,
      data: productsWithId,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        hasNextPage: parseInt(page) < Math.ceil(total / limit),
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({
      success: false,
      message: 'Server error fetching products',
      error: err.message
    });
  }
};

// Get product by ID (admin only)
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Add id field for frontend compatibility
    const productWithId = {
      ...product.toObject(),
      id: product._id
    };

    res.json({
      success: true,
      data: productWithId
    });
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({
      success: false,
      message: 'Server error fetching product',
      error: err.message
    });
  }
};


// Create product (admin only)
const createProduct = async (req, res) => {
  try {
    // console.log('=== CREATE PRODUCT REQUEST ===');
    // console.log('User:', req.user);
    // console.log('Request body:', req.body);
    // console.log('Category from body:', req.body.category);
    // console.log('Category type:', typeof req.body.category);
    // console.log('Category length:', req.body.category?.length);
    
    // Auth guard (route also protects, but double-check)
    // console.log('Auth check - req.user:', req.user);
    // console.log('Auth check - user role:', req.user?.role);
    
    if (!req.user || req.user.role !== 'admin') {
      console.log('Auth failed - user not admin or no user found');
      return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
    }

    const {
      name, description, category, brand, meterial,
      colors, sizes,
      price, mrp, stock,
      images, rating , reviewsCount,
      specialFeature, isActive, isFeatured
    } = req.body;

    // Required fields for simplified (non-variant) product
    // console.log('=== VALIDATION CHECK ===');
    // console.log('Name:', name, 'Type:', typeof name, 'Truthy:', !!name);
    // console.log('Description:', description, 'Type:', typeof description, 'Truthy:', !!description);
    // console.log('Category:', category, 'Type:', typeof category, 'Truthy:', !!category);
    // console.log('Material:', meterial, 'Type:', typeof meterial, 'Truthy:', !!meterial);
    // console.log('Price:', price, 'Type:', typeof price, 'Undefined:', price === undefined);
    // console.log('Stock:', stock, 'Type:', typeof stock, 'Undefined:', stock === undefined);
    
    // Check each field individually and collect missing fields with specific messages
    const missingFields = [];
    const fieldMessages = {
      name: 'Product Name',
      description: 'Description',
      category: 'Category',
      meterial: 'Material',
      price: 'Price',
      mrp: 'MRP',
      stock: 'Stock',
      specialFeature: 'Special Features',
      colors: 'Colors',
      sizes: 'Sizes',
      // reviewsCount: 'Reviews Count',
      // rating: 'Rating'
    };
    
    if (!name || !name.toString().trim()) {
      missingFields.push(fieldMessages.name);
    }
    if (!description || !description.toString().trim()) {
      missingFields.push(fieldMessages.description);
    }
    if (!category || !category.toString().trim()) {
      missingFields.push(fieldMessages.category);
    }
    if (!meterial || !meterial.toString().trim()) {
      missingFields.push(fieldMessages.meterial);
    }
    if (price === undefined || price === null || price === '') {
      missingFields.push(fieldMessages.price);
    }
    if (mrp === undefined || mrp === null || mrp === '') {
      missingFields.push(fieldMessages.mrp);
    }
    if (stock === undefined || stock === null || stock === '') {
      missingFields.push(fieldMessages.stock);
    }
    if (!specialFeature || !specialFeature.toString().trim()) {
      missingFields.push(fieldMessages.specialFeature);
    }
    if (!colors || !Array.isArray(colors) || colors.length === 0) {
      missingFields.push(fieldMessages.colors);
    }
    if (!sizes || !Array.isArray(sizes) || sizes.length === 0) {
      missingFields.push(fieldMessages.sizes);
    }
    
    
    if (missingFields.length > 0) {
      console.log('Validation failed - missing required fields:', missingFields);
      return res.status(400).json({
        success: false,
        message: `Please fill in: ${missingFields.join(', ')}`,
        missingFields: missingFields
      });
    }

    // Normalize images: accept string[] or object[]
    console.log('=== IMAGE PROCESSING DEBUG ===');
    console.log('Raw images from frontend:', JSON.stringify(images, null, 2));
    
    const processedImages = Array.isArray(images)
      ? images
          .filter(img => (typeof img === 'string' ? img.trim() : img?.url))
          .slice(0, 10)
          .map((img, idx) => {
            const processed = typeof img === 'string'
              ? { url: img.trim(), alt: `Product image ${idx + 1}`, isPrimary: idx === 0 }
              : {
                  url: img.url.trim(),
                  alt: img.alt?.trim() || `Product image ${idx + 1}`,
                  thumbnail: img.thumbnail?.trim(),
                  isPrimary: Boolean(img.isPrimary)
                };
            console.log(`Image ${idx}:`, processed);
            return processed;
          })
      : [];

    console.log('Processed images:', JSON.stringify(processedImages, null, 2));
    console.log('Primary images:', processedImages.filter(img => img.isPrimary === true));

    // CRITICAL FIX: Ensure only ONE image has isPrimary: true
    if (processedImages.length > 0) {
      const primaryImageIndex = processedImages.findIndex(img => img.isPrimary === true);
      const finalImages = processedImages.map((img, index) => ({
        ...img,
        isPrimary: index === (primaryImageIndex >= 0 ? primaryImageIndex : 0)
      }));
      processedImages.splice(0, processedImages.length, ...finalImages);
    }

    const doc = new Product({
      name: name.toString().trim(),
      description: description.toString().trim(),
      category: category.toString().trim(),
      brand: brand?.toString().trim() || 'Royal Thread',
      meterial: meterial.toString().trim(),
      colors: Array.isArray(colors) ? colors.map(c => c.toString().trim()).filter(Boolean) : [],
      sizes: Array.isArray(sizes) ? sizes.map(s => s.toString().trim()).filter(Boolean) : [],
      price: Number(price),
      mrp: mrp !== undefined ? Number(mrp) : Number(price),
      stock: parseInt(stock, 10),
      reviewsCount: Number(price),
      rating:Number(price),
      images: processedImages,
      specialFeature: specialFeature?.toString().trim() || '',
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : false
    });

    // Validate explicitly to return readable 400s
    try {
      await doc.validate();
    } catch (ve) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: ve.errors
          ? Object.fromEntries(Object.entries(ve.errors).map(([k, v]) => [k, v.message]))
          : ve.message
      });
    }

    await doc.save(); // pre-save will create slug and SKU
    // console.log('Product created successfully:', doc._id);
    // console.log('Product name:', doc.name);
    // console.log('Product slug:', doc.slug);
    // console.log('Product SKU:', doc.sku);
    // console.log('Product createdAt:', doc.createdAt);

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: doc
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error creating product', error: err.message });
  }
};


// Update product (admin only)
const updateProduct = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const {
      name, description, price, mrp, stock, images, category, brand, meterial,
      colors, sizes,rating, reviewsCount,

      variants, metaTitle, metaDescription, keywords, isActive, isFeatured, popularity, specialFeature
    } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Update basic fields
    if (name) product.name = name.trim();
    if (description) product.description = description.trim();
    if (price !== undefined) product.price = typeof price === 'number' ? price : parseFloat(price);
    if (mrp !== undefined) product.mrp = typeof mrp === 'number' ? mrp : parseFloat(mrp);
    if (stock !== undefined) product.stock = typeof stock === 'number' ? stock : parseInt(stock);
    if (category) product.category = category.trim();
    if (brand) product.brand = brand.trim();
    if (meterial) product.meterial = meterial.trim();
    if (specialFeature !== undefined) product.specialFeature = specialFeature.trim();
    if (metaTitle) product.metaTitle = metaTitle.trim();
    if (metaDescription) product.metaDescription = metaDescription.trim();
    if (keywords) product.keywords = Array.isArray(keywords) ? keywords : keywords.split(',').map(k => k.trim()).filter(k => k);
    if (variants) product.variants = variants;
    if (isActive !== undefined) product.isActive = isActive;
    if (isFeatured !== undefined) product.isFeatured = isFeatured;
    if (popularity !== undefined) product.popularity = typeof popularity === 'number' ? popularity : parseInt(popularity);
 
          if (rating !== undefined) product.rating = typeof rating === 'number' ? rating : parseFloat(rating);
          if (reviewsCount !== undefined) product.reviewsCount = typeof reviewsCount === 'number' ? reviewsCount : parseFloat(reviewsCount);

    // Update colors and sizes
    if (colors !== undefined) {
      product.colors = Array.isArray(colors) ? colors.map(c => c.toString().trim()).filter(Boolean) : [];
    }
    if (sizes !== undefined) {
      product.sizes = Array.isArray(sizes) ? sizes.map(s => s.toString().trim()).filter(Boolean) : [];
    }

    // Handle images - normalize to object array and delete old images
    if (images && Array.isArray(images)) {
      const fs = require('fs');
      const path = require('path');
      
      // Delete old images that are no longer in the new images array
      const oldImageUrls = product.images.map(img => img.url);
      const newImageUrls = images
        .filter(img => img && (typeof img === 'string' ? img.trim() : img?.url))
        .map(img => typeof img === 'string' ? img.trim() : img.url.trim());
      
      // Find images to delete
      const imagesToDelete = oldImageUrls.filter(url => !newImageUrls.includes(url));
      
      // Delete removed images from Cloudinary
      if (imagesToDelete.length > 0) {
        console.log('=== DELETING REMOVED IMAGES FROM CLOUDINARY ===');
        console.log('Images to delete:', imagesToDelete);
        
        try {
          const deleteResult = await deleteImagesFromCloudinary(imagesToDelete);
          console.log('Cloudinary deletion result:', deleteResult);
          
          if (deleteResult.failed && deleteResult.failed.length > 0) {
            console.warn('Some images could not be deleted from Cloudinary:', deleteResult.failed);
          }
        } catch (error) {
          console.error('Error deleting images from Cloudinary:', error);
          // Don't fail the update if image deletion fails
        }
      }
      
      // Debug: Log incoming images data
      console.log('=== UPDATE PRODUCT - INCOMING IMAGES ===');
      console.log('Raw images from frontend:', JSON.stringify(images, null, 2));

      // Process new images - preserve isPrimary from frontend
      const processedImages = images
        .filter(img => img && (typeof img === 'string' ? img.trim() : img?.url))
        .slice(0, 10)
        .map((img, index) => {
          const processed = typeof img === 'string'
            ? { url: img.trim(), alt: `Product image ${index + 1}`, isPrimary: index === 0 }
            : {
                url: img.url.trim(),
                alt: img.alt?.trim() || `Product image ${index + 1}`,
                thumbnail: img.thumbnail?.trim(),
                isPrimary: Boolean(img.isPrimary)
              };
          console.log(`Image ${index}:`, processed);
          return processed;
        });

      console.log('Processed images:', JSON.stringify(processedImages, null, 2));
      
      // CRITICAL FIX: Ensure only ONE image has isPrimary: true
      // Find the image that should be primary (first one with isPrimary: true)
      const primaryImageIndex = processedImages.findIndex(img => img.isPrimary === true);
      console.log('Primary image index found:', primaryImageIndex);
      
      // Reset all images to isPrimary: false, then set only one as primary
      const finalImages = processedImages.map((img, index) => ({
        ...img,
        isPrimary: index === primaryImageIndex
      }));
      
      console.log('Final images with single primary:', JSON.stringify(finalImages, null, 2));
      product.images = finalImages;
    }

    // Generate slug if name changed
    if (name) {
      product.slug = name.toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
    }

    await product.save();

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({
      success: false,
      message: 'Server error updating product',
      error: err.message
    });
  }
};

// Delete product (admin only)
const deleteProduct = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Find product first to get image paths
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete associated images from Cloudinary
    if (product.images && product.images.length > 0) {
      console.log('=== DELETING PRODUCT IMAGES FROM CLOUDINARY ===');
      console.log('Product images to delete:', product.images.map(img => img.url));
      
      try {
        const imageUrls = product.images.map(img => img.url);
        const deleteResult = await deleteImagesFromCloudinary(imageUrls);
        console.log('Cloudinary deletion result:', deleteResult);
        
        if (deleteResult.failed && deleteResult.failed.length > 0) {
          console.warn('Some images could not be deleted from Cloudinary:', deleteResult.failed);
        }
      } catch (error) {
        console.error('Error deleting images from Cloudinary:', error);
        // Don't fail the deletion if image cleanup fails
      }
    }

    // Delete product from database
    await Product.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Product and associated images deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({
      success: false,
      message: 'Server error deleting product',
      error: err.message
    });
  }
};

// ---------------- Public API functions for main website ----------------

const getPublicProducts = async (req, res) => {
  try {
    const { 
      page , 
      limit , 
      category, 
      search,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    let filter = { isActive: true }; // Only active products for public

    if (category) {
      filter.category = new RegExp(category, 'i');
    }

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { brand: new RegExp(search, 'i') }
      ];
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v') // Exclude version field
      .lean();

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limitNum);

    // Transform image URLs to include full backend URL
    // Production fallback for image serving
    let baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    
    // If we're on production and BASE_URL is not set, use the correct production URL
    if (!process.env.BASE_URL && req.get('host') && req.get('host').includes('onrender.com')) {
      baseUrl = 'https://backend-ecommerce-admin.onrender.com';
    }
    
    // Ensure baseUrl doesn't end with slash
    baseUrl = baseUrl.replace(/\/$/, '');
    
    console.log('=== IMAGE URL TRANSFORMATION ===');
    console.log('BASE_URL from env:', process.env.BASE_URL);
    console.log('Computed baseUrl:', baseUrl);
    console.log('Request host:', req.get('host'));
    const transformedProducts = products.map(product => ({
      ...product,
      images: formatImageUrls(product.images) || []
    }));

    res.json({
      success: true,
      data: transformedProducts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalProducts,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
        limit: limitNum
      }
    });

  } catch (error) {
    console.error('Error fetching public products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
};

const getPublicProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findOne({ 
      _id: id, 
      isActive: true 
    }).select('-__v').lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or inactive'
      });
    }

    // Transform image URLs to include full backend URL
    // Production fallback for image serving
    let baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    
    // If we're on production and BASE_URL is not set, use the correct production URL
    if (!process.env.BASE_URL && req.get('host') && req.get('host').includes('onrender.com')) {
      baseUrl = 'https://backend-ecommerce-admin.onrender.com';
    }
    
    console.log('=== IMAGE URL TRANSFORMATION ===');
    console.log('BASE_URL from env:', process.env.BASE_URL);
    console.log('Computed baseUrl:', baseUrl);
    console.log('Request host:', req.get('host'));
    const transformedProduct = {
      ...product,
      images: product.images?.map(img => {
        const fullUrl = img.url.startsWith('http') ? img.url : `${baseUrl}${img.url}`;
        console.log(`Single Product Image URL: ${img.url} -> ${fullUrl}`);
        return {
          ...img,
          url: fullUrl
        };
      }) || []
    };

    res.json({
      success: true,
      data: transformedProduct
    });

  } catch (error) {
    console.error('Error fetching public product:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message
    });
  }
};

const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { 
      page , 
      limit ,
      search,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    let filter = { 
      isActive: true,
      category: new RegExp(category, 'i')
    };

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { brand: new RegExp(search, 'i') }
      ];
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v')
      .lean();

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limitNum);

    // Transform image URLs to include full backend URL
    // Production fallback for image serving
    let baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    
    // If we're on production and BASE_URL is not set, use the correct production URL
    if (!process.env.BASE_URL && req.get('host') && req.get('host').includes('onrender.com')) {
      baseUrl = 'https://backend-ecommerce-admin.onrender.com';
    }
    
    // Ensure baseUrl doesn't end with slash
    baseUrl = baseUrl.replace(/\/$/, '');
    
    // console.log('=== IMAGE URL TRANSFORMATION ===');
    // console.log('BASE_URL from env:', process.env.BASE_URL);
    // console.log('Computed baseUrl:', baseUrl);
    // console.log('Request host:', req.get('host'));
    const transformedProducts = products.map(product => ({
      ...product,
      images: formatImageUrls(product.images) || []
    }));

    res.json({
      success: true,
      data: transformedProducts,
      category: category,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalProducts,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
        limit: limitNum
      }
    });

  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products by category',
      error: error.message
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  // Public API functions
  getPublicProducts,
  getPublicProductById,
  getProductsByCategory
};