const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const { query } = require('../models/db');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
});

const CV_URL = process.env.CV_URL || 'http://localhost:5002';
const CV_FALLBACK_CONDITION = { ewaste: 'repairable', mixed_waste: 'scrap' };

// ─── Material composition database (grams per device type) ────────────────
const MATERIAL_DB = {
  mobile_phone: [
    { material: 'copper',   weight_g: 15,  recovery_pct: 85, price_per_g: 0.65 },
    { material: 'aluminum', weight_g: 25,  recovery_pct: 90, price_per_g: 0.18 },
    { material: 'gold',     weight_g: 0.03,recovery_pct: 95, price_per_g: 5500 },
    { material: 'silver',   weight_g: 0.3, recovery_pct: 90, price_per_g: 72   },
    { material: 'plastic',  weight_g: 80,  recovery_pct: 60, price_per_g: 0.02 },
    { material: 'lithium',  weight_g: 5,   recovery_pct: 70, price_per_g: 1.20 },
  ],
  laptop: [
    { material: 'copper',   weight_g: 200, recovery_pct: 85, price_per_g: 0.65 },
    { material: 'aluminum', weight_g: 600, recovery_pct: 90, price_per_g: 0.18 },
    { material: 'gold',     weight_g: 0.3, recovery_pct: 95, price_per_g: 5500 },
    { material: 'silver',   weight_g: 1.5, recovery_pct: 90, price_per_g: 72   },
    { material: 'plastic',  weight_g: 400, recovery_pct: 55, price_per_g: 0.02 },
    { material: 'lithium',  weight_g: 60,  recovery_pct: 70, price_per_g: 1.20 },
  ],
  tablet: [
    { material: 'copper',   weight_g: 20,  recovery_pct: 85, price_per_g: 0.65 },
    { material: 'aluminum', weight_g: 120, recovery_pct: 90, price_per_g: 0.18 },
    { material: 'gold',     weight_g: 0.1, recovery_pct: 95, price_per_g: 5500 },
    { material: 'silver',   weight_g: 0.5, recovery_pct: 90, price_per_g: 72   },
    { material: 'plastic',  weight_g: 100, recovery_pct: 55, price_per_g: 0.02 },
    { material: 'lithium',  weight_g: 30,  recovery_pct: 70, price_per_g: 1.20 },
  ],
  keyboard: [
    { material: 'copper',   weight_g: 30,  recovery_pct: 80, price_per_g: 0.65 },
    { material: 'aluminum', weight_g: 50,  recovery_pct: 88, price_per_g: 0.18 },
    { material: 'plastic',  weight_g: 500, recovery_pct: 55, price_per_g: 0.02 },
    { material: 'iron',     weight_g: 100, recovery_pct: 92, price_per_g: 0.05 },
  ],
  mouse: [
    { material: 'copper',   weight_g: 10,  recovery_pct: 80, price_per_g: 0.65 },
    { material: 'plastic',  weight_g: 80,  recovery_pct: 55, price_per_g: 0.02 },
    { material: 'iron',     weight_g: 20,  recovery_pct: 92, price_per_g: 0.05 },
  ],
  monitor_screen: [
    { material: 'copper',   weight_g: 300, recovery_pct: 80, price_per_g: 0.65 },
    { material: 'aluminum', weight_g: 800, recovery_pct: 88, price_per_g: 0.18 },
    { material: 'plastic',  weight_g: 900, recovery_pct: 50, price_per_g: 0.02 },
    { material: 'lead',     weight_g: 200, recovery_pct: 75, price_per_g: 0.18 },
    { material: 'tin',      weight_g: 50,  recovery_pct: 80, price_per_g: 1.90 },
  ],
  printer: [
    { material: 'copper',   weight_g: 250, recovery_pct: 80, price_per_g: 0.65 },
    { material: 'aluminum', weight_g: 400, recovery_pct: 88, price_per_g: 0.18 },
    { material: 'plastic',  weight_g: 3000,recovery_pct: 50, price_per_g: 0.02 },
    { material: 'iron',     weight_g: 1000,recovery_pct: 92, price_per_g: 0.05 },
  ],
  circuit_board: [
    { material: 'copper',   weight_g: 80,  recovery_pct: 90, price_per_g: 0.65 },
    { material: 'gold',     weight_g: 0.5, recovery_pct: 98, price_per_g: 5500 },
    { material: 'silver',   weight_g: 2,   recovery_pct: 95, price_per_g: 72   },
    { material: 'tin',      weight_g: 30,  recovery_pct: 85, price_per_g: 1.90 },
    { material: 'plastic',  weight_g: 100, recovery_pct: 50, price_per_g: 0.02 },
  ],
  battery: [
    { material: 'lithium',  weight_g: 100, recovery_pct: 75, price_per_g: 1.20 },
    { material: 'copper',   weight_g: 30,  recovery_pct: 80, price_per_g: 0.65 },
    { material: 'aluminum', weight_g: 40,  recovery_pct: 88, price_per_g: 0.18 },
    { material: 'zinc',     weight_g: 25,  recovery_pct: 70, price_per_g: 0.25 },
  ],
  router: [
    { material: 'copper',   weight_g: 60,  recovery_pct: 80, price_per_g: 0.65 },
    { material: 'plastic',  weight_g: 200, recovery_pct: 55, price_per_g: 0.02 },
    { material: 'aluminum', weight_g: 80,  recovery_pct: 88, price_per_g: 0.18 },
  ],
  appliance: [
    { material: 'copper',   weight_g: 800, recovery_pct: 85, price_per_g: 0.65 },
    { material: 'aluminum', weight_g: 2000,recovery_pct: 90, price_per_g: 0.18 },
    { material: 'iron',     weight_g: 5000,recovery_pct: 92, price_per_g: 0.05 },
    { material: 'plastic',  weight_g: 1000,recovery_pct: 50, price_per_g: 0.02 },
  ],
  cable_wire: [
    { material: 'copper',   weight_g: 150, recovery_pct: 90, price_per_g: 0.65 },
    { material: 'plastic',  weight_g: 200, recovery_pct: 55, price_per_g: 0.02 },
    { material: 'aluminum', weight_g: 50,  recovery_pct: 88, price_per_g: 0.18 },
  ],
};

