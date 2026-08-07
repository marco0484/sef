/* =========================================================
   SEFERAN ASSET CONTROL · SCRIPT V2
   Lógica maestra para:
   Login · Dashboard · Inventario · Movimientos · Evidencias
   · Auditoría · Usuarios
========================================================= */

"use strict";


/* =========================================================
   01. CONFIGURACIÓN
========================================================= */

const SEFERAN = {

  endpoints:{
    login:"/api/login",
    piezas:"/api/piezas",
    upload:"/api/upload",
    evidencias:"/api/evidencias"
  },

  storage:{
    usuario:"usuario",
    rol:"rol",
    historial:"historialCMMS",
    theme:"theme"
  },

  whatsapp:{
    numero:"525559307784",
    mensaje:"Hola, necesito solicitar una refacción."
  }

};


/* =========================================================
   02. ESTADO GLOBAL
========================================================= */

let inventario = [];

let historial = cargarHistorialLocal();

let evidenciaActual = null;

let evidenciasActuales = [];

let previewObjectUrl = null;


/* =========================================================
   03. ROUTING / AUTH
========================================================= */

const rutaActual =
  window.location.pathname
    .toLowerCase();

const esLogin =
  rutaActual.includes("login");


if(
  !obtenerUsuarioSesion()
  &&
  !esLogin
){

  window.location.replace(
    "/login.html"
  );

}


/* =========================================================
   04. HELPERS DOM
========================================================= */

function $(id){

  return document.getElementById(id);

}


function setTexto(id,valor){

  const element = $(id);

  if(element){

    element.textContent =
      valor ?? "";

  }

}


function escaparHTML(valor){

  return String(
    valor ?? ""
  )
  .replaceAll(
    "&",
    "&amp;"
  )
  .replaceAll(
    "<",
    "&lt;"
  )
  .replaceAll(
    ">",
    "&gt;"
  )
  .replaceAll(
    '"',
    "&quot;"
  )
  .replaceAll(
    "'",
    "&#039;"
  );

}


function obtenerUsuarioSesion(){

  return (
    localStorage.getItem(
      SEFERAN.storage.usuario
    )
    ||
    ""
  );

}


function obtenerRolSesion(){

  return (
    localStorage.getItem(
      SEFERAN.storage.rol
    )
    ||
    ""
  );

}


function cargarHistorialLocal(){

  try{

    const data =
      JSON.parse(
        localStorage.getItem(
          "historialCMMS"
        )
      );

    return Array.isArray(data)
      ? data
      : [];

  }

  catch(error){

    console.warn(
      "Historial local inválido:",
      error
    );

    return [];

  }

}


function guardarHistorialLocal(){

  try{

    localStorage.setItem(
      SEFERAN.storage.historial,
      JSON.stringify(historial)
    );

  }

  catch(error){

    console.warn(
      "No fue posible guardar historial:",
      error
    );

  }

}


async function leerJSONSeguro(response){

  try{

    return await response.json();

  }

  catch(error){

    return {};

  }

}


function mensajeErrorAPI(
  data,
  fallback
){

  if(
    data
    &&
    typeof data === "object"
    &&
    data.error
  ){

    return String(data.error);

  }

  return fallback;

}


/* =========================================================
   05. INIT
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    if(esLogin){

      iniciarLogin();

      return;

    }

    iniciarSistema();

  }
);


/* =========================================================
   06. SISTEMA
========================================================= */

function iniciarSistema(){

  pintarUsuarioSesion();

  iniciarNavegacionMobile();

  iniciarAccionesGlobales();

  iniciarPreviewEvidencia();

  iniciarCierreModal();

  /* DASHBOARD */
  if(
    $("inventoryTable")
    ||
    $("kpiTotal")
  ){

    iniciarDashboard();

  }

  /* INVENTARIO */
  if(
    $("inventoryGrid")
  ){

    iniciarInventarioPage();

  }

  /* MOVIMIENTOS */
  if(
    $("timeline")
  ){

    iniciarMovimientos();

  }

  /* EVIDENCIAS */
  if(
    $("evidenceGrid")
  ){

    iniciarEvidencias();

  }

  /* AUDITORÍA */
  if(
    $("kpiIncidencias")
    ||
    document.body.classList.contains(
      "audit-page"
    )
  ){

    cargarAuditoria();

  }

  mostrarLoader(false);

}


function pintarUsuarioSesion(){

  const usuario =
    obtenerUsuarioSesion()
    ||
    "ADMIN";

  const rol =
    obtenerRolSesion()
    ||
    "Administrador";

  setTexto(
    "sidebarUser",
    usuario
  );

  setTexto(
    "sidebarRole",
    rol
  );

}


/* =========================================================
   07. LOGIN
========================================================= */

function iniciarLogin(){

  const form =
    $("loginForm");

  const toggle =
    $("togglePassword");

  const usuarioInput =
    $("loginUser");

  const passwordInput =
    $("loginPass");

  const errorElement =
    $("loginError");


  if(form){

    form.addEventListener(
      "submit",
      event => {

        event.preventDefault();

        login();

      }
    );

  }


  if(
    toggle
    &&
    passwordInput
  ){

    toggle.addEventListener(
      "click",
      () => {

        const mostrar =
          passwordInput.type ===
          "password";

        passwordInput.type =
          mostrar
            ? "text"
            : "password";

        toggle.setAttribute(
          "aria-pressed",
          String(mostrar)
        );

        toggle.setAttribute(
          "aria-label",
          mostrar
            ? "Ocultar contraseña"
            : "Mostrar contraseña"
        );

        passwordInput.focus();

      }
    );

  }


  [
    usuarioInput,
    passwordInput
  ]
  .filter(Boolean)
  .forEach(
    input => {

      input.addEventListener(
        "input",
        () => {

          if(errorElement){

            errorElement.textContent =
              "";

          }

        }
      );

    }
  );

}


function setLoginLoading(mostrar){

  const button =
    $("loginButton");

  if(!button){
    return;
  }

  button.disabled =
    Boolean(mostrar);

  button.classList.toggle(
    "is-loading",
    Boolean(mostrar)
  );

  button.setAttribute(
    "aria-busy",
    String(Boolean(mostrar))
  );

}


function mostrarLoginError(texto){

  const errorElement =
    $("loginError");

  if(errorElement){

    errorElement.textContent =
      texto || "";

  }

}


