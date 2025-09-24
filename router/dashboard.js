const express = require('express');
const { getDashboardStats } = require('../controller/dashboardController');
const { auth } = require('../middilware/auth');
const router = express.Router();

// Dashboard routes - Admin only
router.get('/', auth(), getDashboardStats);

module.exports = router;
