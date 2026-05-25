const express = require("express");
const cors = require("cors");

const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   SUPABASE
========================= */

const supabase = createClient(
  "https://uqrbykxgsarsfyyvmibr.supabase.co",
  "sb_publishable_8K6sVOFwsLbVOUGUr6a-5A_ldVlLQxu"
);

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

    const { data, error } = await supabase
      .schema("sef")
      .from("cat_piezas")
      .select("*")
      .eq("ind_activo", 1)
      .order("id_pieza", { ascending: true });

    if (error) {
      throw error;
    }

    res.json(data);

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

    const { data, error } = await supabase
      .schema("sef")
      .from("cat_piezas")
      .update({
        cantidad: cantidad,
        fec_modificacion: new Date(),
        usuario_modificacion: "ADMIN",
      })
      .eq("id_pieza", id);

    if (error) {
      throw error;
    }

    res.json({
      ok: true,
      message: "Stock actualizado",
      data,
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: error.message,
    });

  }

});

module.exports = app;