async function login(){

  const usuarioInput =
    $("loginUser");

  const passwordInput =
    $("loginPass");


  if(
    !usuarioInput
    ||
    !passwordInput
  ){

    return;

  }


  const usuario =
    usuarioInput.value.trim();

  const password =
    passwordInput.value;


  mostrarLoginError("");


  if(!usuario){

    mostrarLoginError(
      "Ingresa tu usuario."
    );

    usuarioInput.focus();

    return;

  }


  if(!password){

    mostrarLoginError(
      "Ingresa tu contraseña."
    );

    passwordInput.focus();

    return;

  }


  setLoginLoading(true);


  try{

    const response =
      await fetch(
        SEFERAN.endpoints.login,
        {

          method:"POST",

          headers:{
            "Content-Type":
              "application/json"
          },

          body:JSON.stringify({
            usuario,
            password
          })

        }
      );


    const data =
      await leerJSONSeguro(
        response
      );


    if(
      !response.ok
      ||
      data.error
    ){

      mostrarLoginError(
        mensajeErrorAPI(
          data,
          "Usuario o contraseña incorrectos."
        )
      );

      return;

    }


    if(!data.usuario){

      mostrarLoginError(
        "La respuesta del servidor no contiene un usuario válido."
      );

      return;

    }


    localStorage.setItem(
      SEFERAN.storage.usuario,
      data.usuario
    );


    localStorage.setItem(
      SEFERAN.storage.rol,
      data.rol || "Usuario"
    );


    window.location.replace(
      "/index.html"
    );

  }

  catch(error){

    console.error(
      "Error login:",
      error
    );

    mostrarLoginError(
      "No se pudo conectar con el servidor. Intenta nuevamente."
    );

  }

  finally{

    setLoginLoading(false);

  }

}


/* =========================================================
   08. LOGOUT
========================================================= */

function logout(){

  localStorage.removeItem(
    SEFERAN.storage.usuario
  );

  localStorage.removeItem(
    SEFERAN.storage.rol
  );

  window.location.replace(
    "/login.html"
  );

}


/* =========================================================
   09. API INVENTARIO
========================================================= */

async function obtenerInventarioAPI(){

  const response =
    await fetch(
      SEFERAN.endpoints.piezas,
      {
        headers:{
          "Accept":
            "application/json"
        }
      }
    );


  const data =
    await leerJSONSeguro(
      response
    );


  if(!response.ok){

    throw new Error(
      mensajeErrorAPI(
        data,
        "No fue posible consultar el inventario."
      )
    );

  }


  if(!Array.isArray(data)){

    throw new Error(
      "El servidor devolvió un formato de inventario inválido."
    );

  }


  return data;

}


async function cargarInventario(){

  mostrarLoader(true);


  mostrarEstadoCargaInventario();


  try{

    inventario =
      await obtenerInventarioAPI();


    renderTable();

    renderInventarioCards();

    actualizarKPIs();

    actualizarResumenInventario();

  }

  catch(error){

    console.error(
      "Error cargando inventario:",
      error
    );


    inventario = [];


    renderTable();

    renderErrorInventario(
      error.message
    );


    actualizarKPIs();

    actualizarResumenInventario();


    mostrarToast(
      "No fue posible cargar el inventario."
    );

  }

  finally{

    mostrarLoader(false);

  }

}


/* =========================================================
   10. DASHBOARD
========================================================= */

function iniciarDashboard(){

  const searchInput =
    $("searchInput");

  const machineFilter =
    $("machineFilter");

  const criticalFilter =
    $("criticalFilter");


  if(searchInput){

    searchInput.addEventListener(
      "input",
      renderTable
    );

  }


  if(machineFilter){

    machineFilter.addEventListener(
      "change",
      renderTable
    );

  }


  if(criticalFilter){

    criticalFilter.addEventListener(
      "change",
      renderTable
    );

  }


  renderHistorial();

  cargarInventario();

}


function renderTable(){

  const table =
    $("inventoryTable");

  if(!table){
    return;
  }


  table.innerHTML = "";


  const searchInput =
    $("searchInput");

  const machineFilter =
    $("machineFilter");

  const criticalFilter =
    $("criticalFilter");


  const texto =
    (
      searchInput
        ? searchInput.value
        : ""
    )
    .trim()
    .toLowerCase();


  const maquina =
    machineFilter
      ? machineFilter.value
      : "Todas";


  const criticidad =
    criticalFilter
      ? criticalFilter.value
      : "Todos";


  const filtrados =
    inventario.filter(
      item => {


        const descripcion =
          String(
            item.descripcion || ""
          )
          .toLowerCase();


        const numeroParte =
          String(
            item.no_parte || ""
          )
          .toLowerCase();


        const modelo =
          String(
            item.modelo || ""
          );


        const matchTexto =
          !texto
          ||
          descripcion.includes(texto)
          ||
          numeroParte.includes(texto);


        const matchMaquina =
          maquina === "Todas"
          ||
          modelo === maquina;


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

      }
    );


  if(!filtrados.length){

    const row =
      document.createElement(
        "tr"
      );


    row.innerHTML = `

      <td
        colspan="6"
        class="table-empty"
      >
        Sin resultados para los filtros seleccionados.
      </td>

    `;


    table.appendChild(row);

    return;

  }


  filtrados.forEach(
    item => {


      const id =
        Number(
          item.id_pieza
        );


      const row =
        document.createElement(
          "tr"
        );


      row.innerHTML = `

        <td>

          <div class="part-number">

            ${escaparHTML(
              item.no_parte || "-"
            )}

          </div>

        </td>


        <td>

          <div class="description">

            <strong>

              ${escaparHTML(
                item.descripcion || "-"
              )}

            </strong>

          </div>

        </td>


        <td>

          ${escaparHTML(
            item.modelo || "-"
          )}

        </td>


        <td>

          <span
            class="
              badge
              ${obtenerClaseCriticidad(
                item.cantidad
              )}
            "
          >

            ${escaparHTML(
              obtenerTextoCriticidad(
                item.cantidad
              )
            )}

          </span>

        </td>


        <td>

          <div class="stock-cell">

            <strong>

              ${Number(
                item.cantidad || 0
              )}

            </strong>

          </div>

        </td>


        <td>

          <div class="actions">

            <button
              type="button"
              class="minus"
              onclick="restar(${id})"
              aria-label="Restar una pieza"
              title="Restar stock"
            >
              −
            </button>

            <button
              type="button"
              class="plus"
              onclick="sumar(${id})"
              aria-label="Sumar una pieza"
              title="Sumar stock"
            >
              +
            </button>

            <button
              type="button"
              class="request-btn"
              onclick="abrirModal(${id})"
              aria-label="Agregar evidencia"
              title="Agregar evidencia"
            >

              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="
                    M4 7h3l2-3h6l2 3h3
                    a2 2 0 0 1 2 2v10
                    a2 2 0 0 1-2 2H4
                    a2 2 0 0 1-2-2V9
                    a2 2 0 0 1 2-2Z

                    M12 17
                    a4 4 0 1 0 0-8
                    4 4 0 0 0 0 8Z
                  "
                ></path>
              </svg>

            </button>

          </div>

        </td>

      `;


      table.appendChild(
        row
      );

    }
  );

}


function actualizarKPIs(){

  const total =
    inventario.reduce(
      (acc,item) => {

        return (
          acc
          +
          Number(
            item.cantidad || 0
          )
        );

      },
      0
    );


  const criticos =
    inventario.filter(
      item => {

        return Number(
          item.cantidad || 0
        ) <= 1;

      }
    ).length;


  const bajos =
    inventario.filter(
      item => {

        const cantidad =
          Number(
            item.cantidad || 0
          );

        return (
          cantidad > 1
          &&
          cantidad <= 3
        );

      }
    ).length;


  setTexto(
    "kpiTotal",
    inventario.length
  );


  setTexto(
    "kpiCriticos",
    criticos
  );


  setTexto(
    "kpiStock",
    bajos
  );


  setTexto(
    "kpiPiezas",
    total
  );

}


