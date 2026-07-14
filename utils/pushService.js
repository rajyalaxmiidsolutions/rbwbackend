const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

// Initialize Web Push with VAPID details
const initPush = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL || 'mailto:support.rajyalaxmibindingworks@gmail.com';

  if (!publicKey || !privateKey) {
    console.warn('WARNING: VAPID keys are missing. Web push notifications will not work.');
    return false;
  }

  webpush.setVapidDetails(email, publicKey, privateKey);
  return true;
};

const isConfigured = initPush();

/**
 * Sends a notification to a specific database subscription record.
 * Automatically cleans up expired or invalid subscriptions.
 */
const sendToSubscription = async (pushSub, payloadString) => {
  if (!isConfigured) return;

  try {
    await webpush.sendNotification(pushSub.subscription, payloadString);
  } catch (error) {
    console.error(`Push dispatch error for endpoint ${pushSub.subscription.endpoint}:`, error.statusCode || error.message);
    
    // Status codes 410 (Gone) and 404 (Not Found) mean subscription expired or revoked
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log(`Removing inactive subscription: ${pushSub._id}`);
      await PushSubscription.findByIdAndDelete(pushSub._id);
    }
  }
};

/**
 * Send push to all active subscriptions of a specific user.
 */
const sendToUser = async (userId, payload) => {
  try {
    const subscriptions = await PushSubscription.find({ user: userId, isActive: true });
    const payloadString = JSON.stringify(payload);

    await Promise.all(subscriptions.map(sub => sendToSubscription(sub, payloadString)));
  } catch (error) {
    console.error(`Error sending push to user ${userId}:`, error);
  }
};

/**
 * Send push to all administrators.
 */
const sendToAdmins = async (payload) => {
  try {
    const subscriptions = await PushSubscription.find({ role: 'admin', isActive: true });
    const payloadString = JSON.stringify(payload);

    await Promise.all(subscriptions.map(sub => sendToSubscription(sub, payloadString)));
  } catch (error) {
    console.error('Error sending push to admins:', error);
  }
};

/**
 * Send push to all customer subscribers.
 */
const sendToAllCustomers = async (payload) => {
  try {
    const subscriptions = await PushSubscription.find({ role: 'customer', isActive: true });
    const payloadString = JSON.stringify(payload);

    await Promise.all(subscriptions.map(sub => sendToSubscription(sub, payloadString)));
  } catch (error) {
    console.error('Error sending push to all customers:', error);
  }
};

module.exports = {
  sendToUser,
  sendToAdmins,
  sendToAllCustomers
};
