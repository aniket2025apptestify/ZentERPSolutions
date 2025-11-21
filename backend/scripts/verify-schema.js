require('dotenv').config();
const { Client } = require('pg');

async function verifySchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Verifying database schema...\n');

    // Check all required tables
    const tables = ['QCRecord', 'ReworkJob', 'ReturnRecord', 'Notification'];
    
    for (const table of tables) {
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = $1
      `, [table]);
      
      if (result.rows.length > 0) {
        // Check columns
        const columns = await client.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [table]);
        
        console.log(`✅ ${table}:`);
        columns.rows.forEach(col => {
          console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
        });
        console.log('');
      } else {
        console.log(`❌ ${table}: NOT FOUND\n`);
      }
    }

    // Check foreign keys
    console.log('Checking foreign keys...\n');
    const fks = await client.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND (tc.table_name IN ('QCRecord', 'ReworkJob', 'ReturnRecord'))
      ORDER BY tc.table_name, kcu.column_name
    `);

    console.log('Foreign Keys:');
    fks.rows.forEach(fk => {
      console.log(`   ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    console.log('\n✅ Schema verification complete!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

verifySchema();