/* =========================================================
   11. STOCK
========================================================= */

async function sumar(id){

  const item =
    inventario.find(
      pieza => {

        return Number(
          pieza.id_pieza
        ) === Number(id);

      }
    );


  if(!item){

    mostrarToast(
      "Pieza no encontrada."
    );

    return;

  }


  const nuevaCantidad =
    Number(
      item.cantidad || 0
    )
    +
    1;


  const actualizado =
    await actualizarStock(
      id,
      nuevaCantidad
    );


  if(actualizado){

    registrarMovimiento(
      "SUMAR STOCK",
      item.descripcion
      ||
      item.no_parte
      ||
      `Pieza ${id}`
    );

  }

}


async function restar(id){

  const item =
    inventario.find(
      pieza => {

        return Number(
          pieza.id_pieza
        ) === Number(id);

      }
    );


  if(!item){

    mostrarToast(
      "Pieza no encontrada."
    );

    return;

  }


  const cantidadActual =
    Number(
      item.cantidad || 0
    );


  if(cantidadActual <= 0){

    mostrarToast(
      "La pieza no tiene stock disponible."
    );

    return;

  }


  const actualizado =
    await actualizarStock(
      id,
      cantidadActual - 1
    );


  if(actualizado){

    registrarMovimiento(
      "CONSUMO PIEZA",
      item.descripcion
      ||
      item.no_parte
      ||
      `Pieza ${id}`
    );

  }

}


async function actualizarStock(
  id,
  cantidad
){

  mostrarLoader(true);


  try{

    const response =
      await fetch(
        `${SEFERAN.endpoints.piezas}/${id}`,
        {

          method:"PUT",

          headers:{
            "Content-Type":
              "application/json"
          },

          body:JSON.stringify({

            cantidad,

            usuario:
              obtenerUsuarioSesion()
              ||
              "ADMIN"

          })

        }
      );


    const data =
      await leerJSONSeguro(
        response
      );


    if(!response.ok){

      throw new Error(
        mensajeErrorAPI(
          data,
          "No fue posible actualizar el stock."
        )
      );

    }


    await cargarInventario();


    mostrarToast(
      "Stock actualizado."
    );


    return true;

  }

  catch(error){

    console.error(
      "Error actualizando stock:",
      error
    );


    mostrarToast(
      error.message
      ||
      "Error actualizando stock."
    );


    return false;

  }

  finally{

    mostrarLoader(false);

  }

}


/* =========================================================
   12. BITÁCORA / MOVIMIENTOS
========================================================= */

function registrarMovimiento(
  accion,
  pieza
){

  const item = {

    usuario:
      obtenerUsuarioSesion()
      ||
      "ADMIN",

    rol:
      obtenerRolSesion()
      ||
      "Usuario",

    accion,

    pieza,

    fecha:
      new Date()
        .toLocaleString(
          "es-MX"
        )

  };


  historial.unshift(
    item
  );


  historial =
    historial.slice(
      0,
      250
    );


  guardarHistorialLocal();

  renderHistorial();

  renderTimeline();

}


function renderHistorial(){

  const historyList =
    $("historyList");


  if(!historyList){
    return;
  }


  historyList.innerHTML = "";


  if(!historial.length){

    historyList.innerHTML = `

      <div class="history-item">

        <strong>
          Sin actividad reciente
        </strong>

        <span>
          Los movimientos aparecerán aquí.
        </span>

      </div>

    `;

    return;

  }


  historial
    .slice(
      0,
      12
    )
    .forEach(
      item => {


        const div =
          document.createElement(
            "div"
          );


        div.className =
          "history-item";


        div.innerHTML = `

          <strong>

            ${escaparHTML(
              item.usuario || "Usuario"
            )}

          </strong>

          <div>

            ${escaparHTML(
              item.accion || "MOVIMIENTO"
            )}

            ·

            ${escaparHTML(
              item.pieza || "-"
            )}

          </div>

          <span>

            ${escaparHTML(
              item.fecha || "-"
            )}

          </span>

        `;


        historyList.appendChild(
          div
        );

      }
    );

}


function iniciarMovimientos(){

  renderTimeline();


  const refreshButton =
    $("refreshMovements");


  if(refreshButton){

    refreshButton.addEventListener(
      "click",
      () => {

        historial =
          cargarHistorialLocal();

        renderTimeline();

        mostrarToast(
          "Movimientos actualizados."
        );

      }
    );

  }

}


function renderTimeline(){

  const timeline =
    $("timeline");


  if(!timeline){
    return;
  }


  timeline.innerHTML = "";


  if(!historial.length){

    timeline.innerHTML = `

      <div class="inventory-empty-state">

        <div class="empty-state-icon">

          <svg viewBox="0 0 24 24">

            <path
              d="
                M7 7h11
                M15 4l3 3-3 3

                M17 17H6
                M9 14l-3 3 3 3
              "
            ></path>

          </svg>

        </div>

        <strong>
          Sin movimientos
        </strong>

        <span>
          La actividad del inventario aparecerá aquí.
        </span>

      </div>

    `;

    return;

  }


  historial.forEach(
    item => {


      const div =
        document.createElement(
          "article"
        );


      div.className =
        "timeline-item";


      div.innerHTML = `

        <strong>

          ${escaparHTML(
            item.accion || "Movimiento"
          )}

        </strong>

        <div>

          ${escaparHTML(
            item.pieza || "-"
          )}

        </div>

        <span>

          ${escaparHTML(
            item.usuario || "Usuario"
          )}

          ·

          ${escaparHTML(
            item.fecha || "-"
          )}

        </span>

      `;


      timeline.appendChild(
        div
      );

    }
  );

}


/* =========================================================
   13. INVENTARIO PAGE
========================================================= */

function iniciarInventarioPage(){

  const search =
    $("inventorySearch");

  const clearButton =
    $("clearInventorySearch");


  if(search){

    search.addEventListener(
      "input",
      () => {

        actualizarBotonLimpiarInventario();

        renderInventarioCards();

      }
    );

  }


  if(clearButton){

    clearButton.addEventListener(
      "click",
      () => {

        if(search){

          search.value = "";

          search.focus();

        }

        actualizarBotonLimpiarInventario();

        renderInventarioCards();

      }
    );

  }


  cargarInventario();

}


function actualizarBotonLimpiarInventario(){

  const search =
    $("inventorySearch");

  const clearButton =
    $("clearInventorySearch");


  if(!clearButton){
    return;
  }


  clearButton.hidden =
    !(
      search
      &&
      search.value.trim()
    );

}


function mostrarEstadoCargaInventario(){

  const grid =
    $("inventoryGrid");


  if(!grid){
    return;
  }


  grid.innerHTML = `

    <div class="inventory-loading-state">

      <span class="loading-spinner"></span>

      <div>

        <strong>
          Cargando inventario
        </strong>

        <span>
          Consultando existencias...
        </span>

      </div>

    </div>

  `;


  setTexto(
    "inventoryResults",
    "Actualizando inventario..."
  );

}


