const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

/* =========================
   CONFIG
========================= */

app.use(cors());
app.use(express.json());

/* =========================
   DATABASE
========================= */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

/* =========================
   TEST DB CONNECTION
========================= */

pool.connect((err, client, release) => {
  if (err) {
    return console.error(
      "❌ Error connecting to PostgreSQL:",
      err.message
    );
  }

  console.log("✅ PostgreSQL connected");
  release();
});

/* =========================
   ROOT
========================= */

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "API funcionando 🚀",
  });
});

/* =========================
   OBTENER INVENTARIO
========================= */

app.get("/api/piezas", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id_pieza,
        modelo,
        no_parte,
        descripcion,
        cantidad,
        unidad,
        ind_activo
      FROM sef.cat_piezas
      WHERE ind_activo = 1
      ORDER BY id_pieza
    `);

    res.json(result.rows);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: error.message,
    });
  }
});

/* =========================
   ACTUALIZAR STOCK
========================= */

app.put("/api/piezas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad } = req.body;

    await pool.query(
      `
      UPDATE sef.cat_piezas
      SET
        cantidad = $1,
        fec_modificacion = CURRENT_TIMESTAMP,
        usuario_modificacion = $2
      WHERE id_pieza = $3
      `,
      [cantidad, "ADMIN", id]
    );

    res.json({
      ok: true,
      message: "Stock actualizado",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: error.message,
    });
  }
});

/* =========================
   SERVER
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;