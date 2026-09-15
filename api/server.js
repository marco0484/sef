const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { randomUUID } = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

const app = express();

/* =========================================================
   CONFIGURACIÓN
========================================================= */

app.disable("x-powered-by");

const PORT = Number(process.env.PORT || 3000);

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  "https://uqrbykxgsarsfyyvmibr.supabase.co";

const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

const EVIDENCE_BUCKET =
  process.env.SUPABASE_EVIDENCE_BUCKET ||
  "evidencias";

const MAX_IMAGE_SIZE =
  8 * 1024 * 1024; // 8 MB

if (!SUPABASE_KEY) {
  throw new Error(
    "Falta configurar SUPABASE_SECRET_KEY en las variables de entorno."
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);


/* =========================================================
   CORS
========================================================= */

const allowedOrigins = String(
  process.env.ALLOWED_ORIGINS || ""
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {

      // Peticiones same-origin, Postman, servidor a servidor, etc.
      if (!origin) {
        return callback(null, true);
      }

      // Si no se configuraron orígenes, conserva compatibilidad.
      if (allowedOrigins.length === 0) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const error =
        new Error("Origen no permitido por CORS");

      error.statusCode = 403;

      return callback(error);
    },

    methods: [
      "GET",
      "POST",
      "PUT",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);


/* =========================================================
   MIDDLEWARE GENERAL
========================================================= */

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use((req, res, next) => {

  req.requestId =
    randomUUID();

  res.setHeader(
    "X-Request-Id",
    req.requestId
  );

  res.setHeader(
    "X-Content-Type-Options",
    "nosniff"
  );

  res.setHeader(
    "X-Frame-Options",
    "DENY"
  );

  res.setHeader(
    "Referrer-Policy",
    "no-referrer"
  );

  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  if (
    req.path.startsWith("/api/")
  ) {
    res.setHeader(
      "Cache-Control",
      "no-store"
    );
  }

  next();
});


/* =========================================================
   MULTER / IMÁGENES
========================================================= */

const storage =
  multer.memoryStorage();

const upload =
  multer({

    storage,

    limits: {
      files: 1,
      fileSize: MAX_IMAGE_SIZE,
    },

    fileFilter(req, file, callback) {

      if (
        !file.mimetype ||
        !file.mimetype.startsWith("image/")
      ) {

        const error =
          new Error(
            "El archivo debe ser una imagen."
          );

        error.statusCode = 400;

        return callback(error);
      }

      return callback(
        null,
        true
      );
    },

  });


/* =========================================================
   HELPERS
========================================================= */

function asyncRoute(handler) {

  return function wrappedRoute(
    req,
    res,
    next
  ) {

    Promise
      .resolve(
        handler(
          req,
          res,
          next
        )
      )
      .catch(next);

  };
}


function normalizarTexto(
  value,
  maxLength = 500
) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .trim()
    .slice(
      0,
      maxLength
    );
}


function obtenerIdPositivo(value) {

  const id =
    Number(value);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}


function obtenerEnteroNoNegativo(
  value
) {

  const numero =
    Number(value);

  if (
    !Number.isInteger(numero) ||
    numero < 0
  ) {
    return null;
  }

  return numero;
}


function esUrlHttp(value) {

  try {

    const url =
      new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );

  }
  catch {
    return false;
  }
}


function responderError(
  res,
  status,
  message,
  error = null
) {

  const payload = {
    error: message,
  };

  if (
    error &&
    process.env.NODE_ENV !== "production"
  ) {

    payload.detail =
      error.message;

  }

  return res
    .status(status)
    .json(payload);
}


function logError(
  req,
  label,
  error
) {

  console.error(
    `[${req.requestId || "sin-id"}] ${label}:`,
    error
  );
}


function extensionSegura(
  originalName,
  mimetype
) {

  const originalExtension =
    path
      .extname(
        originalName || ""
      )
      .toLowerCase()
      .replace(
        /[^.a-z0-9]/g,
        ""
      )
      .slice(
        0,
        10
      );

  if (originalExtension) {
    return originalExtension;
  }

  const mimeExtensions = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/heic": ".heic",
    "image/heif": ".heif",
  };

  return (
    mimeExtensions[mimetype] ||
    ".img"
  );
}


function crearNombreArchivo(file) {

  const extension =
    extensionSegura(
      file.originalname,
      file.mimetype
    );

  const baseName =
    path
      .basename(
        file.originalname || "evidencia",
        path.extname(
          file.originalname || ""
        )
      )
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /[^a-zA-Z0-9_-]/g,
        "-"
      )
      .replace(
        /-+/g,
        "-"
      )
      .replace(
        /^[-_]+|[-_]+$/g,
        ""
      )
      .slice(
        0,
        48
      ) || "evidencia";

  return (
    `${Date.now()}-` +
    `${randomUUID()}-` +
    `${baseName}` +
    `${extension}`
  );
}


/* =========================================================
   ROOT / HEALTH
========================================================= */