function renderErrorInventario(
  mensaje
){

  const grid =
    $("inventoryGrid");


  if(!grid){
    return;
  }


  grid.innerHTML = `

    <div
      class="
        inventory-empty-state
        inventory-empty-state--error
      "
    >

      <div class="empty-state-icon">

        <svg viewBox="0 0 24 24">

          <path
            d="
              M12 9v4
              M12 17h.01

              M10.3 4.2
              2.3 18
              a2 2 0 0 0 1.7 3h16
              a2 2 0 0 0 1.7-3
              l-8-13.8
              a2 2 0 0 0-3.4 0Z
            "
          ></path>

        </svg>

      </div>

      <strong>
        No pudimos cargar el inventario
      </strong>

      <span>

        ${escaparHTML(
          mensaje
          ||
          "Verifica la conexión e intenta nuevamente."
        )}

      </span>

      <button
        type="button"
        class="primary-btn"
        onclick="cargarInventario()"
      >
        Reintentar
      </button>

    </div>

  `;


  setTexto(
    "inventoryResults",
    "Error al consultar"
  );

}


function renderInventarioCards(){

  const grid =
    $("inventoryGrid");


  if(!grid){
    return;
  }


  const search =
    $("inventorySearch");


  const texto =
    (
      search
        ? search.value
        : ""
    )
    .trim()
    .toLowerCase();


  const filtradas =
    inventario.filter(
      pieza => {


        if(!texto){
          return true;
        }


        const valores = [

          pieza.no_parte,

          pieza.descripcion,

          pieza.nombre,

          pieza.modelo

        ];


        return valores.some(
          valor => {

            return String(
              valor || ""
            )
            .toLowerCase()
            .includes(
              texto
            );

          }
        );

      }
    );


  grid.innerHTML = "";


  if(!filtradas.length){

    grid.innerHTML = `

      <div class="inventory-empty-state">

        <div class="empty-state-icon">

          <svg viewBox="0 0 24 24">

            <path
              d="
                M4 7.5
                12 3
                l8 4.5
                V17
                l-8 4
                -8-4
                V7.5Z
              "
            ></path>

          </svg>

        </div>

        <strong>
          Sin resultados
        </strong>

        <span>
          No encontramos piezas con la búsqueda actual.
        </span>

      </div>

    `;


    setTexto(
      "inventoryResults",
      "0 resultados"
    );


    return;

  }


  filtradas.forEach(
    pieza => {


      const cantidad =
        Number(
          pieza.cantidad || 0
        );


      const estado =
        obtenerEstadoStock(
          cantidad
        );


      const card =
        document.createElement(
          "article"
        );


      card.className =
        `inventory-item-card ${estado.clase}`;


      card.innerHTML = `

        <div class="inventory-item-card__top">

          <div class="inventory-part-info">

            <span class="inventory-part-number">

              ${escaparHTML(
                pieza.no_parte
                ||
                `PIEZA-${pieza.id_pieza || "-"}`
              )}

            </span>

            <span
              class="
                inventory-stock-badge
                ${estado.badge}
              "
            >

              <span></span>

              ${escaparHTML(
                estado.texto
              )}

            </span>

          </div>


          <div class="inventory-item-icon">

            <svg viewBox="0 0 24 24">

              <path
                d="
                  M4 7.5
                  12 3
                  l8 4.5
                  V17
                  l-8 4
                  -8-4
                  V7.5Z

                  M4 7.5
                  12 12
                  l8-4.5

                  M12 12v9
                "
              ></path>

            </svg>

          </div>

        </div>


        <div class="inventory-item-card__body">

          <h3>

            ${escaparHTML(
              pieza.descripcion
              ||
              pieza.nombre
              ||
              "Componente sin descripción"
            )}

          </h3>


          <div class="inventory-item-meta">

            <div>

              <span>
                Modelo
              </span>

              <strong>

                ${escaparHTML(
                  pieza.modelo || "—"
                )}

              </strong>

            </div>


            <div>

              <span>
                Existencia
              </span>

              <strong class="inventory-stock-value">

                ${cantidad}

                <small>
                  pzas.
                </small>

              </strong>

            </div>

          </div>

        </div>


        <div class="inventory-item-card__footer">

          <div class="stock-progress">

            <div class="stock-progress__header">

              <span>
                Nivel de stock
              </span>

              <strong>
                ${cantidad}
              </strong>

            </div>

            <div class="stock-progress__track">

              <span
                style="
                  width:${calcularNivelStock(
                    cantidad
                  )}%
                "
              ></span>

            </div>

          </div>

        </div>

      `;


      grid.appendChild(
        card
      );

    }
  );


  setTexto(
    "inventoryResults",
    `${filtradas.length} ${
      filtradas.length === 1
        ? "resultado"
        : "resultados"
    }`
  );

}


function actualizarResumenInventario(){

  setTexto(
    "inventoryTotal",
    inventario.length
  );


  const unidades =
    inventario.reduce(
      (total,pieza) => {

        return (
          total
          +
          Number(
            pieza.cantidad || 0
          )
        );

      },
      0
    );


  const stockBajo =
    inventario.filter(
      pieza => {

        return Number(
          pieza.cantidad || 0
        ) <= 3;

      }
    ).length;


  setTexto(
    "inventoryUnits",
    unidades
  );


  setTexto(
    "inventoryLowStock",
    stockBajo
  );

}


function obtenerEstadoStock(cantidad){

  const stock =
    Number(
      cantidad || 0
    );


  if(stock <= 1){

    return {

      clase:
        "inventory-item-card--critical",

      badge:
        "stock-badge--critical",

      texto:
        "Crítico"

    };

  }


  if(stock <= 3){

    return {

      clase:
        "inventory-item-card--warning",

      badge:
        "stock-badge--warning",

      texto:
        "Stock bajo"

    };

  }


  return {

    clase:
      "inventory-item-card--ok",

    badge:
      "stock-badge--ok",

    texto:
      "Disponible"

  };

}


function calcularNivelStock(cantidad){

  const stock =
    Number(
      cantidad || 0
    );


  if(stock <= 0){
    return 4;
  }


  if(stock >= 10){
    return 100;
  }


  return Math.max(
    10,
    stock * 10
  );

}


/* =========================================================
   14. EVIDENCIA DESDE DASHBOARD
========================================================= */

function abrirModal(id){

  evidenciaActual =
    inventario.find(
      pieza => {

        return Number(
          pieza.id_pieza
        ) === Number(id);

      }
    );


  if(!evidenciaActual){

    mostrarToast(
      "No se encontró la pieza seleccionada."
    );

    return;

  }


  setTexto(
    "evidencePart",
    evidenciaActual.descripcion
    ||
    evidenciaActual.no_parte
    ||
    `Pieza ${id}`
  );


  const modal =
    $("evidenceModal");


  if(modal){

    modal.classList.remove(
      "hidden"
    );

    document.body.classList.add(
      "modal-open"
    );

  }

}


function cerrarModal(){

  const modal =
    $("evidenceModal");


  if(modal){

    modal.classList.add(
      "hidden"
    );

  }


  document.body.classList.remove(
    "modal-open"
  );


  limpiarFormularioEvidencia();

}


