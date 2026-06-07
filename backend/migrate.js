import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('Connecting to TiDB...');
  const connection = await mysql.createConnection({
    host: 'gateway01.eu-central-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '4E157fvzdXZJSG9.root',
    password: 'THX4lFVAE8NOUf3X',
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true
    }
  });

  console.log('Connected! Reading init.sql...');
  const sqlPath = path.join(__dirname, 'sql', 'init.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  // Split by semicolon to run statements one by one
  const statements = sqlContent.split(';').map(s => s.trim()).filter(s => s.length > 0);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    console.log(`Executing: ${stmt.substring(0, 50)}...`);
    try {
      await connection.query(stmt);
      console.log('Success.');
    } catch (err) {
      console.error('Error executing statement:', err.message);
    }
  }

  console.log('Migration finished!');
  await connection.end();
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