app.get(
  "/",
  (req, res) => {

    res.json({
      ok: true,
      service:
        "SEFERAN Asset Control API",
      version:
        "2.0.0",
    });

  }
);


app.get(
  "/api/health",
  (req, res) => {

    res.json({
      ok: true,
      status: "healthy",
      timestamp:
        new Date().toISOString(),
    });

  }
);


/* =========================================================
   LOGIN
========================================================= */

app.post(
  "/api/login",
  asyncRoute(
    async (req, res) => {

      const usuario =
        normalizarTexto(
          req.body?.usuario,
          100
        );

      const password =
        normalizarTexto(
          req.body?.password,
          200
        );

      if (
        !usuario ||
        !password
      ) {

        return responderError(
          res,
          400,
          "Usuario y contraseña son obligatorios."
        );
      }

      /*
        IMPORTANTE:
        cosmic_usuarios ya no maneja password en texto plano.
        Se obtiene password_hash y la comparación se hace
        en Node con bcryptjs.
      */

      const {
        data,
        error,
      } =
        await supabase

          .from(
            "cosmic_usuarios"
          )

          .select(
            "id, usuario, nombre, rol, activo, id_productora, password_hash"
          )

          .eq(
            "usuario",
            usuario
          )

          .eq(
            "activo",
            true
          )

          .maybeSingle();

      if (error) {

        logError(
          req,
          "Error consultando login",
          error
        );

        return responderError(
          res,
          500,
          "No fue posible validar las credenciales.",
          error
        );
      }

      /*
        Respondemos igual si el usuario no existe o si no tiene
        hash para evitar revelar qué usuarios están registrados.
      */

      if (
        !data ||
        !data.password_hash
      ) {

        return responderError(
          res,
          401,
          "Credenciales inválidas."
        );
      }

      let passwordValido = false;

      try {

        passwordValido =
          await bcrypt.compare(
            password,
            data.password_hash
          );

      }
      catch (error) {

        logError(
          req,
          "Error comparando password_hash",
          error
        );

        return responderError(
          res,
          500,
          "No fue posible validar las credenciales.",
          error
        );
      }

      if (!passwordValido) {

        return responderError(
          res,
          401,
          "Credenciales inválidas."
        );
      }

      return res.json({

        ok: true,

        usuario:
          data.usuario,

        nombre:
          data.nombre || "",

        rol:
          data.rol || "",

        id_productora:
          data.id_productora ?? null,

      });

    }
  )
);


/* =========================================================
   INVENTARIO
========================================================= */

/* =========================================================
   INVENTARIO
========================================================= */

app.get(
  "/api/piezas",
  asyncRoute(
    async (req, res) => {

      const {
        data,
        error
      } = await supabase
        .from("cat_piezas")
        .select("*")
        .eq("ind_activo", 1)
        .order("id_pieza", {
          ascending: true
        });

      if (error) {

        logError(
          req,
          "Error obteniendo piezas",
          error
        );

        return responderError(
          res,
          500,
          "No fue posible consultar el inventario.",
          error
        );

      }

      return res.json(
        data || []
      );

    }
  )
);

/* =========================================================
   ACTUALIZAR STOCK
========================================================= */

app.put(
  "/api/piezas/:id",
  asyncRoute(
    async (req, res) => {

      const id =
        obtenerIdPositivo(
          req.params.id
        );

      const cantidad =
        obtenerEnteroNoNegativo(
          req.body?.cantidad
        );

      const usuario =
        normalizarTexto(
          req.body?.usuario,
          100
        ) ||
        "SYSTEM";

      if (!id) {

        return responderError(
          res,
          400,
          "ID de pieza inválido."
        );
      }

      if (cantidad === null) {

        return responderError(
          res,
          400,
          "La cantidad debe ser un entero mayor o igual a cero."
        );
      }

      const {
        data,
        error,
      } =
        await supabase

          .from(
            "cat_piezas"
          )

          .update({

            cantidad,

            fec_modificacion:
              new Date()
                .toISOString(),

            usuario_modificacion:
              usuario,

          })

          .eq(
            "id_pieza",
            id
          )

          .eq(
            "ind_activo",
            1
          )

          .select(
            "id_pieza, cantidad, fec_modificacion, usuario_modificacion"
          )

          .maybeSingle();

      if (error) {

        logError(
          req,
          "Error actualizando stock",
          error
        );

        return responderError(
          res,
          500,
          "No fue posible actualizar el stock.",
          error
        );
      }

      if (!data) {

        return responderError(
          res,
          404,
          "La pieza no existe o está inactiva."
        );
      }

      return res.json({

        ok: true,

        message:
          "Stock actualizado.",

        data,

      });

    }
  )
);


/* =========================================================
   SUBIR IMAGEN
========================================================= */