function iniciarCierreModal(){

  const modal =
    $("evidenceModal");


  if(!modal){
    return;
  }


  modal.addEventListener(
    "click",
    event => {

      if(event.target === modal){

        cerrarModal();

      }

    }
  );


  document.addEventListener(
    "keydown",
    event => {

      if(
        event.key === "Escape"
        &&
        !modal.classList.contains(
          "hidden"
        )
      ){

        cerrarModal();

      }

    }
  );

}


function iniciarPreviewEvidencia(){

  const input =
    $("evidenceFile");


  if(!input){
    return;
  }


  input.addEventListener(
    "change",
    () => {

      renderPreviewEvidencia(
        input.files
          ? input.files[0]
          : null
      );

    }
  );

}


function renderPreviewEvidencia(file){

  const container =
    $("previewContainer");


  if(!container){
    return;
  }


  limpiarObjectURLPreview();


  container.innerHTML = "";


  if(!file){
    return;
  }


  if(
    !String(
      file.type || ""
    )
    .startsWith(
      "image/"
    )
  ){

    mostrarToast(
      "Selecciona un archivo de imagen."
    );

    return;

  }


  previewObjectUrl =
    URL.createObjectURL(
      file
    );


  const image =
    document.createElement(
      "img"
    );


  image.src =
    previewObjectUrl;


  image.alt =
    "Vista previa de la evidencia";


  container.appendChild(
    image
  );

}


function limpiarObjectURLPreview(){

  if(previewObjectUrl){

    URL.revokeObjectURL(
      previewObjectUrl
    );

    previewObjectUrl = null;

  }

}


function limpiarFormularioEvidencia(){

  const file =
    $("evidenceFile");

  const comment =
    $("evidenceComment");

  const preview =
    $("previewContainer");


  if(file){

    file.value = "";

  }


  if(comment){

    comment.value = "";

  }


  if(preview){

    preview.innerHTML = "";

  }


  limpiarObjectURLPreview();

}


async function guardarEvidencia(){

  if(!evidenciaActual){

    mostrarToast(
      "Selecciona una pieza."
    );

    return;

  }


  const fileInput =
    $("evidenceFile");

  const commentInput =
    $("evidenceComment");


  const archivo =
    fileInput
    &&
    fileInput.files
      ? fileInput.files[0]
      : null;


  const comentario =
    commentInput
      ? commentInput.value.trim()
      : "";


  if(!archivo){

    mostrarToast(
      "Agrega una fotografía como evidencia."
    );

    return;

  }


  if(
    !String(
      archivo.type || ""
    )
    .startsWith(
      "image/"
    )
  ){

    mostrarToast(
      "El archivo debe ser una imagen."
    );

    return;

  }


  mostrarLoader(true);


  try{

    const formData =
      new FormData();


    formData.append(
      "imagen",
      archivo
    );


    const uploadResponse =
      await fetch(
        SEFERAN.endpoints.upload,
        {

          method:"POST",

          body:formData

        }
      );


    const uploadData =
      await leerJSONSeguro(
        uploadResponse
      );


    if(
      !uploadResponse.ok
      ||
      uploadData.error
      ||
      !uploadData.url
    ){

      throw new Error(
        mensajeErrorAPI(
          uploadData,
          "No fue posible subir la imagen."
        )
      );

    }


    const response =
      await fetch(
        SEFERAN.endpoints.evidencias,
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

            usuario:
              obtenerUsuarioSesion()
              ||
              "ADMIN"

          })

        }
      );


    const data =
      await leerJSONSeguro(
        response
      );


    if(
      !response.ok
      ||
      data.error
    ){

      throw new Error(
        mensajeErrorAPI(
          data,
          "No fue posible guardar la evidencia."
        )
      );

    }


    registrarMovimiento(
      "EVIDENCIA CARGADA",
      evidenciaActual.descripcion
      ||
      evidenciaActual.no_parte
      ||
      `Pieza ${evidenciaActual.id_pieza}`
    );


    cerrarModal();


    mostrarToast(
      "Evidencia guardada correctamente."
    );

  }

  catch(error){

    console.error(
      "Error guardando evidencia:",
      error
    );


    mostrarToast(
      error.message
      ||
      "Error guardando evidencia."
    );

  }

  finally{

    mostrarLoader(false);

  }

}


/* =========================================================
   15. EVIDENCIAS PAGE
========================================================= */

function iniciarEvidencias(){

  const search =
    $("evidenceSearch");

  const period =
    $("evidencePeriod");

  const clear =
    $("clearEvidenceSearch");

  const closeViewer =
    $("closeEvidenceViewer");

  const viewer =
    $("evidenceViewer");


  if(search){

    search.addEventListener(
      "input",
      filtrarEvidencias
    );

  }


  if(period){

    period.addEventListener(
      "change",
      filtrarEvidencias
    );

  }


  if(clear){

    clear.addEventListener(
      "click",
      () => {

        if(search){

          search.value = "";

          search.focus();

        }

        filtrarEvidencias();

      }
    );

  }


  if(closeViewer){

    closeViewer.addEventListener(
      "click",
      cerrarVisorEvidencia
    );

  }


  if(viewer){

    viewer.addEventListener(
      "click",
      event => {

        if(
          event.target.classList.contains(
            "evidence-viewer__backdrop"
          )
        ){

          cerrarVisorEvidencia();

        }

      }
    );

  }


  document.addEventListener(
    "keydown",
    event => {

      if(event.key === "Escape"){

        cerrarVisorEvidencia();

      }

    }
  );


  cargarEvidencias();

}


async function cargarEvidencias(){

  const grid =
    $("evidenceGrid");


  if(!grid){
    return;
  }


  grid.innerHTML = `

    <div class="evidence-loading-state">

      <span class="loading-spinner"></span>

      <div>

        <strong>
          Cargando evidencias
        </strong>

        <span>
          Consultando historial visual...
        </span>

      </div>

    </div>

  `;


  setTexto(
    "evidenceResults",
    "Consultando evidencias..."
  );


  try{

    const response =
      await fetch(
        SEFERAN.endpoints.evidencias
      );


    const data =
      await leerJSONSeguro(
        response
      );


    if(!response.ok){

      throw new Error(
        mensajeErrorAPI(
          data,
          "No fue posible consultar las evidencias."
        )
      );

    }


    evidenciasActuales =
      Array.isArray(data)
        ? data
        : [];


    evidenciasActuales.sort(
      (a,b) => {

        return (
          obtenerTimestampEvidencia(b)
          -
          obtenerTimestampEvidencia(a)
        );

      }
    );


    actualizarResumenEvidencias();

    filtrarEvidencias();

  }

  catch(error){

    console.error(
      "Error cargando evidencias:",
      error
    );


    grid.innerHTML = `

      <div
        class="
          evidence-empty-state
          evidence-empty-state--error
        "
      >

        <div class="empty-state-icon">

          <svg viewBox="0 0 24 24">

            <path
              d="
                M12 9v4
                M12 17h.01

                M10.3 4.2
                2.3 18
                a2 2 0 0 0 1.7 3h16
                a2 2 0 0 0 1.7-3
                l-8-13.8
                a2 2 0 0 0-3.4 0Z
              "
            ></path>

          </svg>

        </div>

        <strong>
          No pudimos cargar las evidencias
        </strong>

        <span>

          ${escaparHTML(
            error.message
          )}

        </span>

        <button
          type="button"
          class="primary-btn"
          onclick="cargarEvidencias()"
        >
          Reintentar
        </button>

      </div>

    `;


    setTexto(
      "evidenceResults",
      "Error al consultar"
    );

  }

}


