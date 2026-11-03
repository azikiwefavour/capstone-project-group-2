const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_xv4ybGSukV5i@ep-rough-lab-b4exdzki-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require'
});
client.connect().then(async () => {
  const res = await client.query('SELECT id, name, email, role, "hospitalName", "invitationStatus", "invitationToken" FROM users');
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}).catch(console.error);