const DEFAULT_MATERIALS = [
  { material: 'copper',   weight_g: 50,  recovery_pct: 80, price_per_g: 0.65 },
  { material: 'aluminum', weight_g: 100, recovery_pct: 85, price_per_g: 0.18 },
  { material: 'plastic',  weight_g: 200, recovery_pct: 55, price_per_g: 0.02 },
  { material: 'iron',     weight_g: 80,  recovery_pct: 90, price_per_g: 0.05 },
];

// CO2 savings (kg CO2 per kg of device weight recycled)
const CO2_SAVINGS_PER_KG = {
  mobile_phone: 70, laptop: 60, tablet: 65, monitor_screen: 50,
  circuit_board: 80, battery: 55, appliance: 45, keyboard: 30,
  mouse: 30, printer: 40, router: 35, cable_wire: 55, default: 50,
};

// ─── Compute material recovery from raw DB data ──────────────────────────
function computeMaterials(deviceType, conditionFactor) {
  const rawMaterials = MATERIAL_DB[deviceType] || DEFAULT_MATERIALS;
  let totalValue = 0;

  const materials = rawMaterials.map((m) => {
    const estimated_weight_g = Math.round(m.weight_g * conditionFactor);
    const adj_recovery = Math.round(m.recovery_pct * (0.8 + conditionFactor * 0.2));
    const recoverable_g = parseFloat(((estimated_weight_g * adj_recovery) / 100).toFixed(2));
    const value = parseFloat((recoverable_g * m.price_per_g).toFixed(2));
    totalValue += value;

    return {
      material: m.material,
      estimated_weight_g,
      recovery_pct: adj_recovery,
      recoverable_g,
      price_per_g: m.price_per_g,
      value,
    };
  });

  return { materials, totalValue: parseFloat(totalValue.toFixed(2)) };
}

// ─── Condition -> numeric factor ─────────────────────────────────────────
const CONDITION_FACTOR = { good: 1.0, repairable: 0.75, damaged: 0.5, scrap: 0.3 };

function aggregateLegacyBatchResults(results) {
  const valid = (results || []).filter((item) => item && !item.error);
  if (valid.length === 0) {
    return null;
  }

  const scores = new Map();
  for (const item of valid) {
    const predictedClass = item.predicted_class || 'unknown';
    const confidence = Number(item.confidence) || 0;
    const previous = scores.get(predictedClass) || 0;
    scores.set(predictedClass, previous + confidence);
  }

  const [deviceType] = [...scores.entries()].sort((a, b) => b[1] - a[1])[0];
  const matching = valid.filter((item) => (item.predicted_class || 'unknown') === deviceType);
  const confidence =
    matching.reduce((sum, item) => sum + (Number(item.confidence) || 0), 0) / Math.max(matching.length, 1);
  const representative = matching.sort((a, b) => (Number(b.confidence) || 0) - (Number(a.confidence) || 0))[0] || valid[0];

  const primaryCategory = representative.primary_category || (representative.is_ewaste ? 'ewaste' : 'mixed_waste');

  return {
    device_type: deviceType,
    device_display: representative.display_name || deviceType.replace(/_/g, ' '),
    condition: CV_FALLBACK_CONDITION[primaryCategory] || 'damaged',
    confidence: Number(confidence.toFixed(4)),
    estimated_weight_kg: representative.estimated_weight_kg || 1.0,
    top_predictions: representative.top_predictions || [],
    images_analyzed: valid.length,
  };
}