function obtenerFechaEvidencia(item){

  return (
    item.fecha
    ||
    item.created_at
    ||
    item.fecha_creacion
    ||
    null
  );

}


function obtenerTimestampEvidencia(item){

  const fecha =
    obtenerFechaEvidencia(
      item
    );


  if(!fecha){
    return 0;
  }


  const timestamp =
    new Date(
      fecha
    )
    .getTime();


  return Number.isNaN(timestamp)
    ? 0
    : timestamp;

}


function formatearFecha(
  fecha
){

  if(!fecha){
    return "-";
  }


  const date =
    new Date(
      fecha
    );


  if(
    Number.isNaN(
      date.getTime()
    )
  ){

    return "-";

  }


  return date.toLocaleString(
    "es-MX",
    {

      day:"2-digit",

      month:"short",

      year:"numeric",

      hour:"2-digit",

      minute:"2-digit"

    }
  );

}


function filtrarEvidencias(){

  const search =
    $("evidenceSearch");

  const period =
    $("evidencePeriod");

  const clear =
    $("clearEvidenceSearch");


  const texto =
    (
      search
        ? search.value
        : ""
    )
    .trim()
    .toLowerCase();


  const periodo =
    period
      ? period.value
      : "all";


  if(clear){

    clear.hidden =
      !texto;

  }


  const ahora =
    new Date();


  const filtradas =
    evidenciasActuales.filter(
      item => {


        const valores = [

          item.id_pieza,

          item.comentario,

          item.usuario

        ];


        const matchTexto =
          !texto
          ||
          valores.some(
            valor => {

              return String(
                valor || ""
              )
              .toLowerCase()
              .includes(
                texto
              );

            }
          );


        if(!matchTexto){

          return false;

        }


        if(periodo === "all"){

          return true;

        }


        const timestamp =
          obtenerTimestampEvidencia(
            item
          );


        if(!timestamp){

          return false;

        }


        const fecha =
          new Date(
            timestamp
          );


        if(periodo === "today"){

          return (
            fecha.getFullYear() ===
              ahora.getFullYear()

            &&

            fecha.getMonth() ===
              ahora.getMonth()

            &&

            fecha.getDate() ===
              ahora.getDate()
          );

        }


        const dias =
          Number(periodo);


        if(
          !Number.isFinite(dias)
          ||
          dias <= 0
        ){

          return true;

        }


        const diferencia =
          ahora.getTime()
          -
          fecha.getTime();


        return (
          diferencia >= 0
          &&
          diferencia <=
            dias
            *
            86400000
        );

      }
    );


  renderEvidencias(
    filtradas
  );

}


function renderEvidencias(
  evidencias
){

  const grid =
    $("evidenceGrid");


  if(!grid){
    return;
  }


  grid.innerHTML = "";


  if(!evidencias.length){

    grid.innerHTML = `

      <div class="evidence-empty-state">

        <div class="empty-state-icon">

          <svg viewBox="0 0 24 24">

            <rect
              x="3"
              y="4"
              width="18"
              height="16"
              rx="2"
            ></rect>

            <path
              d="
                m21 15
                -5-5
                L5 20
              "
            ></path>

          </svg>

        </div>

        <strong>
          Sin evidencias
        </strong>

        <span>
          No encontramos registros con los filtros actuales.
        </span>

      </div>

    `;


    setTexto(
      "evidenceResults",
      "0 resultados"
    );


    return;

  }


  evidencias.forEach(
    item => {


      const pieza =
        item.id_pieza
        ??
        "—";


      const comentario =
        item.comentario
        ||
        "Sin comentarios";


      const usuario =
        item.usuario
        ||
        "Usuario no disponible";


      const fecha =
        formatearFecha(
          obtenerFechaEvidencia(
            item
          )
        );


      const imagen =
        item.imagen_url
        ||
        "";


      const card =
        document.createElement(
          "article"
        );


      card.className =
        "evidence-card";


      card.innerHTML = `

        <button
          type="button"
          class="evidence-card__image-button"
          aria-label="Ver evidencia de la pieza ${escaparHTML(pieza)}"
        >

          <img
            src="${escaparHTML(imagen)}"
            class="evidence-image"
            alt="Evidencia de la pieza ${escaparHTML(pieza)}"
            loading="lazy"
            decoding="async"
          >

          <span class="evidence-image-overlay">

            <svg viewBox="0 0 24 24">

              <path
                d="
                  M2.5 12
                  s3.5-6 9.5-6
                  9.5 6 9.5 6
                  -3.5 6-9.5 6
                  -9.5-6-9.5-6Z
                "
              ></path>

              <circle
                cx="12"
                cy="12"
                r="2.5"
              ></circle>

            </svg>

            Ver evidencia

          </span>

        </button>


        <div class="evidence-card__content">

          <div class="evidence-card__header">

            <div>

              <span class="evidence-card__label">
                Pieza
              </span>

              <strong>
                #${escaparHTML(pieza)}
              </strong>

            </div>

            <span class="evidence-card__status">

              <span></span>

              Registrada

            </span>

          </div>


          <p class="evidence-card__comment">

            ${escaparHTML(
              comentario
            )}

          </p>


          <div class="evidence-card__meta">

            <span>

              <svg viewBox="0 0 24 24">

                <path
                  d="
                    M20 21
                    a8 8 0 0 0-16 0

                    M12 13
                    a5 5 0 1 0 0-10
                    5 5 0 0 0 0 10Z
                  "
                ></path>

              </svg>

              ${escaparHTML(
                usuario
              )}

            </span>


            <span>

              <svg viewBox="0 0 24 24">

                <circle
                  cx="12"
                  cy="12"
                  r="9"
                ></circle>

                <path
                  d="
                    M12 7v5
                    l3 2
                  "
                ></path>

              </svg>

              ${escaparHTML(
                fecha
              )}

            </span>

          </div>

        </div>

      `;


      const imageButton =
        card.querySelector(
          ".evidence-card__image-button"
        );


      if(imageButton){

        imageButton.addEventListener(
          "click",
          () => {

            abrirVisorEvidencia(
              item
            );

          }
        );

      }


      const image =
        card.querySelector(
          ".evidence-image"
        );


      if(image){

        image.addEventListener(
          "error",
          () => {

            image.classList.add(
              "evidence-image--error"
            );

            image.alt =
              "Imagen no disponible";

          }
        );

      }


      grid.appendChild(
        card
      );

    }
  );


  setTexto(
    "evidenceResults",
    `${evidencias.length} ${
      evidencias.length === 1
        ? "evidencia"
        : "evidencias"
    }`
  );

}


