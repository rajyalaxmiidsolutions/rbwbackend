const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const adminAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Admin authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({ message: 'Admin not found' });
    }

    // Check if the token is registered as an active device session
    const sessionIndex = admin.activeDevices.findIndex(d => d.token === token);
    if (sessionIndex === -1) {
      return res.status(401).json({ message: 'Session expired or revoked' });
    }

    // Update session activity time
    admin.activeDevices[sessionIndex].lastActive = new Date();
    await admin.save();

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid admin token' });
  }
};

module.exports = adminAuth;
