const { Client } = require('C:/Users/Viet/Desktop/my-nocobase/node_modules/pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'nocobase',
  user: 'nocobase',
  password: 'nocobase123',
});

async function run() {
  await client.connect();
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables WHERE table_schema='public';
  `);
  
  const searchStr = 'Template_Proposal';
  console.log(`Searching for "${searchStr}" in all tables...`);
  
  for (const row of tables.rows) {
    const table = row.table_name;
    try {
      const cols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name='${table}' AND data_type IN ('character varying', 'text');
      `);
      if (cols.rows.length === 0) continue;
      
      const conditions = cols.rows.map(c => `"${c.column_name}" LIKE '%${searchStr}%'`).join(' OR ');
      const query = `SELECT count(*) FROM "${table}" WHERE ${conditions}`;
      const countRes = await client.query(query);
      const count = parseInt(countRes.rows[0].count, 10);
      if (count > 0) {
        console.log(`FOUND in table "${table}"! Count: ${count}`);
        const samples = await client.query(`SELECT * FROM "${table}" WHERE ${conditions} LIMIT 1`);
        console.log(JSON.stringify(samples.rows[0], null, 2));
      }
    } catch (e) {
      // ignore query errors (e.g. key/reserved words)
    }
  }
  await client.end();
}

run().catch(console.error);
