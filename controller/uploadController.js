const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const crypto = require('crypto');

// Configure Cloudinary
// Cloudinary will automatically use CLOUDINARY_URL environment variable
// No need to manually configure individual parameters

// Simple in-memory cache to prevent rapid duplicate uploads
const uploadCache = new Map();
const CACHE_DURATION = 30000; // 30 seconds

// Clean up expired cache entries
const cleanupCache = () => {
  const now = Date.now();
  for (const [key, value] of uploadCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      uploadCache.delete(key);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupCache, 5 * 60 * 1000);

// Function to generate unique identifier for images
const generateImageHash = (imageData) => {
  if (imageData.startsWith('data:image/')) {
    // For base64 data, hash the actual image content
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    return crypto.createHash('md5').update(base64Data).digest('hex');
  } else if (Buffer.isBuffer(imageData)) {
    // For buffer data (file uploads)
    return crypto.createHash('md5').update(imageData).digest('hex');
  }
  return null;
};

// Function to extract Cloudinary public ID from URL
const extractPublicIdFromUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) {
    return null;
  }
  
  try {
    // Extract public ID from Cloudinary URL
    // Format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
    const match = url.match(/\/upload\/v\d+\/([^\.]+)/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error extracting public ID from URL:', url, error);
    return null;
  }
};


// Function to delete multiple images from Cloudinary
const deleteImagesFromCloudinary = async (imageUrls) => {
  if (!imageUrls || imageUrls.length === 0) {
    return { success: true, deleted: [] };
  }

  const results = [];
  
  for (const url of imageUrls) {
    const publicId = extractPublicIdFromUrl(url);
    
    if (publicId) {
      try {
        const result = await cloudinary.uploader.destroy(publicId);
        results.push({
          url,
          publicId,
          success: result.result === 'ok',
          result: result.result
        });
        
        if (result.result === 'ok') {
          console.log(`✅ Deleted image from Cloudinary: ${publicId}`);
        } else {
          console.log(`⚠️ Image not found or already deleted: ${publicId}`);
        }
      } catch (error) {
        console.error(`❌ Error deleting image ${publicId}:`, error);
        results.push({
          url,
          publicId,
          success: false,
          error: error.message
        });
      }
    } else {
      console.log(`⚠️ Could not extract public ID from URL: ${url}`);
      results.push({
        url,
        publicId: null,
        success: false,
        error: 'Could not extract public ID from URL'
      });
    }
  }
  
  return {
    success: true,
    deleted: results.filter(r => r.success),
    failed: results.filter(r => !r.success)
  };
};