function buildCvFormData(files) {
  const cvFormData = new FormData();
  files.forEach((file) => {
    cvFormData.append('images', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
  });
  return cvFormData;
}

async function analyzeWithCvService(files) {
  try {
    const cvFormData = buildCvFormData(files);
    const response = await axios.post(`${CV_URL}/detect-device`, cvFormData, {
      headers: { ...cvFormData.getHeaders() },
      timeout: 60000,
    });
    return response.data;
  } catch (cvErr) {
    if (cvErr.response?.status !== 404) {
      throw cvErr;
    }

    const fallbackFormData = buildCvFormData(files);
    const fallbackResponse = await axios.post(`${CV_URL}/classify/batch`, fallbackFormData, {
      headers: { ...fallbackFormData.getHeaders() },
      timeout: 60000,
    });
    const aggregated = aggregateLegacyBatchResults(fallbackResponse.data?.results);

    if (!aggregated) {
      const fallbackError = new Error('All images failed to process in CV service');
      fallbackError.response = { status: 422 };
      throw fallbackError;
    }

    return aggregated;
  }
}

// ─── POST /api/detect-device ─────────────────────────────────────────────
router.post('/detect-device', upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No images provided. Upload 1–5 images.' } });
    }
    if (req.files.length > 5) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Maximum 5 images allowed.' } });
    }

    // ── Send all images to the CV service ──
    let cv;
    try {
      cv = await analyzeWithCvService(req.files);
    } catch (cvErr) {
      if (cvErr.code === 'ECONNREFUSED') {
        return res.status(503).json({ error: { code: 'CV_UNAVAILABLE', message: 'CV Service not running. Start: cd cv-service && python app.py' } });
      }
      const statusCode = cvErr.response?.status === 422 ? 422 : 500;
      return res.status(statusCode).json({ error: { code: 'CV_ERROR', message: cvErr.message } });
    }
    const deviceType = cv.device_type || 'unknown';
    const condition  = cv.condition || 'damaged';
    const confidence = cv.confidence || 0;
    const deviceDisplay = cv.device_display || deviceType.replace(/_/g, ' ');
    const estimatedWeightKg = cv.estimated_weight_kg || 1.0;

    // ── Material recovery calculation ──
    const factor = CONDITION_FACTOR[condition] ?? 0.5;
    const { materials, totalValue } = computeMaterials(deviceType, factor);

    // ── CO2 estimate ──
    const co2Rate = CO2_SAVINGS_PER_KG[deviceType] || CO2_SAVINGS_PER_KG.default;
    const co2Saved = parseFloat((estimatedWeightKg * co2Rate * factor).toFixed(2));

    // ── Store result in DB ──
    try {
      await query(
        `INSERT INTO device_analyses
         (filenames, device_type, condition_status, confidence, estimated_weight_kg,
          materials_json, total_recovery_value, co2_saved_kg, images_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.files.map((f) => f.originalname).join(','),
          deviceType,
          condition,
          confidence,
          estimatedWeightKg,
          JSON.stringify(materials),
          totalValue,
          co2Saved,
          req.files.length,
        ]
      );
    } catch (dbErr) {
      console.error('Failed to store device analysis:', dbErr.message);
    }

    // ── Final response ──
    res.json({
      device_type: deviceType,
      device_display: deviceDisplay,
      condition,
      confidence,
      estimated_weight_kg: estimatedWeightKg,
      images_analyzed: req.files.length,
      materials,
      total_recovery_value: totalValue,
      co2_saved_kg: co2Saved,
      top_predictions: cv.top_predictions || [],
    });
  } catch (err) {
    console.error('detect-device error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// ─── GET /api/device-analyses – analytics history ────────────────────────
router.get('/device-analyses', async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const rows = await query(
      'SELECT * FROM device_analyses ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    const parsed = rows.map((r) => ({
      ...r,
      materials: typeof r.materials_json === 'string' ? JSON.parse(r.materials_json) : r.materials_json,
    }));
    res.json({ analyses: parsed, total: parsed.length });
  } catch (err) {
    res.status(500).json({ error: { code: 'HISTORY_ERROR', message: err.message } });
  }
});

module.exports = router;
