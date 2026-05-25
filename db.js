const { Pool } = require("pg");

console.log("DB CONNECTING...");

const pool = new Pool({
  connectionString:
    "postgresql://postgres:Unitec889900@db.uqrbykxgsarsfyyvmibr.supabase.co:5432/postgres",

  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;