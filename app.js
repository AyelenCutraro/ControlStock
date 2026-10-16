"use strict";

// 1. Conectamos JavaScript con los elementos HTML.
const formulario = document.getElementById("form-producto");
const tabla = document.getElementById("tabla-productos");
const buscador = document.getElementById("buscador");
const mensaje = document.getElementById("mensaje");
const sinProductos = document.getElementById("sin-productos");

// 2. Recuperamos los productos guardados en el navegador.
function cargarProductos() {
  try {
    const datos = localStorage.getItem("stocksmart-productos");
    return datos ? JSON.parse(datos) : [];
  } catch {
    return [];
  }
}

let productos = cargarProductos();

// 3. Guardamos los productos.
function guardarProductos() {
  localStorage.setItem(
    "stocksmart-productos",
    JSON.stringify(productos)
  );
}

// 4. Damos formato a los importes.
function formatoDinero(valor) {
  return valor.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS"
  });
}

// 5. Calculamos y actualizamos las estadísticas.
function actualizarEstadisticas() {
  const totalProductos = productos.length;

  const totalUnidades = productos.reduce(
    (acumulado, producto) => acumulado + producto.cantidad,
    0
  );

  const valorInventario = productos.reduce(
    (acumulado, producto) =>
      acumulado + producto.precio * producto.cantidad,
    0
  );

  const stockBajo = productos.filter(
    producto => producto.cantidad <= producto.minimo
  ).length;

  document.getElementById("total-productos").textContent =
    totalProductos;

  document.getElementById("total-unidades").textContent =
    totalUnidades;

  document.getElementById("valor-inventario").textContent =
    formatoDinero(valorInventario);

  document.getElementById("stock-bajo").textContent =
    stockBajo;
}

// 6. Mostramos los productos en la tabla.
function mostrarProductos() {
  tabla.replaceChildren();

  const busqueda = buscador.value.trim().toLowerCase();

  const productosFiltrados = productos.filter(producto =>
    producto.nombre.toLowerCase().includes(busqueda) ||
    producto.codigo.toLowerCase().includes(busqueda) ||
    producto.categoria.toLowerCase().includes(busqueda)
  );

  sinProductos.hidden = productosFiltrados.length > 0;

  if (productos.length === 0) {
    sinProductos.textContent =
      "Todavía no hay productos. Agregá el primero con el formulario.";
  } else if (productosFiltrados.length === 0) {
    sinProductos.textContent =
      "No se encontraron productos con esa búsqueda.";
  }

  productosFiltrados.forEach(producto => {
    const fila = document.createElement("tr");

    agregarCelda(fila, producto.nombre);
    agregarCelda(fila, producto.codigo);
    agregarCelda(fila, producto.categoria);
    agregarCelda(fila, formatoDinero(producto.precio));
    agregarCelda(fila, producto.cantidad);

    // Estado del stock.
    const celdaEstado = document.createElement("td");
    const etiqueta = document.createElement("span");
    etiqueta.classList.add("badge");

    if (producto.cantidad === 0) {
      etiqueta.classList.add("out");
      etiqueta.textContent = "Sin stock";
    } else if (producto.cantidad <= producto.minimo) {
      etiqueta.classList.add("low");
      etiqueta.textContent = "Stock bajo";
    } else {
      etiqueta.classList.add("ok");
      etiqueta.textContent = "Disponible";
    }

    celdaEstado.appendChild(etiqueta);
    fila.appendChild(celdaEstado);

    // Botones para modificar las cantidades.
    const celdaAcciones = document.createElement("td");

    const botonEntrada = document.createElement("button");
    botonEntrada.textContent = "+1";
    botonEntrada.className = "action-button";
    botonEntrada.title = "Registrar una unidad de entrada";
    botonEntrada.setAttribute("aria-label",
      "Agregar una unidad a " + producto.nombre);

    botonEntrada.addEventListener("click", () => {
      cambiarStock(producto.id, 1);
    });

    const botonSalida = document.createElement("button");
    botonSalida.textContent = "-1";
    botonSalida.className = "action-button";
    botonSalida.title = "Registrar una unidad de salida";
    botonSalida.setAttribute("aria-label",
      "Retirar una unidad de " + producto.nombre);

    botonSalida.disabled = producto.cantidad === 0;

    botonSalida.addEventListener("click", () => {
      cambiarStock(producto.id, -1);
    });

    const botonEliminar = document.createElement("button");
    botonEliminar.textContent = "Eliminar";
    botonEliminar.className = "action-button delete-button";

    botonEliminar.addEventListener("click", () => {
      eliminarProducto(producto.id);
    });

    celdaAcciones.append(
      botonEntrada,
      botonSalida,
      botonEliminar
    );

    fila.appendChild(celdaAcciones);
    tabla.appendChild(fila);
  });

  actualizarEstadisticas();
}

