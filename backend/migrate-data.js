import mysql from 'mysql2/promise';

async function migrateData() {
  console.log('Connecting to Local MySQL Database...');
  const localDb = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'childwatch'
  });

  console.log('Connecting to TiDB Cloud...');
  const remoteDb = await mysql.createConnection({
    host: 'gateway01.eu-central-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '4E157fvzdXZJSG9.root',
    password: 'THX4lFVAE8NOUf3X',
    database: 'childwatch',
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true
    }
  });

  const tables = [
    'admins',
    'managed_users',
    'reporter_reports',
    'user_notifications',
    'case_updates',
    'case_assignments',
    'attachments'
  ];

  for (const table of tables) {
    console.log(`\nMigrating table: ${table}`);
    try {
      // Get all rows from local
      const [rows] = await localDb.query(`SELECT * FROM ${table}`);
      console.log(`Found ${rows.length} rows in local ${table}.`);

      if (rows.length === 0) continue;

      // Ensure remote table is empty before copying (optional, but good for a fresh start)
      // await remoteDb.query(`TRUNCATE TABLE ${table}`); // Commented out to be safe

      // Get column names
      const columns = Object.keys(rows[0]);
      
      for (const row of rows) {
        const values = columns.map(col => row[col]);
        const placeholders = columns.map(() => '?').join(', ');
        
        try {
          await remoteDb.query(
            `INSERT IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
            values
          );
        } catch (insertErr) {
          console.error(`Failed to insert row into ${table}:`, insertErr.message);
        }
      }
      console.log(`Successfully migrated data for ${table}.`);
    } catch (err) {
      console.error(`Skipping table ${table} (might not exist locally):`, err.message);
    }
  }

  console.log('\nData Migration Complete!');
  await localDb.end();
  await remoteDb.end();
}

migrateData().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
