const mongoose = require('mongoose');
const dns = require('dns');

const checkDNS = (hostname) => {
  return new Promise((resolve) => {
    dns.resolve(hostname, (err) => {
      if (err) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
    // Timeout DNS lookup after 2 seconds
    setTimeout(() => resolve(false), 2000);
  });
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  const localUri = 'mongodb://127.0.0.1:27017/rbw';

  if (uri) {
    try {
      console.log(`Connecting to MongoDB Atlas...`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      });
      console.log(`MongoDB Connected (Atlas): ${mongoose.connection.host}`);
      return;
    } catch (error) {
      console.error(`MongoDB Atlas Connection Failed: ${error.message}`);
    }
  } else {
    console.log(`MONGODB_URI not defined. Bypassing Atlas.`);
  }

  console.log(`Attempting connection to local MongoDB...`);
  try {
    await mongoose.connect(localUri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000
    });
    console.log(`MongoDB Connected (Local): ${mongoose.connection.host}`);
  } catch (localError) {
    console.error(`Local MongoDB Connection Failed: ${localError.message}`);
    console.error(`Proceeding without database connection (endpoints will error but server will remain up)`);
  }
};

module.exports = connectDB;
