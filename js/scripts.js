// 1. Configuración de Supabase
const SUPABASE_URL = 'https://bjoxgfdliyssihtumtfy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqb3hnZmRsaXlzc2lodHVtdGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyNTk4MzEsImV4cCI6MjEwMjgzNTgzMX0.aC8bq0_wGkKUTbkGZFBBub95nYnpbkEbrP5uOz2DAs8';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Arreglo global en memoria para acumular productos antes de enviarlos a la BD
let carritoPedidos = [];

// 2. Configuración de TMDb API
const TMDB_API_KEY = '55a377f499a3e9272413cafc42fdd7b7';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/w500';

document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
    cargarPeliculas();
    inicializarPayPal();

    // Eventos para el buscador de películas
    const btnBuscar = document.getElementById('btnBuscarPelicula');
    const inputBuscar = document.getElementById('inputPelicula');

    if (btnBuscar && inputBuscar) {
        btnBuscar.addEventListener('click', () => {
            const query = inputBuscar.value.trim();
            cargarPeliculas(query);
        });

        inputBuscar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = inputBuscar.value.trim();
                cargarPeliculas(query);
            }
        });
    }

    // Lógica del formulario de Telegram
    const telegramForm = document.getElementById('telegramForm');
    const mensajeInput = document.getElementById('mensajeTelegram');
    const resultadoMsg = document.getElementById('resultadoRespuesta');

    if (telegramForm) {
        telegramForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const mensaje = mensajeInput.value.trim();
            if (!mensaje) {
                mostrarMensaje('Por favor escribe un mensaje.', 'error');
                return;
            }

            mostrarMensaje('Enviando mensaje...', '');

            try {   
                const response = await fetch('/api/enviar_telegram.js', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mensaje: mensaje })
                });

                const data = await response.json();

                if (response.ok && data.status === 'success') {
                    mostrarMensaje('¡Mensaje enviado con éxito!', 'exito');
                    mensajeInput.value = '';
                } else {
                    mostrarMensaje('Error: ' + (data.message || 'No se pudo enviar el mensaje'), 'error');
                }
            } catch (error) {
                console.error(error);
                mostrarMensaje('Error en la conexión con el servidor.', 'error');
            }
        });
    }

    function mostrarMensaje(texto, tipo) {
        if (resultadoMsg) {
            resultadoMsg.textContent = texto;
            resultadoMsg.className = 'resultado-msg ' + tipo;
        }
    }
});

// 3. Cargar productos desde Supabase
async function cargarProductos() {
    const contenedor = document.getElementById('catalogo-productos');
    if (!contenedor) return;

    contenedor.innerHTML = '<p>Cargando productos...</p>';

    try {
        const { data: productos, error } = await supabaseClient
            .from('productos')
            .select('*');

        if (error) throw error;

        if (!productos || productos.length === 0) {
            contenedor.innerHTML = '<p>No hay productos disponibles por el momento.</p>';
            return;
        }

        contenedor.innerHTML = '';
        productos.forEach(prod => {
            const card = document.createElement('div');
            card.className = 'tarjeta-producto';
            card.style.border = "1px solid #e0e0e0";
            card.style.padding = "15px";
            card.style.borderRadius = "8px";
            card.style.textAlign = "center";

            const nombreIcono = prod.icono ? prod.icono.trim() : 'fa-pills';

            card.innerHTML = `
                <div class="icono-producto" style="font-size: 2.5rem; color: #007bff; margin-bottom: 10px;">
                    <i class="fa-solid ${nombreIcono}"></i>
                </div>
                <h3>${prod.nombre}</h3>
                <span class="categoria">${prod.categoria}</span>
                <p class="precio">$${parseFloat(prod.precio).toFixed(2)} MXN</p>
                <button class="btn-primary btn-pedir" style="margin-top:10px; cursor:pointer; background-color: #28a745; border: none; padding: 10px 15px; border-radius: 5px; color: white;" onclick="agregarAlCarrito('${prod.nombre}', ${prod.precio})">
                    <i class="fa-solid fa-cart-shopping"></i> Agregar producto
                </button>
            `;
            contenedor.appendChild(card);
        });

    } catch (err) {
        console.error('Error al obtener productos:', err);
        contenedor.innerHTML = '<p class="error">Error al cargar el catálogo de productos.</p>';
    }
}