function actualizarResumenEvidencias(){

  const hoy =
    new Date();


  const registrosHoy =
    evidenciasActuales.filter(
      item => {


        const timestamp =
          obtenerTimestampEvidencia(
            item
          );


        if(!timestamp){
          return false;
        }


        const fecha =
          new Date(
            timestamp
          );


        return (
          fecha.getFullYear() ===
            hoy.getFullYear()

          &&

          fecha.getMonth() ===
            hoy.getMonth()

          &&

          fecha.getDate() ===
            hoy.getDate()
        );

      }
    )
    .length;


  setTexto(
    "evidenceTotal",
    evidenciasActuales.length
  );


  setTexto(
    "evidenceToday",
    registrosHoy
  );


  if(evidenciasActuales.length){

    setTexto(
      "evidenceLast",
      formatearFecha(
        obtenerFechaEvidencia(
          evidenciasActuales[0]
        )
      )
    );

  }

  else{

    setTexto(
      "evidenceLast",
      "—"
    );

  }

}


function abrirVisorEvidencia(
  item
){

  const viewer =
    $("evidenceViewer");


  if(!viewer){
    return;
  }


  const pieza =
    item.id_pieza
    ??
    "—";


  const image =
    $("viewerImage");


  if(image){

    image.src =
      item.imagen_url
      ||
      "";

    image.alt =
      `Evidencia de pieza ${pieza}`;

  }


  setTexto(
    "viewerTitle",
    `Pieza #${pieza}`
  );


  setTexto(
    "viewerPart",
    `#${pieza}`
  );


  setTexto(
    "viewerComment",
    item.comentario
    ||
    "Sin comentarios"
  );


  setTexto(
    "viewerUser",
    item.usuario
    ||
    "Usuario no disponible"
  );


  setTexto(
    "viewerDate",
    formatearFecha(
      obtenerFechaEvidencia(
        item
      )
    )
  );


  viewer.classList.add(
    "active"
  );


  viewer.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.classList.add(
    "viewer-open"
  );

}


function cerrarVisorEvidencia(){

  const viewer =
    $("evidenceViewer");


  if(!viewer){
    return;
  }


  viewer.classList.remove(
    "active"
  );


  viewer.setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.classList.remove(
    "viewer-open"
  );


  const image =
    $("viewerImage");


  if(image){

    image.removeAttribute(
      "src"
    );

  }

}


/* =========================================================
   16. AUDITORÍA
========================================================= */

async function cargarAuditoria(){

  const priorityList =
    $("auditPriorityList");


  if(priorityList){

    priorityList.innerHTML = `

      <div class="audit-loading-state">

        <span class="loading-spinner"></span>

        <div>

          <strong>
            Analizando inventario
          </strong>

          <span>
            Identificando componentes críticos...
          </span>

        </div>

      </div>

    `;

  }


  try{

    const data =
      await obtenerInventarioAPI();


    const total =
      data.length;


    const incidencias =
      data.filter(
        item => {

          return Number(
            item.cantidad || 0
          ) <= 1;

        }
      );


    const alertas =
      data.filter(
        item => {

          const cantidad =
            Number(
              item.cantidad || 0
            );

          return (
            cantidad > 1
            &&
            cantidad <= 3
          );

        }
      );


    const operacionales =
      data.filter(
        item => {

          return Number(
            item.cantidad || 0
          ) > 3;

        }
      );


    setTexto(
      "kpiIncidencias",
      incidencias.length
    );


    setTexto(
      "kpiAlertas",
      alertas.length
    );


    setTexto(
      "auditTotalComponents",
      total
    );


    setTexto(
      "auditOperational",
      operacionales.length
    );


    setTexto(
      "auditCriticalLegend",
      `${incidencias.length} ${
        incidencias.length === 1
          ? "componente"
          : "componentes"
      }`
    );


    setTexto(
      "auditWarningLegend",
      `${alertas.length} ${
        alertas.length === 1
          ? "componente"
          : "componentes"
      }`
    );


    setTexto(
      "auditOkLegend",
      `${operacionales.length} ${
        operacionales.length === 1
          ? "componente"
          : "componentes"
      }`
    );


    const porcentaje =
      total
        ? Math.round(
            (
              operacionales.length
              /
              total
            )
            *
            100
          )
        : 100;


    setTexto(
      "auditHealthPercentage",
      `${porcentaje}%`
    );


    const status =
      $("auditHealthStatus");


    if(status){

      status.removeAttribute(
        "data-status"
      );


      if(porcentaje >= 80){

        status.textContent =
          "Operación estable";

        status.dataset.status =
          "success";

      }

      else if(porcentaje >= 60){

        status.textContent =
          "Requiere seguimiento";

        status.dataset.status =
          "warning";

      }

      else{

        status.textContent =
          "Atención prioritaria";

        status.dataset.status =
          "critical";

      }

    }


    const ring =
      $("auditHealthRing");


    if(ring){

      ring.style.setProperty(
        "--health-value",
        porcentaje
      );

    }


    renderPrioridadesAuditoria(
      data
    );

  }

  catch(error){

    console.error(
      "Error auditoría:",
      error
    );


    if(priorityList){

      priorityList.innerHTML = `

        <div
          class="
            audit-empty-state
            audit-empty-state--error
          "
        >

          <div class="empty-state-icon">

            <svg viewBox="0 0 24 24">

              <path
                d="
                  M12 9v4
                  M12 17h.01

                  M10.3 4.2
                  2.3 18
                  a2 2 0 0 0 1.7 3h16
                  a2 2 0 0 0 1.7-3
                  l-8-13.8
                  a2 2 0 0 0-3.4 0Z
                "
              ></path>

            </svg>

          </div>

          <strong>
            No fue posible analizar el inventario
          </strong>

          <span>

            ${escaparHTML(
              error.message
            )}

          </span>

          <button
            type="button"
            class="primary-btn"
            onclick="cargarAuditoria()"
          >
            Reintentar
          </button>

        </div>

      `;

    }


    mostrarToast(
      "No fue posible actualizar Auditoría."
    );

  }

}