// Función auxiliar para crear celdas de texto.
function agregarCelda(fila, texto) {
  const celda = document.createElement("td");
  celda.textContent = texto;
  fila.appendChild(celda);
}

// 7. Registramos un producto nuevo.
formulario.addEventListener("submit", evento => {
  evento.preventDefault();
  mensaje.textContent = "";
  mensaje.classList.remove("error");

  const nombre = document.getElementById("nombre").value.trim();
  const codigo = document.getElementById("codigo").value.trim();
  const categoria = document.getElementById("categoria").value.trim();
  const precio = Number(document.getElementById("precio").value);
  const cantidad = Number(document.getElementById("cantidad").value);
  const minimo = Number(document.getElementById("minimo").value);

  if (!nombre || !codigo || !categoria) {
    mostrarMensaje("Completá todos los campos.", true);
    return;
  }

  if (!Number.isFinite(precio) || precio <= 0) {
    mostrarMensaje("El precio debe ser mayor que cero.", true);
    return;
  }

  if (
    !Number.isSafeInteger(cantidad) ||
    cantidad < 0 ||
    !Number.isSafeInteger(minimo) ||
    minimo < 0
  ) {
    mostrarMensaje("Las cantidades deben ser enteros no negativos.", true);
    return;
  }

  const codigoExiste = productos.some(
    producto => producto.codigo.toLowerCase() === codigo.toLowerCase()
  );

  if (codigoExiste) {
    mostrarMensaje("Ya existe un producto con ese código SKU.", true);
    return;
  }

  const nuevoProducto = {
    id: crypto.randomUUID(),
    nombre,
    codigo,
    categoria,
    precio,
    cantidad,
    minimo
  };

  productos.push(nuevoProducto);
  guardarProductos();

  formulario.reset();
  document.getElementById("cantidad").value = 0;
  document.getElementById("minimo").value = 5;

  mostrarProductos();
  mostrarMensaje("Producto registrado correctamente.");
});

// 8. Registramos entradas y salidas de stock.
function cambiarStock(id, variacion) {
  const producto = productos.find(item => item.id === id);

  if (!producto) return;

  if (producto.cantidad + variacion < 0) {
    mostrarMensaje("No hay unidades suficientes para esa salida.", true);
    return;
  }

  producto.cantidad += variacion;

  guardarProductos();
  mostrarProductos();

  mostrarMensaje(
    variacion > 0
      ? "Entrada de stock registrada."
      : "Salida de stock registrada."
  );
}

// 9. Eliminamos un producto.
function eliminarProducto(id) {
  const producto = productos.find(item => item.id === id);

  if (!producto) return;

  const confirmar = window.confirm(
    "¿Querés eliminar el producto " + producto.nombre + "?"
  );

  if (!confirmar) return;

  productos = productos.filter(item => item.id !== id);

  guardarProductos();
  mostrarProductos();
  mostrarMensaje("Producto eliminado.");
}

// 10. Mostramos mensajes al usuario.
function mostrarMensaje(texto, esError = false) {
  mensaje.textContent = texto;
  mensaje.classList.toggle("error", esError);
}

// 11. Actualizamos la tabla al buscar.
buscador.addEventListener("input", mostrarProductos);

// 12. Inicializamos la aplicación.
mostrarProductos();
