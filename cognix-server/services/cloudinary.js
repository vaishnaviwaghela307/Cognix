const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload image to Cloudinary
 * @param {Buffer|String} file - File buffer or base64 string
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
const uploadImage = async (file, options = {}) => {
  try {
    const defaultOptions = {
      folder: 'cognix/documents',
      resource_type: 'image',
      quality: 'auto:good',
      ...options
    };

    // If file is base64 string
    if (typeof file === 'string' && !file.startsWith('http')) {
      const base64Data = file.startsWith('data:') ? file : `data:image/jpeg;base64,${file}`;
      const result = await cloudinary.uploader.upload(base64Data, defaultOptions);
      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height
      };
    }

    // If file is a path or buffer
    const result = await cloudinary.uploader.upload(file, defaultOptions);
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Delete image from Cloudinary
 * @param {String} publicId - Cloudinary public ID
 * @returns {Promise<Object>} Deletion result
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      result: result.result
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Upload PDF document
 * @param {Buffer|String} file - File buffer or base64 string
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
const uploadDocument = async (file, options = {}) => {
  try {
    const defaultOptions = {
      folder: 'cognix/pdfs',
      resource_type: 'raw',
      ...options
    };

    const result = await cloudinary.uploader.upload(file, defaultOptions);
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    console.error('Cloudinary document upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  cloudinary,
  uploadImage,
  deleteImage,
  uploadDocument
};
