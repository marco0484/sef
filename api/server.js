const express = require("express");
const cors = require("cors");
const multer = require("multer");

const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();

const upload = multer({
  storage,
});

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


/* =========================
   SUBIR IMAGEN
========================= */

app.post("/api/upload", upload.single("imagen"), async (req, res) => {

  try {

    if (!req.file) {

      return res.status(400).json({
        error: "No se recibió imagen",
      });

    }

    res.json({
  ok: true,
  message: "Imagen subida",
  url: req.file.originalname,
});

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: error.message,
    });

  }

});

/* =========================
   GUARDAR EVIDENCIA
========================= */

app.post("/api/evidencias", async (req, res) => {

  try {

    const {

      id_pieza,
      comentario,
      imagen_url,
      usuario,

    } = req.body;

    const { data, error } = await supabase

      .from("tbl_evidencias")

      .insert([{

        id_pieza,
        comentario,
        imagen_url,
        usuario,

        fecha:
          new Date(),

      }])

      .select();

    if (error) {

      throw error;

    }

    res.json({

      ok: true,

      message:
        "Evidencia guardada",

      data,

    });

  }

  catch (error) {

    console.log(error);

    res.status(500).json({
      error: error.message,
    });

  }

});

module.exports = app;