// Configure multer for memory storage (we'll upload to Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Cloudinary upload handler with duplicate prevention
const uploadImage = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    console.log('=== UPLOAD REQUEST DEBUG ===');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Request file:', req.file ? 'Present' : 'Not present');
    console.log('Image data present:', req.body.imageData ? 'Yes' : 'No');

    // Handle both file upload and base64 data
    let uploadResult;
    let imageHash = null;
    let imageData = null;
    
    // Extract image data for hash generation
    if (req.file) {
      imageData = req.file.buffer;
    } else if (req.body.imageData) {
      imageData = req.body.imageData;
    }
    
    if (imageData) {
      imageHash = generateImageHash(imageData);
      
      // Check cache for recent uploads
      const cacheKey = imageHash;
      const cachedResult = uploadCache.get(cacheKey);
      
      if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_DURATION) {
        console.log('🚫 Duplicate upload prevented by cache');
        return res.json({
          success: true,
          message: 'Duplicate upload prevented',
          data: {
            ...cachedResult.data,
            isDuplicate: true,
            fromCache: true
          }
        });
      }
    }
    
    if (req.file) {
      // Handle file upload via multer
      imageHash = generateImageHash(req.file.buffer);
      
      console.log('=== FILE UPLOAD DEBUG ===');
      console.log('File size:', req.file.size);
      console.log('File mimetype:', req.file.mimetype);
      console.log('Generated hash:', imageHash);
      
      // Generate unique public ID based on image hash
      const publicId = `admin-panel/products/${imageHash}`;
      console.log('Public ID:', publicId);
      
      // Check if image already exists in Cloudinary
      try {
        const existingImage = await cloudinary.api.resource(publicId);
        if (existingImage) {
          console.log('✅ Image already exists in Cloudinary, returning existing URL');
          return res.json({
            success: true,
            message: 'Image already exists in Cloudinary',
            data: {
              url: existingImage.secure_url,
              publicId: existingImage.public_id,
              imageHash: imageHash,
              format: existingImage.format,
              size: existingImage.bytes,
              width: existingImage.width,
              height: existingImage.height,
              isDuplicate: true
            }
          });
        }
      } catch (error) {
        // Image doesn't exist, proceed with upload
        console.log('Image does not exist in Cloudinary, proceeding with upload');
      }
      
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          overwrite: true, // This will replace existing image with same public_id
          resource_type: 'auto',
          transformation: [
            { width: 800, height: 800, crop: 'limit' },
            { quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return res.status(500).json({
              success: false,
              message: 'Error uploading image to Cloudinary',
              error: error.message
            });
          }
          
          console.log('=== CLOUDINARY UPLOAD SUCCESS ===');
          console.log('Image Hash:', imageHash);
          console.log('Public ID:', result.public_id);
          console.log('Secure URL:', result.secure_url);
          console.log('Format:', result.format);
          console.log('Size:', result.bytes);
          
          const responseData = {
            url: result.secure_url,
            publicId: result.public_id,
            imageHash: imageHash,
            format: result.format,
            size: result.bytes,
            width: result.width,
            height: result.height
          };
          
          // Cache the result
          uploadCache.set(imageHash, {
            data: responseData,
            timestamp: Date.now()
          });
          
          res.json({
            success: true,
            message: 'Image uploaded successfully to Cloudinary',
            data: responseData
          });
        }
      );
      
      uploadStream.end(req.file.buffer);
      
    } else if (req.body.imageData) {
      // Handle base64 data
      const { imageData, filename } = req.body;
      
      if (!imageData.startsWith('data:image/')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid image format. Please provide base64 image data.'
        });
      }

      imageHash = generateImageHash(imageData);
      
      console.log('=== BASE64 UPLOAD DEBUG ===');
      console.log('Base64 data length:', imageData.length);
      console.log('Generated hash:', imageHash);
      
      // Generate unique public ID based on image hash
      const publicId = `admin-panel/products/${imageHash}`;
      console.log('Public ID:', publicId);
      
      // Check if image already exists in Cloudinary
      try {
        const existingImage = await cloudinary.api.resource(publicId);
        if (existingImage) {
          console.log('✅ Image already exists in Cloudinary, returning existing URL');
          return res.json({
            success: true,
            message: 'Image already exists in Cloudinary',
            data: {
              url: existingImage.secure_url,
              publicId: existingImage.public_id,
              imageHash: imageHash,
              format: existingImage.format,
              size: existingImage.bytes,
              width: existingImage.width,
              height: existingImage.height,
              isDuplicate: true
            }
          });
        }
      } catch (error) {
        // Image doesn't exist, proceed with upload
        console.log('Image does not exist in Cloudinary, proceeding with upload');
      }

      try {
        uploadResult = await cloudinary.uploader.upload(imageData, {
          public_id: publicId,
          overwrite: true, // This will replace existing image with same public_id
          resource_type: 'auto',
          transformation: [
            { width: 800, height: 800, crop: 'limit' },
            { quality: 'auto' }
          ]
        });
        
        console.log('=== CLOUDINARY BASE64 UPLOAD SUCCESS ===');
        console.log('Image Hash:', imageHash);
        console.log('Public ID:', uploadResult.public_id);
        console.log('Secure URL:', uploadResult.secure_url);
        console.log('Format:', uploadResult.format);
        console.log('Size:', uploadResult.bytes);
        
        const responseData = {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          imageHash: imageHash,
          format: uploadResult.format,
          size: uploadResult.bytes,
          width: uploadResult.width,
          height: uploadResult.height
        };
        
        // Cache the result
        uploadCache.set(imageHash, {
          data: responseData,
          timestamp: Date.now()
        });
        
        res.json({
          success: true,
          message: 'Image uploaded successfully to Cloudinary',
          data: responseData
        });
        
      } catch (uploadError) {
        console.error('Cloudinary base64 upload error:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Error uploading base64 image to Cloudinary',
          error: uploadError.message
        });
      }
      
    } else {
      return res.status(400).json({
        success: false,
        message: 'No image data provided. Please provide either a file upload or base64 image data.'
      });
    }

  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      message: 'Server error uploading image',
      error: error.message
    });
  }
};



// Delete image from Cloudinary
const deleteImage = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { publicId } = req.params;
    
    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result === 'ok') {
        res.json({
          success: true,
          message: 'Image deleted successfully from Cloudinary',
          data: {
            publicId: publicId,
            result: result.result
          }
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Image not found or already deleted',
          data: {
            publicId: publicId,
            result: result.result
          }
        });
      }
    } catch (deleteError) {
      console.error('Cloudinary delete error:', deleteError);
      return res.status(500).json({
        success: false,
        message: 'Error deleting image from Cloudinary',
        error: deleteError.message
      });
    }

  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting image',
      error: error.message
    });
  }
};

module.exports = {
  uploadImage,
  deleteImage,
  upload, // Export multer middleware for use in routes
  deleteImagesFromCloudinary, // Export helper function for bulk deletion
  extractPublicIdFromUrl, // Export helper function for public ID extraction
  generateImageHash // Export helper function for hash generation
};
