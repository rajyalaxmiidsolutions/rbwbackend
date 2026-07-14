const User = require('../models/User');
const OTP = require('../models/OTP');
const generateToken = require('../utils/generateToken');
const generateOTP = require('../utils/generateOTP');
const { sendOTPEmail } = require('../utils/sendEmail');

// Signup
exports.signup = async (req, res, next) => {
  return res.status(403).json({ message: 'Registration is disabled. Only the Administrator can create accounts.' });
};

// Verify OTP
exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const otpRecord = await OTP.findOne({ email, purpose: 'verification' });
    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP expired or not found. Please request a new one.' });
    }

    const isMatch = await otpRecord.compareOTP(otp);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Mark user as verified
    const user = await User.findOneAndUpdate(
      { email },
      { verified: true },
      { new: true }
    );

    await OTP.deleteMany({ email, purpose: 'verification' });

    const token = generateToken(user._id);

    // Set secure httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Use lax to support redirect flows if any
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      message: 'Email verified successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        businessName: user.businessName,
        businessLocation: user.businessLocation,
        verified: user.verified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Resend OTP
exports.resendOTP = async (req, res, next) => {
  try {
    const { email, purpose = 'verification' } = req.body;

    // Check cooldown — last OTP must be older than 60s
    const lastOTP = await OTP.findOne({ email, purpose }).sort({ createdAt: -1 });
    if (lastOTP) {
      const elapsed = Date.now() - new Date(lastOTP.createdAt).getTime();
      if (elapsed < 60000) {
        const wait = Math.ceil((60000 - elapsed) / 1000);
        return res.status(429).json({ message: `Please wait ${wait} seconds before requesting a new OTP` });
      }
    }

    const otp = generateOTP();
    await OTP.deleteMany({ email, purpose });
    await OTP.create({
      email,
      otp,
      purpose,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    sendOTPEmail(email, otp, purpose).catch(err => console.error("Background OTP send error:", err));

    res.status(200).json({ message: 'OTP resent successfully' });
  } catch (error) {
    next(error);
  }
};

// Login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.verified) {
      // Generate and send OTP
      const otp = generateOTP();
      await OTP.deleteMany({ email, purpose: 'verification' });
      await OTP.create({
        email,
        otp,
        purpose: 'verification',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      sendOTPEmail(email, otp, 'verification').catch(err => console.error("Background OTP send error:", err));

      return res.status(403).json({ message: 'Please verify your email first', needsVerification: true, email });
    }

    const token = generateToken(user._id);

    // Set secure httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        businessName: user.businessName,
        businessLocation: user.businessLocation,
        gstNumber: user.gstNumber,
        verified: user.verified,
        addresses: user.addresses,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Forgot Password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    const otp = generateOTP();
    await OTP.deleteMany({ email, purpose: 'reset' });
    await OTP.create({
      email,
      otp,
      purpose: 'reset',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    sendOTPEmail(email, otp, 'reset').catch(err => console.error("Background OTP send error:", err));

    res.status(200).json({ message: 'Password reset OTP sent to your email' });
  } catch (error) {
    next(error);
  }
};

// Reset Password
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    const otpRecord = await OTP.findOne({ email, purpose: 'reset' });
    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP expired or not found' });
    }

    const isMatch = await otpRecord.compareOTP(otp);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const user = await User.findOne({ email });
    user.password = newPassword;
    await user.save();

    await OTP.deleteMany({ email, purpose: 'reset' });

    res.status(200).json({ message: 'Password reset successful. Please login.' });
  } catch (error) {
    next(error);
  }
};

// Logout
exports.logout = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role === 'admin' || decoded.role === 'superadmin') {
          const Admin = require('../models/Admin');
          const admin = await Admin.findById(decoded.id);
          if (admin) {
            admin.activeDevices = admin.activeDevices.filter(d => d.token !== token);
            await admin.save();
          }
        }
      } catch (err) {
        // Suppress decode issues on logout
      }
    }

    res.cookie('token', '', {
      httpOnly: true,
      expires: new Date(0),
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};
