const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const config = require('../config/config');

let db;

/**
 * Runs SQL and returns rows.
 */
async function query(sql, params = []) {
  if (!db) await initDB();
  const statement = sql.trim().toLowerCase();
  if (
    statement.startsWith('select') ||
    statement.startsWith('pragma') ||
    statement.startsWith('with')
  ) {
    return db.all(sql, params);
  }

  const result = await db.run(sql, params);
  return {
    insertId: result.lastID,
    affectedRows: result.changes,
    changes: result.changes,
    lastID: result.lastID,
  };
}

/**
 * Executes a callback within a transaction.
 */
async function transaction(callback) {
  if (!db) await initDB();
  await db.run('BEGIN TRANSACTION');
  try {
    const txQuery = async (sql, params = []) => {
      return db.all(sql, params);
    };
    const result = await callback(txQuery);
    await db.commit();
    return result;
  } catch (err) {
    await db.run('ROLLBACK');
    throw err;
  }
}

async function initDB() {
  try {
    // Open SQLite database file (e-waste.db)
    db = await open({
      filename: path.join(__dirname, '../e-waste.db'),
      driver: sqlite3.Database
    });

    console.log('Using SQLite Database for Cloud Deployment.');

    await db.exec(`
      CREATE TABLE IF NOT EXISTS regions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        admin_level TEXT,
        external_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS ewaste_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        region TEXT NOT NULL,
        year INTEGER NOT NULL,
        sales_import_tonnes REAL NOT NULL,
        population_millions REAL NOT NULL,
        disposal_amount_tonnes REAL NOT NULL,
        region_id INTEGER,
        device_category TEXT DEFAULT 'General',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        region TEXT NOT NULL,
        forecast_year INTEGER NOT NULL,
        predicted_tonnes REAL NOT NULL,
        device_category TEXT,
        model_version TEXT,
        metric_snapshot TEXT,
        model_type TEXT DEFAULT 'tabular',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        region TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        severity TEXT NOT NULL,
        region_id INTEGER
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS cv_classifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        predicted_class TEXT NOT NULL,
        confidence REAL NOT NULL,
        is_ewaste BOOLEAN DEFAULT 1,
        device_category TEXT,
        estimated_weight_kg REAL,
        all_probabilities TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS customer_devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        device_type TEXT NOT NULL,
        age_years INTEGER NOT NULL,
        condition_status TEXT NOT NULL,
        ai_suggestion TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      INSERT OR IGNORE INTO regions (name, latitude, longitude, admin_level) VALUES 
      ('Pollachi, Tamil Nadu', 10.6609, 77.0048, 'town'),
      ('Gandhipuram, Coimbatore', 11.0183, 76.9682, 'town'),
      ('Saravanampatti, Coimbatore', 11.077, 77.0163, 'town'),
      ('RS Puram, Coimbatore', 11.0089, 76.9507, 'town'),
      ('Ukkadam, Coimbatore', 10.9954, 76.9601, 'town')
    `);

    console.log('SQLite Database & tables initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize SQLite database:', error);
    process.exit(1);
  }
}

module.exports = {
  initDB,
  query,
  transaction,
};