function renderPrioridadesAuditoria(
  data
){

  const container =
    $("auditPriorityList");


  if(!container){
    return;
  }


  const prioridades =
    data
      .filter(
        item => {

          return Number(
            item.cantidad || 0
          ) <= 3;

        }
      )
      .sort(
        (a,b) => {

          return (
            Number(
              a.cantidad || 0
            )
            -
            Number(
              b.cantidad || 0
            )
          );

        }
      )
      .slice(
        0,
        8
      );


  container.innerHTML = "";


  if(!prioridades.length){

    container.innerHTML = `

      <div class="audit-empty-state">

        <div
          class="
            empty-state-icon
            empty-state-icon--success
          "
        >

          <svg viewBox="0 0 24 24">

            <circle
              cx="12"
              cy="12"
              r="9"
            ></circle>

            <path
              d="
                m8 12
                2.5 2.5
                L16 9
              "
            ></path>

          </svg>

        </div>

        <strong>
          Inventario estable
        </strong>

        <span>
          No existen componentes con stock crítico.
        </span>

      </div>

    `;

    return;

  }


  prioridades.forEach(
    item => {


      const cantidad =
        Number(
          item.cantidad || 0
        );


      const critico =
        cantidad <= 1;


      const card =
        document.createElement(
          "article"
        );


      card.className =
        `audit-priority-item ${
          critico
            ? "critical"
            : "warning"
        }`;


      card.innerHTML = `

        <div
          class="
            audit-priority-status
            ${
              critico
                ? "audit-priority-status--critical"
                : "audit-priority-status--warning"
            }
          "
        >

          <svg viewBox="0 0 24 24">

            ${
              critico

                ? `
                  <path
                    d="
                      M12 3
                      2.5 20h19
                      L12 3Z
                      M12 9v5
                      M12 18h.01
                    "
                  ></path>
                `

                : `
                  <path
                    d="
                      M12 4v10
                      M12 18h.01

                      M5 20h14
                      a2 2 0 0 0 1.7-3

                      L13.7 5
                      a2 2 0 0 0-3.4 0

                      L3.3 17
                      A2 2 0 0 0 5 20Z
                    "
                  ></path>
                `
            }

          </svg>

        </div>


        <div class="audit-priority-info">

          <span>

            ${escaparHTML(
              item.no_parte
              ||
              `PIEZA-${item.id_pieza || "-"}`
            )}

          </span>

          <strong>

            ${escaparHTML(
              item.descripcion
              ||
              item.nombre
              ||
              "Componente sin descripción"
            )}

          </strong>

          <small>

            ${escaparHTML(
              item.modelo
                ? `Modelo ${item.modelo}`
                : "Modelo no disponible"
            )}

          </small>

        </div>


        <div class="audit-priority-stock">

          <span>
            Stock
          </span>

          <strong>
            ${cantidad}
          </strong>

          <small>

            ${
              critico
                ? "Paro de línea"
                : "Crítico"
            }

          </small>

        </div>

      `;


      container.appendChild(
        card
      );

    }
  );

}


/* =========================================================
   17. CRITICIDAD
========================================================= */

function obtenerClaseCriticidad(
  cantidad
){

  const stock =
    Number(
      cantidad || 0
    );


  if(stock <= 1){
    return "critical";
  }


  if(stock <= 3){
    return "warning";
  }


  return "ok";

}


function obtenerTextoCriticidad(
  cantidad
){

  const stock =
    Number(
      cantidad || 0
    );


  if(stock <= 1){
    return "PARO DE LINEA";
  }


  if(stock <= 3){
    return "CRÍTICO";
  }


  return "OPERACIONAL";

}


/* =========================================================
   18. WHATSAPP / ACCIONES GLOBALES
========================================================= */

function iniciarAccionesGlobales(){

  const btnWhats =
    $("btnWhats");


  if(btnWhats){

    btnWhats.addEventListener(
      "click",
      abrirSolicitudWhatsApp
    );

  }

}


function abrirSolicitudWhatsApp(){

  const mensaje =
    SEFERAN.whatsapp.mensaje;


  const url =
    `https://wa.me/${
      SEFERAN.whatsapp.numero
    }?text=${
      encodeURIComponent(
        mensaje
      )
    }`;


  const ventana =
    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );


  if(!ventana){

    window.location.href =
      url;

  }

}


/* =========================================================
   19. MOBILE NAV / MÁS
========================================================= */

function iniciarNavegacionMobile(){

  /* VERSION <details> */

  document
    .querySelectorAll(
      ".mobile-more"
    )
    .forEach(
      details => {


        const backdrop =
          details.querySelector(
            ".mobile-more-backdrop"
          );


        if(backdrop){

          backdrop.addEventListener(
            "click",
            () => {

              details.removeAttribute(
                "open"
              );

            }
          );

        }

      }
    );


  /* VERSION OVERLAY CON IDs */

  const moreButton =
    $("mobileMoreButton");

  const overlay =
    $("mobileMoreOverlay");

  const closeButton =
    $("closeMoreMenu");


  function abrirOverlay(){

    if(!overlay){
      return;
    }


    overlay.classList.add(
      "active"
    );


    overlay.setAttribute(
      "aria-hidden",
      "false"
    );


    if(moreButton){

      moreButton.setAttribute(
        "aria-expanded",
        "true"
      );

    }


    document.body.classList.add(
      "mobile-menu-open"
    );

  }


  function cerrarOverlay(){

    if(!overlay){
      return;
    }


    overlay.classList.remove(
      "active"
    );


    overlay.setAttribute(
      "aria-hidden",
      "true"
    );


    if(moreButton){

      moreButton.setAttribute(
        "aria-expanded",
        "false"
      );

    }


    document.body.classList.remove(
      "mobile-menu-open"
    );

  }


  if(
    moreButton
    &&
    overlay
  ){

    moreButton.addEventListener(
      "click",
      abrirOverlay
    );

  }


  if(closeButton){

    closeButton.addEventListener(
      "click",
      cerrarOverlay
    );

  }


  if(overlay){

    overlay.addEventListener(
      "click",
      event => {

        if(event.target === overlay){

          cerrarOverlay();

        }

      }
    );

  }


  document.addEventListener(
    "keydown",
    event => {

      if(event.key === "Escape"){

        cerrarOverlay();

        document
          .querySelectorAll(
            ".mobile-more[open]"
          )
          .forEach(
            details => {

              details.removeAttribute(
                "open"
              );

            }
          );

      }

    }
  );

}


/* =========================================================
   20. LOADER
========================================================= */

function mostrarLoader(mostrar){

  const loader =
    $("loadingOverlay");


  if(!loader){
    return;
  }


  if(mostrar){

    loader.classList.remove(
      "hidden"
    );

    loader.style.display =
      "flex";

  }

  else{

    loader.classList.add(
      "hidden"
    );

    loader.style.display =
      "none";

  }

}


/* =========================================================
   21. TOAST
========================================================= */

function mostrarToast(texto){

  const anterior =
    document.querySelector(
      ".toast"
    );


  if(anterior){

    anterior.remove();

  }


  const toast =
    document.createElement(
      "div"
    );


  toast.className =
    "toast";


  toast.textContent =
    texto;


  toast.setAttribute(
    "role",
    "status"
  );


  toast.setAttribute(
    "aria-live",
    "polite"
  );


  document.body.appendChild(
    toast
  );


  window.setTimeout(
    () => {

      toast.remove();

    },
    2600
  );

}


/* =========================================================
   22. THEME LEGACY
========================================================= */

function toggleTheme(){

  document.body.classList.toggle(
    "light-theme"
  );


  const claro =
    document.body.classList.contains(
      "light-theme"
    );


  localStorage.setItem(
    SEFERAN.storage.theme,
    claro
      ? "light"
      : "dark"
  );

}


/* =========================================================
   23. COMPATIBILIDAD
   Funciones expuestas para onclick del HTML existente.
========================================================= */

window.login =
  login;

window.logout =
  logout;

window.cargarInventario =
  cargarInventario;

window.sumar =
  sumar;

window.restar =
  restar;

window.abrirModal =
  abrirModal;

window.cerrarModal =
  cerrarModal;

window.guardarEvidencia =
  guardarEvidencia;

window.cargarEvidencias =
  cargarEvidencias;

window.cargarAuditoria =
  cargarAuditoria;

window.mostrarToast =
  mostrarToast;

window.toggleTheme =
  toggleTheme;