// 4. Lógica para el carrito local agrupado por producto
function agregarAlCarrito(nombre, precio) {
    const contenedorMsg = document.getElementById('mensaje-pedido');
    if (contenedorMsg) {
        contenedorMsg.style.display = 'none';
    }

    const existe = carritoPedidos.find(item => item.producto_nombre === nombre);

    if (existe) {
        existe.cantidad += 1;
    } else {
        carritoPedidos.push({
            producto_nombre: nombre,
            precio: precio,
            cantidad: 1
        });
    }

    actualizarContadorCarrito();
}

// Controladores para modificar las cantidades directamente en la tabla
function incrementarCantidad(nombre) {
    const item = carritoPedidos.find(i => i.producto_nombre === nombre);
    if (item) {
        item.cantidad += 1;
        actualizarContadorCarrito();
    }
}

function decrementarCantidad(nombre) {
    const item = carritoPedidos.find(i => i.producto_nombre === nombre);
    if (item) {
        item.cantidad -= 1;
        if (item.cantidad <= 0) {
            eliminarProductoCarrito(nombre);
        } else {
            actualizarContadorCarrito();
        }
    }
}

function eliminarProductoCarrito(nombre) {
    carritoPedidos = carritoPedidos.filter(i => i.producto_nombre !== nombre);
    actualizarContadorCarrito();
}

