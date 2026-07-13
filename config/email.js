const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : '',
  },
  tls: { rejectUnauthorized: false },
});

// Verify transporter on startup
global.emailStatus = 'verifying';
global.emailError = null;

transporter.verify((error) => {
  if (error) {
    global.emailStatus = 'error';
    global.emailError = error.message;
    console.error('Email transporter error:', error.message);
  } else {
    global.emailStatus = 'ready';
    global.emailError = null;
    console.log('Email transporter ready');
  }
});

module.exports = transporter;
