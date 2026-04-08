const { query } = require('../models/db');

async function migrateSimulationTables() {
  const creates = [
    `CREATE TABLE IF NOT EXISTS simulation_scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      sales_change_pct REAL NOT NULL DEFAULT 0,
      recycling_rate_change REAL NOT NULL DEFAULT 0,
      policy_factor REAL NOT NULL DEFAULT 1.0,
      forecast_horizon_years INTEGER NOT NULL DEFAULT 5,
      baseline_tonnes REAL,
      projected_tonnes REAL,
      impact_tonnes REAL,
      impact_pct REAL,
      result_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sustainability_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      region TEXT NOT NULL,
      region_id INTEGER,
      year INTEGER NOT NULL,
      waste_generated_tonnes REAL NOT NULL DEFAULT 0,
      estimated_recycled_tonnes REAL NOT NULL DEFAULT 0,
      recycling_rate_pct REAL NOT NULL DEFAULT 0,
      risk_level TEXT NOT NULL DEFAULT 'Green',
      sustainability_score REAL NOT NULL DEFAULT 0,
      population_density REAL,
      per_capita_waste REAL,
      score_details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(region, year)
    )`,
    `CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      region TEXT NOT NULL,
      alert_type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'warning',
      message TEXT NOT NULL,
      metric_name TEXT,
      metric_value REAL,
      threshold_value REAL,
      acknowledged INTEGER DEFAULT 0,
      acknowledged_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  ];
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_sim_created ON simulation_scenarios (created_at)',
    'CREATE INDEX IF NOT EXISTS idx_sustain_region ON sustainability_scores (region)',
    'CREATE INDEX IF NOT EXISTS idx_sustain_risk ON sustainability_scores (risk_level)',
    'CREATE INDEX IF NOT EXISTS idx_alert_region ON alerts (region)',
    'CREATE INDEX IF NOT EXISTS idx_alert_severity ON alerts (severity)',
    'CREATE INDEX IF NOT EXISTS idx_alert_ack ON alerts (acknowledged)',
  ];

  for (const sql of [...creates, ...indexes]) {
    try {
      await query(sql);
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME' && e.code !== 'ER_DUP_KEYNAME') {
        console.warn('Simulation migration note:', sql, e.message);
      }
    }
  }

  console.log('Simulation & sustainability tables initialized');
}

module.exports = { migrateSimulationTables };
