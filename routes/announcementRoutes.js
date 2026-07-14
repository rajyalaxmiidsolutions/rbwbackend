const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const upload = require('../middleware/upload');
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
router.post('/', upload.array('images', 1), createAnnouncement);
router.put('/:id', upload.array('images', 1), updateAnnouncement);
router.delete('/:id', deleteAnnouncement);

module.exports = router;
