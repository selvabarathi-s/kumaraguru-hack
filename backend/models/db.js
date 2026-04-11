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
      CREATE TABLE IF NOT EXISTS hub_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id TEXT NOT NULL,
        source TEXT NOT NULL,
        category TEXT NOT NULL,
        weight_kg REAL NOT NULL DEFAULT 0,
        ai_classification TEXT,
        destination TEXT DEFAULT 'Pending Assignment',
        status TEXT DEFAULT 'Pending Classification',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS service_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_type TEXT NOT NULL,
        device_or_material TEXT NOT NULL,
        issue_or_details TEXT,
        weight_kg REAL DEFAULT 0,
        status TEXT DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS industry_disposals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_category TEXT NOT NULL,
        weight_kg REAL NOT NULL,
        data_security TEXT NOT NULL,
        status TEXT DEFAULT 'Scheduled Pickup',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS institute_devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        issues TEXT NOT NULL,
        status TEXT DEFAULT 'Awaiting Diagnostics',
        student_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS device_analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filenames TEXT,
        device_type TEXT NOT NULL,
        condition_status TEXT NOT NULL,
        confidence REAL NOT NULL,
        estimated_weight_kg REAL,
        materials_json TEXT,
        total_recovery_value REAL,
        co2_saved_kg REAL,
        images_count INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
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

    // Insert default demo logins
    await db.exec(`
      INSERT OR IGNORE INTO users (username, password, role) VALUES 
      ('admin', 'admin123', 'admin'),
      ('hub', 'hub123', 'hub'),
      ('customer', 'customer123', 'customer'),
      ('service', 'service123', 'service'),
      ('industry', 'industry123', 'industry'),
      ('institute', 'institute123', 'institute')
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
