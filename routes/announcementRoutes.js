const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const {
  getActiveAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} = require('../controllers/announcementController');

// Public route
router.get('/active', getActiveAnnouncements);
router.get('/public-all', getAllAnnouncements);

// Protected admin routes
router.use(adminAuth);
router.get('/', getAllAnnouncements);
router.post('/', createAnnouncement);
router.put('/:id', updateAnnouncement);
router.delete('/:id', deleteAnnouncement);

module.exports = router;
