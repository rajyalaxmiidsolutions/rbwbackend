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

  // Extract hostname from mongodb+srv URI
  let hostname = '';
  if (uri) {
    const match = uri.match(/@([^/?#:]+)/);
    if (match) {
      hostname = match[1];
    }
  }

  let useAtlas = false;
  if (hostname) {
    console.log(`Checking DNS resolution for MongoDB Atlas (${hostname})...`);
    useAtlas = await checkDNS(hostname);
  }

  if (useAtlas) {
    try {
      console.log(`Connecting to MongoDB Atlas...`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 4000,
        connectTimeoutMS: 4000
      });
      console.log(`MongoDB Connected (Atlas): ${mongoose.connection.host}`);
      return;
    } catch (error) {
      console.error(`MongoDB Atlas Connection Failed: ${error.message}`);
    }
  } else {
    console.log(`MongoDB Atlas is unreachable (DNS check failed or timed out). Bypassing Atlas.`);
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
