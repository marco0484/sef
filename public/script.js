/* =========================================
   SEFERAN CMMS
========================================= */

/* =========================================
   VARIABLES
========================================= */

let inventario = [];

let historial =
  JSON.parse(
    localStorage.getItem(
      "historialCMMS"
    )
  ) || [];

let evidenciaActual = null;

/* =========================================
   ELEMENTOS
========================================= */

const table =
  document.getElementById(
    "inventoryTable"
  );

const historyList =
  document.getElementById(
    "historyList"
  );

const searchInput =
  document.getElementById(
    "searchInput"
  );

const machineFilter =
  document.getElementById(
    "machineFilter"
  );

const criticalFilter =
  document.getElementById(
    "criticalFilter"
  );

/* =========================================
   INIT
========================================= */

window.onload = () => {

  iniciarSistema();

};

/* =========================================
   SISTEMA
========================================= */

function iniciarSistema(){

  const loader =
    document.getElementById(
      "loadingOverlay"
    );

  if(loader){

    loader.classList.add(
      "hidden"
    );

  }

  document.getElementById(
    "sidebarUser"
  ).innerText =
    "ADMIN";

  document.getElementById(
    "sidebarRole"
  ).innerText =
    "MODO DESARROLLO";

  cargarInventario();

  renderHistorial();

}

/* =========================================
   API
========================================= */

async function cargarInventario(){

  mostrarLoader(true);

  try{

    const response =
  await fetch(
    "/api/piezas"
  );

    inventario =
      await response.json();

    renderTable();

  }

  catch(error){

    console.log(error);

    inventario = [];

    renderTable();

    mostrarToast(
      "Error conectando API"
    );

  }

  mostrarLoader(false);

}

/* =========================================
   TABLA
========================================= */

function renderTable(){

  table.innerHTML = "";

  const texto =
    searchInput.value
    .toLowerCase();

  const maquina =
    machineFilter.value;

  const criticidad =
    criticalFilter.value;

  const filtrados =
    inventario.filter(item => {

      const matchTexto =

        item.descripcion
          ?.toLowerCase()
          .includes(texto)

        ||

        item.no_parte
          ?.toLowerCase()
          .includes(texto);

      const matchMaquina =

        maquina === "Todas"
        ||
        item.modelo === maquina;

      const matchCriticidad =

        criticidad === "Todos"
        ||
        obtenerTextoCriticidad(
          item.cantidad
        ) === criticidad;

      return (

        matchTexto
        &&
        matchMaquina
        &&
        matchCriticidad

      );

    });

  filtrados.forEach(item => {

    const row =
      document.createElement("tr");

    row.innerHTML = `

      <td>
        <div class="part-number">
          ${item.no_parte || "-"}
        </div>
      </td>

      <td>
        <div class="description">
          <strong>
            ${item.descripcion || "-"}
          </strong>
        </div>
      </td>

      <td>
        ${item.modelo || "-"}
      </td>

      <td>
        ${item.modelo || "-"}
      </td>
<!--
      <td>
        ${item.unidad || "-"}
      </td>
-->
      <td>

        <span class="
          badge
          ${
            obtenerClaseCriticidad(
              item.cantidad
            )
          }
        ">

          ${
            obtenerTextoCriticidad(
              item.cantidad
            )
          }

        </span>

      </td>

      <td>

        <div class="stock-cell">

          <strong>
            ${item.cantidad || 0}
          </strong>

        </div>

      </td>
<!--
      <td>

        ${
          formatearFecha(
            item.fec_modificacion
          )
        }

      </td>

      <td>

        ${
          item.usuario_modificacion
          || "-"
        }

      </td>
-->
      <td>

        <div class="actions">

          <button
            class="minus"
            onclick="restar(${item.id_pieza})"
          >
            −
          </button>

          <button
            class="plus"
            onclick="sumar(${item.id_pieza})"
          >
            +
          </button>

          <button
            class="request-btn"
            onclick="abrirModal(${item.id_pieza})"
          >
            📎
          </button>

        </div>

      </td>

    `;

    table.appendChild(row);

  });

  actualizarKPIs();

}

/* =========================================
   KPI
========================================= */

function actualizarKPIs(){

  document.getElementById(
    "kpiTotal"
  ).innerText =
    inventario.length;

  const criticos =
    inventario.filter(
      item =>
        Number(item.cantidad) <= 1
    );

  document.getElementById(
    "kpiCriticos"
  ).innerText =
    criticos.length;

  const bajos =
    inventario.filter(
      item =>
        Number(item.cantidad) <= 3
    );

  document.getElementById(
    "kpiStock"
  ).innerText =
    bajos.length;

  const total =
    inventario.reduce(
      (acc,item) =>

        acc +
        Number(item.cantidad || 0),

      0
    );

  document.getElementById(
    "kpiPiezas"
  ).innerText =
    total;

}

/* =========================================
   STOCK
========================================= */

async function sumar(id){

  const item =
    inventario.find(
      i => i.id_pieza === id
    );

  const nuevaCantidad =
    Number(item.cantidad) + 1;

  await actualizarStock(
    id,
    nuevaCantidad
  );

  registrarMovimiento(
    "SUMAR STOCK",
    item.descripcion
  );

}

async function restar(id){

  const item =
    inventario.find(
      i => i.id_pieza === id
    );

  if(item.cantidad <= 0){

    mostrarToast(
      "Sin stock"
    );

    return;
  }

  const nuevaCantidad =
    Number(item.cantidad) - 1;

  await actualizarStock(
    id,
    nuevaCantidad
  );

  registrarMovimiento(
    "CONSUMO PIEZA",
    item.descripcion
  );

}

