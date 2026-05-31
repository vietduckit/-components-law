const { Client } = require('C:/Users/Viet/Desktop/my-nocobase/node_modules/pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: 'nocobase',
  password: 'nocobase123',
});

async function run() {
  await client.connect();
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables WHERE table_schema='public';
  `);
  const names = tables.rows.map(r => r.table_name);
  console.log("Tables in postgres database:");
  console.log(names);
  
  const matched = names.filter(n => 
    /datasource|template|folder|company|internal|document|attach/i.test(n)
  );
  for (const t of matched) {
    try {
      const countRes = await client.query(`SELECT count(*) FROM "${t}"`);
      console.log(`Table "${t}" count:`, countRes.rows[0].count);
    } catch (e) {
      console.log(`Failed to query "${t}":`, e.message);
    }
  }

  await client.end();
}

run().catch(console.error);
