const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const cloudinary = require('./config/cloudinary');

console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API Key:", process.env.CLOUDINARY_API_KEY);

cloudinary.uploader.upload('../logo.png', { folder: 'test-antigravity' })
  .then(result => {
    console.log("SUCCESS! Secure URL:", result.secure_url);
    process.exit(0);
  })
  .catch(err => {
    console.error("UPLOAD FAILED:", err);
    process.exit(1);
  });
