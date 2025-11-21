const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;
const path = require('path');

/**
 * Initialize Cloudinary with tenant-specific credentials
 */
const initializeCloudinary = (cloudName, apiKey, apiSecret) => {
  try {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    return true;
  } catch (error) {
    console.error('Error initializing Cloudinary:', error);
    return false;
  }
};

/**
 * Upload file to Cloudinary
 * @param {String} filePath - Local file path
 * @param {Object} options - Upload options (folder, resource_type, etc.)
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadToCloudinary = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: options.folder || 'zent-erp',
      resource_type: options.resource_type || 'auto',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      ...options,
    });

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Upload file buffer to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {String} originalName - Original filename
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadBufferToCloudinary = async (buffer, originalName, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'zent-erp',
        resource_type: options.resource_type || 'auto',
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        ...options,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
          });
        }
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Delete file from Cloudinary
 * @param {String} publicId - Cloudinary public ID
 * @returns {Promise<Object>} Deletion result
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      result: result.result,
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

/**
 * Test Cloudinary connection
 * @param {String} cloudName - Cloudinary cloud name
 * @param {String} apiKey - Cloudinary API key
 * @param {String} apiSecret - Cloudinary API secret
 * @returns {Promise<Object>} Test result
 */
const testCloudinaryConnection = async (cloudName, apiKey, apiSecret) => {
  try {
    // Temporarily configure Cloudinary
    const originalConfig = { ...cloudinary.config() };
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    // Test by trying to ping the API
    const result = await cloudinary.api.ping();
    
    // Restore original config
    cloudinary.config(originalConfig);

    return {
      success: true,
      message: 'Cloudinary connection successful',
      status: result.status,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to connect to Cloudinary',
      error: error.message,
    };
  }
};

module.exports = {
  initializeCloudinary,
  uploadToCloudinary,
  uploadBufferToCloudinary,
  deleteFromCloudinary,
  testCloudinaryConnection,
};