app.post(
  "/api/upload",

  upload.single(
    "imagen"
  ),

  asyncRoute(
    async (req, res) => {

      if (!req.file) {

        return responderError(
          res,
          400,
          "No se recibió ninguna imagen."
        );
      }

      const fileName =
        crearNombreArchivo(
          req.file
        );

      const {
        error,
      } =
        await supabase

          .storage

          .from(
            EVIDENCE_BUCKET
          )

          .upload(
            fileName,
            req.file.buffer,
            {

              contentType:
                req.file.mimetype,

              cacheControl:
                "3600",

              upsert:
                false,

            }
          );

      if (error) {

        logError(
          req,
          "Error subiendo evidencia",
          error
        );

        return responderError(
          res,
          500,
          "No fue posible subir la imagen.",
          error
        );
      }

      const {
        data,
      } =
        supabase

          .storage

          .from(
            EVIDENCE_BUCKET
          )

          .getPublicUrl(
            fileName
          );

      if (
        !data?.publicUrl
      ) {

        return responderError(
          res,
          500,
          "La imagen fue almacenada, pero no fue posible obtener su URL pública."
        );
      }

      return res.json({

        ok: true,

        message:
          "Imagen subida.",

        url:
          data.publicUrl,

        file:
          fileName,

      });

    }
  )
);


/* =========================================================
   GUARDAR EVIDENCIA
========================================================= */

app.post(
  "/api/evidencias",
  asyncRoute(
    async (req, res) => {

      const idPieza =
        obtenerIdPositivo(
          req.body?.id_pieza
        );

      const comentario =
        normalizarTexto(
          req.body?.comentario,
          2000
        );

      const imagenUrl =
        normalizarTexto(
          req.body?.imagen_url,
          2000
        );

      const usuario =
        normalizarTexto(
          req.body?.usuario,
          100
        ) ||
        "SYSTEM";

      if (!idPieza) {

        return responderError(
          res,
          400,
          "ID de pieza inválido."
        );
      }

      if (
        !imagenUrl ||
        !esUrlHttp(
          imagenUrl
        )
      ) {

        return responderError(
          res,
          400,
          "La URL de la evidencia es inválida."
        );
      }

      const {
        data,
        error,
      } =
        await supabase

          .from(
            "tbl_evidencias"
          )

          .insert([
            {

              id_pieza:
                idPieza,

              comentario,

              imagen_url:
                imagenUrl,

              usuario,

              fecha:
                new Date()
                  .toISOString(),

            },
          ])

          .select();

      if (error) {

        logError(
          req,
          "Error guardando evidencia",
          error
        );

        return responderError(
          res,
          500,
          "No fue posible guardar la evidencia.",
          error
        );
      }

      return res
        .status(201)
        .json({

          ok: true,

          message:
            "Evidencia guardada.",

          data:
            data || [],

        });

    }
  )
);


/* =========================================================
   OBTENER EVIDENCIAS
========================================================= */

app.get(
  "/api/evidencias",
  asyncRoute(
    async (req, res) => {

      const {
        data,
        error,
      } =
        await supabase

          .from(
            "tbl_evidencias"
          )

          .select("*")

          .order(
            "fecha",
            {
              ascending: false,
            }
          );

      if (error) {

        logError(
          req,
          "Error obteniendo evidencias",
          error
        );

        return responderError(
          res,
          500,
          "No fue posible consultar las evidencias.",
          error
        );
      }

      return res.json(
        data || []
      );

    }
  )
);


/* =========================================================
   MOVIMIENTOS
========================================================= */

app.get(
  "/api/movimientos",
  asyncRoute(
    async (req, res) => {

      const {
        data,
        error,
      } =
        await supabase

          .from(
            "movimientos_inventario"
          )

          .select("*")

          .order(
            "fecha",
            {
              ascending: false,
            }
          );

      if (error) {

        logError(
          req,
          "Error obteniendo movimientos",
          error
        );

        return responderError(
          res,
          500,
          "No fue posible consultar los movimientos.",
          error
        );
      }

      return res.json(
        data || []
      );

    }
  )
);


/* =========================================================
   API 404
========================================================= */

app.use(
  "/api",
  (req, res) => {

    return responderError(
      res,
      404,
      "Endpoint no encontrado."
    );

  }
);


/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {

    void next;

    logError(
      req,
      "Error no controlado",
      error
    );

    if (
      error instanceof
      multer.MulterError
    ) {

      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {

        return responderError(
          res,
          413,
          "La imagen excede el límite de 8 MB."
        );
      }

      return responderError(
        res,
        400,
        "No fue posible procesar el archivo.",
        error
      );
    }

    const status =
      Number(
        error.statusCode
      ) || 500;

    if (
      status >= 400 &&
      status < 500
    ) {

      return responderError(
        res,
        status,
        error.message ||
          "Solicitud inválida."
      );
    }

    return responderError(
      res,
      500,
      "Error interno del servidor.",
      error
    );

  }
);


/* =========================================================
   LOCAL / SERVERLESS
========================================================= */

/*
  En Vercel u otro entorno serverless:
  module.exports = app;

  Si ejecutas directamente:
  node server.js

  arrancará en process.env.PORT o 3000.
*/

if (
  require.main === module
) {

  app.listen(
    PORT,
    () => {

      console.log(
        `SEFERAN API escuchando en puerto ${PORT}`
      );

    }
  );

}

module.exports = app;