function actualizarContadorCarrito() {
    const contadorElem = document.getElementById('contador-carrito');
    const totalElem = document.getElementById('total-carrito');
    const tablaContainer = document.getElementById('tabla-carrito-container');
    const montoPayPalDisplay = document.getElementById('monto-paypal-display');

    const cantidadTotal = carritoPedidos.reduce((suma, item) => suma + item.cantidad, 0);
    const totalDinero = carritoPedidos.reduce((suma, item) => suma + (item.precio * item.cantidad), 0);

    if (contadorElem) {
        contadorElem.textContent = cantidadTotal;
    }

    if (totalElem) {
        totalElem.textContent = `$${totalDinero.toFixed(2)} MXN`;
    }

    if (montoPayPalDisplay) {
        montoPayPalDisplay.textContent = `$${totalDinero.toFixed(2)} MXN`;
    }

    // Renderizar la tabla de productos con controles de cantidad
    if (tablaContainer) {
        if (carritoPedidos.length === 0) {
            tablaContainer.innerHTML = '';
        } else {
            let htmlTabla = `
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.95rem; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 2px solid #fd7e14; color: #333;">
                            <th style="padding: 6px; text-align: left;">Producto</th>
                            <th style="padding: 6px; text-align: center;">Cantidad</th>
                            <th style="padding: 6px; text-align: right;">Subtotal</th>
                            <th style="padding: 6px; text-align: center;">Quitar producto</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            carritoPedidos.forEach(item => {
                const subtotal = item.precio * item.cantidad;
                htmlTabla += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 6px; color: #444;">${item.producto_nombre}</td>
                        <td style="padding: 6px; text-align: center;">
                            <button style="cursor:pointer; padding: 2px 6px; font-weight: bold; margin-right: 4px;" onclick="decrementarCantidad('${item.producto_nombre}')">-</button>
                            <span style="font-weight: bold; color: #fd7e14;">${item.cantidad}</span>
                            <button style="cursor:pointer; padding: 2px 6px; font-weight: bold; margin-left: 4px;" onclick="incrementarCantidad('${item.producto_nombre}')">+</button>
                        </td>
                        <td style="padding: 6px; text-align: right; color: #333;">$${subtotal.toFixed(2)}</td>
                        <td style="padding: 6px; text-align: center;">
                            <button style="cursor:pointer; background-color: #dc3545; color: white; border: none; padding: 3px 7px; border-radius: 3px;" onclick="eliminarProductoCarrito('${item.producto_nombre}')" title="Quitar producto">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });

            htmlTabla += `
                    </tbody>
                </table>
            `;

            tablaContainer.innerHTML = htmlTabla;
        }
    }
}

// Notificación del carrito
function mostrarNotificacionPedido(texto, esError = false) {
    const contenedorMsg = document.getElementById('mensaje-pedido');
    if (!contenedorMsg) return;

    contenedorMsg.style.display = 'block';
    contenedorMsg.textContent = texto;

    if (esError) {
        contenedorMsg.style.backgroundColor = '#f8d7da';
        contenedorMsg.style.color = '#842029';
        contenedorMsg.style.border = '1px solid #f5c2c7';
    } else {
        contenedorMsg.style.backgroundColor = '#cff4fc';
        contenedorMsg.style.color = '#055160';
        contenedorMsg.style.border = '1px solid #b6effb';
    }
}

// 5. Insertar los elementos del carrito en Supabase
async function enviarTodosLosPedidos() {
    if (carritoPedidos.length === 0) {
        mostrarNotificacionPedido('Por favor, agrega al menos un producto al carrito antes de enviar.', true);
        return;
    }

    const btnEnviar = document.getElementById('btn-enviar-carrito');
    if (btnEnviar) btnEnviar.disabled = true;

    try {
        const { data, error } = await supabaseClient
            .from('pedidos')
            .insert(carritoPedidos);

        if (error) throw error;

        mostrarNotificacionPedido('¡Pedido enviado con éxito! En breve nos pondremos en contacto contigo.', false);
        
        carritoPedidos = [];
        actualizarContadorCarrito();

    } catch (err) {
        console.error('Error al enviar los pedidos:', err);
        mostrarNotificacionPedido('Hubo un inconveniente al registrar el pedido en la base de datos.', true);
    } finally {
        if (btnEnviar) btnEnviar.disabled = false;
    }
}

// 6. Cargar o buscar películas desde TMDb
async function cargarPeliculas(query = '') {
    const contenedor = document.getElementById('contenedor-peliculas');
    if (!contenedor) return;

    contenedor.innerHTML = '<p>Buscando películas...</p>';

    const url = query 
        ? `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(query)}&page=1`
        : `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=es-MX&page=1`;

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        const peliculas = data.results.slice(0, 6);

        if (peliculas.length === 0) {
            contenedor.innerHTML = '<p>No se encontraron películas con ese nombre.</p>';
            return;
        }

        contenedor.innerHTML = '';
        peliculas.forEach(pelicula => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.textAlign = 'center';
            card.style.border = "1px solid #e0e0e0";
            card.style.padding = "15px";
            card.style.borderRadius = "8px";

            const poster = pelicula.poster_path 
                ? `${TMDB_IMAGE_URL}${pelicula.poster_path}` 
                : 'https://via.placeholder.com/500x750?text=Sin+Imagen';

            card.innerHTML = `
                <img src="${poster}" alt="${pelicula.title}" style="width: 100%; border-radius: 8px; max-height: 280px; object-fit: cover;">
                <h3 style="margin-top: 10px; font-size: 1.1rem;">${pelicula.title}</h3>
                <p style="font-size: 0.85rem; color: #ff9800; font-weight: bold; margin: 5px 0;">⭐ ${(pelicula.vote_average || 0).toFixed(1)} / 10</p>
                <p style="font-size: 0.85rem; color: #555;">${pelicula.overview ? pelicula.overview.substring(0, 80) + '...' : 'Sin descripción disponible.'}</p>
            `;
            contenedor.appendChild(card);
        });

    } catch (error) {
        console.error('Error al obtener películas de TMDb:', error);
        contenedor.innerHTML = '<p class="error">Error al cargar la cartelera de películas.</p>';
    }
}

// 7. Integración de PayPal con el carrito de compras
function inicializarPayPal() {
    if (!window.paypal) return;

    paypal.Buttons({
        // Validación previa antes de abrir la ventana de PayPal
        onClick: (data, actions) => {
            const totalDinero = carritoPedidos.reduce((suma, item) => suma + (item.precio * item.cantidad), 0);
            if (totalDinero <= 0) {
                alert('El carrito está vacío. Agrega al menos un producto antes de pagar.');
                return actions.reject();
            }
            return actions.resolve();
        },

        // Crear la orden con el monto real del carrito en MXN
        createOrder: (data, actions) => {
            const totalDinero = carritoPedidos.reduce((suma, item) => suma + (item.precio * item.cantidad), 0);

            return actions.order.create({
                purchase_units: [{
                    amount: {
                        currency_code: 'MXN',
                        value: totalDinero.toFixed(2)
                    }
                }]
            });
        },

        // Capturar pago exitoso
        onApprove: (data, actions) => {
            return actions.order.capture().then(async details => {
                alert(`¡Pago completado con éxito por ${details.payer.name.given_name}! ID de Transacción: ${details.id}`);
                
                // Guardar los pedidos automáticamente en la BD tras el pago
                await enviarTodosLosPedidos();
            });
        },

        // Manejo de errores
        onError: (err) => {
            console.error('Error en el pago de PayPal:', err);
            alert('Ocurrió un error al procesar el pago con PayPal.');
        }
    }).render('#paypal-button-container');
}