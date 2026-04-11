const express = require('express');
const { query } = require('../models/db');
const router = express.Router();

// GET all institute devices
router.get('/devices', async (req, res) => {
  try {
    const devices = await query('SELECT * FROM institute_devices ORDER BY created_at DESC');
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST a new device for diagnostics
router.post('/devices', async (req, res) => {
  try {
    const { category, issues, student_id } = req.body;
    
    if (!category || !issues) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await query(
      'INSERT INTO institute_devices (category, issues, student_id) VALUES (?, ?, ?)',
      [category, issues, student_id || null]
    );
    res.json({ id: result.insertId, message: 'Device logged for diagnostics successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT to update device status
router.put('/devices/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    await query('UPDATE institute_devices SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: 'Device status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
