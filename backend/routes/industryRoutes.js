const express = require('express');
const { query } = require('../models/db');
const router = express.Router();

// GET all disposals
router.get('/disposals', async (req, res) => {
  try {
    const disposals = await query('SELECT * FROM industry_disposals ORDER BY created_at DESC');
    res.json(disposals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST a new disposal
router.post('/disposals', async (req, res) => {
  try {
    const { device_category, weight_kg, data_security } = req.body;
    
    if (!device_category || !weight_kg || !data_security) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await query(
      'INSERT INTO industry_disposals (device_category, weight_kg, data_security) VALUES (?, ?, ?)',
      [device_category, weight_kg, data_security]
    );
    res.json({ id: result.insertId, message: 'Disposal request created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
