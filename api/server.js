const express = require("express");
const cors = require("cors");

const pool = require("../db");
const app = express();

app.use(cors());

app.use(express.json());

/* OBTENER INVENTARIO */

app.get(
  "/api/piezas",
  async(req,res) => {

    try{

      const result =
        await pool.query(`

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

      res.json(
        result.rows
      );

    }

    catch(error){

      console.log(error);

      res.status(500).json({
        error:"Error DB"
      });

    }

  }
);

/* ACTUALIZAR STOCK */

app.put(
  "/api/piezas/:id",
  async(req,res) => {

    try{

      const { id } =
        req.params;

      const { cantidad } =
        req.body;

      await pool.query(`

        UPDATE sef.cat_piezas
        SET
          cantidad = $1,
          fec_modificacion = CURRENT_TIMESTAMP,
          usuario_modificacion = $2
        WHERE id_pieza = $3

      `,
      [
        cantidad,
        "ADMIN",
        id
      ]);

      res.json({
        ok:true
      });

    }

    catch(error){

      console.log(error);

      res.status(500).json({
        error:"Error update"
      });

    }

  }
);

module.exports = app;