async function actualizarStock(
  id,
  cantidad
){

  mostrarLoader(true);

  try{

    await fetch(

      `/api/piezas/${id}`,

      {

        method:"PUT",

        headers:{
          "Content-Type":
            "application/json"
        },

        body:JSON.stringify({

          cantidad,
          usuario:"ADMIN"

        })

      }

    );

    await cargarInventario();

  }

  catch(error){

    console.log(error);

    mostrarToast(
      "Error actualizando stock"
    );

  }

  mostrarLoader(false);

}

/* =========================================
   BITÁCORA
========================================= */

function registrarMovimiento(
  accion,
  pieza
){

  historial.unshift({

    usuario:"ADMIN",

    rol:"DESARROLLO",

    accion,

    pieza,

    fecha:
      new Date()
      .toLocaleString()

  });

  localStorage.setItem(

    "historialCMMS",

    JSON.stringify(historial)

  );

  renderHistorial();

}

function renderHistorial(){

  historyList.innerHTML = "";

  historial.forEach(item => {

    const div =
      document.createElement("div");

    div.className =
      "history-item";

    div.innerHTML = `

      <strong>
        ${item.usuario}
      </strong>

      realizó:

      ${item.accion}

      sobre:

      ${item.pieza}

      <span>
        ${item.fecha}
      </span>

    `;

    historyList.appendChild(div);

  });

}

/* =========================================
   EVIDENCIAS
========================================= */

function abrirModal(id){

  evidenciaActual =
    inventario.find(
      i => i.id_pieza === id
    );

  document.getElementById(
    "evidencePart"
  ).innerText =
    evidenciaActual.descripcion;

  document.getElementById(
    "evidenceModal"
  ).classList.remove(
    "hidden"
  );

}

function cerrarModal(){

  document.getElementById(
    "evidenceModal"
  ).classList.add(
    "hidden"
  );

}

async function guardarEvidencia(){

  const archivo =
    document.getElementById(
      "evidenceFile"
    ).files[0];

  const comentario =
    document.getElementById(
      "evidenceComment"
    ).value;

  if(!archivo){

    mostrarToast(
      "Sube evidencia"
    );

    return;
  }

  mostrarLoader(true);

  try{

    /* =========================================
       SUBIR IMAGEN
    ========================================= */

    const formData =
      new FormData();

    formData.append(
      "imagen",
      archivo
    );

    const uploadResponse =
      await fetch(
        "/api/upload",
        {
          method:"POST",
          body:formData
        }
      );

    const uploadData =
      await uploadResponse.json();

    if(uploadData.error){

      throw new Error(
        uploadData.error
      );

    }

    /* =========================================
       GUARDAR EN BASE
    ========================================= */

    const response =
      await fetch(
        "/api/evidencias",
        {

          method:"POST",

          headers:{
            "Content-Type":
              "application/json"
          },

          body:JSON.stringify({

            id_pieza:
              evidenciaActual.id_pieza,

            comentario,

            imagen_url:
              uploadData.url,

            usuario:"ADMIN"

          })

        }
      );

    const data =
      await response.json();

    if(data.error){

      throw new Error(
        data.error
      );

    }

    registrarMovimiento(
      "EVIDENCIA CARGADA",
      evidenciaActual.descripcion
    );

    cerrarModal();

    mostrarToast(
      "Evidencia guardada"
    );

  }

  catch(error){

    console.log(error);

    mostrarToast(
      "Error guardando evidencia"
    );

  }

  mostrarLoader(false);

}

/* =========================================
   UTILIDADES
========================================= */

function obtenerClaseCriticidad(
  cantidad
){

  if(cantidad <= 1){
    return "critical";
  }

  if(cantidad <= 3){
    return "warning";
  }

  return "ok";

}

function obtenerTextoCriticidad(
  cantidad
){

  if(cantidad <= 1){
    return "PARO DE LINEA";
  }

  if(cantidad <= 3){
    return "CRÍTICO";
  }

  return "OPERACIONAL";

}

function formatearFecha(fecha){

  if(!fecha){
    return "-";
  }

  return new Date(
    fecha
  ).toLocaleString();

}

function mostrarLoader(mostrar){

  const loader =
    document.getElementById(
      "loadingOverlay"
    );

  if(!loader){
    return;
  }

  if(mostrar){

    loader.style.display =
      "flex";

  }

  else{

    loader.style.display =
      "none";

  }

}

function mostrarToast(texto){

  const toast =
    document.createElement("div");

  toast.className =
    "toast";

  toast.innerText =
    texto;

  document.body.appendChild(
    toast
  );

  setTimeout(() => {

    toast.remove();

  },2500);

}


/* =========================================
   THEME
========================================= */

function toggleTheme(){

  document.body.classList.toggle(
    "light-theme"
  );

  const modoClaro =

    document.body.classList.contains(
      "light-theme"
    );

  localStorage.setItem(

    "theme",

    modoClaro
      ? "light"
      : "dark"

  );

}

/* CARGAR TEMA */

const temaGuardado =
  localStorage.getItem(
    "theme"
  );

if(temaGuardado === "light"){

  document.body.classList.add(
    "light-theme"
  );

}

/* =========================================
   EVENTOS
========================================= */

searchInput.addEventListener(
  "input",
  renderTable
);

machineFilter.addEventListener(
  "change",
  renderTable
);

criticalFilter.addEventListener(
  "change",
  renderTable
);