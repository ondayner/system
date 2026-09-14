import { supabase } from '../supabaseClient.js';

let facturasGlobal = [];
let clientesList = [];
let serviciosList = [];
let servicioSeleccionado = null;
let clienteSeleccionadoObj = null;
let TASA_CAMBIO_ACTUAL = 0.00; // Se obtiene en tiempo real desde API BCV

document.addEventListener('DOMContentLoaded', () => {
  inicializarDatosSistema();

  document.getElementById('filtroEstatus')?.addEventListener('change', filtrarDatos);
  document.getElementById('filtroTipoFecha')?.addEventListener('change', filtrarDatos);
  document.getElementById('filtroDesde')?.addEventListener('change', filtrarDatos);
  document.getElementById('filtroHasta')?.addEventListener('change', filtrarDatos);
  document.getElementById('btnActualizarHeader')?.addEventListener('click', inicializarDatosSistema);

  setupBuscadorClientes();

  const modal = document.getElementById('modalFactura');
  const modalServicios = document.getElementById('modalServicios');
  const modalNuevoServicio = document.getElementById('modalNuevoServicio');
  const modalAlerta = document.getElementById('modalAlerta');

  document.getElementById('btnAbrirAgregar')?.addEventListener('click', () => {
    document.getElementById('formFactura').reset();
    document.getElementById('facFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('facEstatus').value = 'ACTIVO';
    document.getElementById('facTipoFactura').value = 'VENTA';
    clienteSeleccionadoObj = null;
    servicioSeleccionado = null;
    limpiarInfoCliente();
    renderizarDetalleServicioVacio();
    modal.classList.remove('hidden');
  });

  document.getElementById('btnCerrarModal')?.addEventListener('click', () => modal.classList.add('hidden'));
  document.getElementById('btnCancelarModal')?.addEventListener('click', () => modal.classList.add('hidden'));
  document.getElementById('btnCerrarAlerta')?.addEventListener('click', () => modalAlerta.classList.add('hidden'));

  // Botón para deseleccionar cliente
  document.getElementById('btnLimpiarCliente')?.addEventListener('click', () => {
    document.getElementById('facRazonSocial').value = '';
    clienteSeleccionadoObj = null;
    servicioSeleccionado = null;
    limpiarInfoCliente();
    renderizarDetalleServicioVacio();
  });

  // Validación estricta: Elegir servicio solo si hay cliente seleccionado
  document.getElementById('btnElegirServicio')?.addEventListener('click', () => {
    const inputRazon = document.getElementById('facRazonSocial').value.trim();
    if (!clienteSeleccionadoObj && !inputRazon) {
      mostrarAlerta('Debe seleccionar obligatoriamente un cliente antes de elegir un servicio.');
      return;
    }
    renderizarTablaServiciosModal(serviciosList);
    modalServicios.classList.remove('hidden');
  });

  document.getElementById('btnCerrarModalServicios')?.addEventListener('click', () => modalServicios.classList.add('hidden'));
  document.getElementById('btnSalirServicios')?.addEventListener('click', () => modalServicios.classList.add('hidden'));

  // Abrir modal visual para nuevo servicio
  document.getElementById('btnNuevoServicioPrompt')?.addEventListener('click', () => {
    document.getElementById('formNuevoServicio').reset();
    const lblTasa = document.getElementById('tasaSistemaTxt');
    if (lblTasa) lblTasa.textContent = `${TASA_CAMBIO_ACTUAL.toFixed(2)} BS/$`;
    modalNuevoServicio.classList.remove('hidden');
  });

  document.getElementById('btnCerrarModalNuevoServicio')?.addEventListener('click', () => modalNuevoServicio.classList.add('hidden'));
  document.getElementById('btnCancelarNuevoServicio')?.addEventListener('click', () => modalNuevoServicio.classList.add('hidden'));

  // Cálculo en tiempo real al escribir en USD en el modal de nuevo servicio
  document.getElementById('nuevoServicioUsd')?.addEventListener('input', (e) => {
    const usd = parseFloat(e.target.value) || 0;
    const bs = usd * TASA_CAMBIO_ACTUAL;
    document.getElementById('equivalenteBsTxt').textContent = `${bs.toFixed(2)} BS`;
  });

  // Guardar nuevo servicio en Supabase
  document.getElementById('formNuevoServicio')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nuevoServicioNombre').value.trim().toUpperCase();
    const montoUsd = parseFloat(document.getElementById('nuevoServicioUsd').value) || 0;
    const meses = parseInt(document.getElementById('nuevoServicioMeses').value) || 1;
    const nota = document.getElementById('nuevoServicioNota').value.trim();
    const montoBs = montoUsd * TASA_CAMBIO_ACTUAL;

    const { data, error } = await supabase.from('servicios').insert([{
      nombre,
      monto_usd: montoUsd,
      monto_bs: montoBs,
      meses,
      nota,
      estatus: 'ACTIVO'
    }]).select().single();

    if (error) {
      mostrarAlerta('Error al crear servicio: ' + error.message);
    } else {
      serviciosList.push(data);
      renderizarTablaServiciosModal(serviciosList);
      modalNuevoServicio.classList.add('hidden');
    }
  });

  document.getElementById('buscadorServicioModal')?.addEventListener('input', (e) => {
    const txt = e.target.value.toLowerCase();
    const filtrados = serviciosList.filter(s => (s.nombre || '').toLowerCase().includes(txt));
    renderizarTablaServiciosModal(filtrados);
  });

  // Botón Exportar a Excel (CSV) en Facturas
  document.getElementById('btnExportarCsv')?.addEventListener('click', () => {
    if (facturasGlobal.length === 0) {
      mostrarAlerta('No hay registros de facturas para exportar.');
      return;
    }

    const cabeceras = ['id', 'fecha_registro', 'fecha_factura', 'razon_social', 'transaccion', 'total_iva', 'base_imponible', 'referencia_usd', 'factura_num', 'estatus', 'usuario'];
    let csvContenido = cabeceras.join(',') + '\n';

    facturasGlobal.forEach(fac => {
      const fila = cabeceras.map(cabecera => {
        let val = fac[cabecera] !== null && fac[cabecera] !== undefined ? String(fac[cabecera]) : '';
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      csvContenido += fila.join(',') + '\n';
    });

    const blob = new Blob([csvContenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `facturas_galaxgps_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  document.getElementById('formFactura')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const razonSocial = document.getElementById('facRazonSocial').value.trim().toUpperCase();
    const baseImponible = parseFloat(document.getElementById('facResumenBase').value) || 0;
    const totalIva = parseFloat(document.getElementById('facResumenTotal').value) || 0;
    const refUsd = parseFloat(document.getElementById('facResumenRef').value) || 0;
    const facturaNum = document.getElementById('facNumero').value.trim();
    const fechaFac = document.getElementById('facFecha').value || new Date().toISOString().split('T')[0];
    const estatusFac = document.getElementById('facEstatus').value;
    const tipoTransaccion = document.getElementById('facTipoFactura').value;

    if (!razonSocial) {
      mostrarAlerta('Debe seleccionar una Razón Social.');
      return;
    }

    const { data: facturaRes, error: errFac } = await supabase.from('facturas').insert([{
      razon_social: razonSocial,
      base_imponible: baseImponible,
      total_iva: totalIva,
      referencia_usd: refUsd,
      factura_num: facturaNum,
      fecha_factura: fechaFac,
      estatus: estatusFac,
      transaccion: tipoTransaccion,
      usuario: 'ADMINISTRADOR'
    }]).select().single();

    if (errFac) {
      mostrarAlerta('Error al registrar factura: ' + errFac.message);
      return;
    }

    await supabase.from('pagos').insert([{
      factura_id: facturaRes.id,
      cliente: razonSocial,
      monto_bs: totalIva * TASA_CAMBIO_ACTUAL,
      ref_usd: refUsd,
      referencia: 'AUTO-' + Math.floor(100000 + Math.random() * 900000),
      tipo_pago: 'PAGO MOVIL',
      observacion: 'AUTOGENERADO POR FACTURA'
    }]);

    modal.classList.add('hidden');
    cargarFacturas();
  });
});

async function inicializarDatosSistema() {
  await cargarTasaCambioReal();
  await cargarClientesYServicios();
  await cargarFacturas();
}

async function cargarTasaCambioReal() {
  try {
    const response = await fetch('https://pydolarvenezuela-api.vercel.app/api/v1/dollar?monitor=bcv');
    const data = await response.json();
    if (data && data.price) {
      TASA_CAMBIO_ACTUAL = Number(data.price);
    } else {
      const resAlt = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      const dataAlt = await resAlt.json();
      if (dataAlt && dataAlt.promedio) {
        TASA_CAMBIO_ACTUAL = Number(dataAlt.promedio);
      }
    }
  } catch (e) {
    TASA_CAMBIO_ACTUAL = 820.00; // Valor de respaldo por defecto en caso de fallo de red
  }
}

async function cargarClientesYServicios() {
  const [resCli, resServ] = await Promise.all([
    supabase.from('clientes').select('*'),
    supabase.from('servicios').select('*').eq('estatus', 'ACTIVO')
  ]);
  if (resCli.data) clientesList = resCli.data;
  if (resServ.data) serviciosList = resServ.data;
}

function setupBuscadorClientes() {
  const input = document.getElementById('facRazonSocial');
  const contenedor = document.getElementById('sugerenciasClientes');
  if (!input || !contenedor) return;

  const mostrarSugerencias = () => {
    const texto = input.value.toLowerCase().trim();
    const filtrados = texto 
      ? clientesList.filter(c => (c.nombres || '').toLowerCase().includes(texto) || (c.rif || '').toLowerCase().includes(texto)).slice(0, 5)
      : clientesList.slice(0, 5);

    if (filtrados.length === 0) {
      contenedor.classList.add('hidden');
      contenedor.innerHTML = '';
      return;
    }

    contenedor.innerHTML = '';
    filtrados.forEach(c => {
      const nombreCli = c.nombres || '';
      const div = document.createElement('div');
      div.className = 'p-2.5 text-slate-300 hover:bg-amber-600/30 hover:text-white cursor-pointer transition-colors';
      div.textContent = `${nombreCli} (${c.rif || 'S/N'})`;
      div.addEventListener('click', () => {
        input.value = nombreCli;
        clienteSeleccionadoObj = c;
        mostrarInfoCliente(c);
        contenedor.classList.add('hidden');
      });
      contenedor.appendChild(div);
    });
    contenedor.classList.remove('hidden');
  };

  input.addEventListener('input', () => {
    mostrarSugerencias();
    const encontrado = clientesList.find(c => (c.nombres || '').toUpperCase() === input.value.toUpperCase().trim());
    if (encontrado) {
      clienteSeleccionadoObj = encontrado;
      mostrarInfoCliente(encontrado);
    } else {
      clienteSeleccionadoObj = null;
      limpiarInfoCliente();
    }
  });

  input.addEventListener('focus', mostrarSugerencias);
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !contenedor.contains(e.target)) {
      contenedor.classList.add('hidden');
    }
  });
}

function mostrarInfoCliente(c) {
  document.getElementById('infoClienteNombre').textContent = c.nombres || '-';
  document.getElementById('infoClienteCedula').textContent = c.rif || '-';
  document.getElementById('infoClienteTelefono').textContent = c.telefono || '-';
  document.getElementById('infoClienteDireccion').textContent = c.direccion || '-';
}

function limpiarInfoCliente() {
  document.getElementById('infoClienteNombre').textContent = '-';
  document.getElementById('infoClienteCedula').textContent = '-';
  document.getElementById('infoClienteTelefono').textContent = '-';
  document.getElementById('infoClienteDireccion').textContent = '-';
}

function renderizarTablaServiciosModal(lista) {
  const tbody = document.getElementById('tablaServiciosDisponibles');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-slate-500">No hay servicios activos disponibles.</td></tr>`;
    return;
  }

  lista.forEach(s => {
    const montoBsCalculado = (Number(s.monto_usd || 0) * TASA_CAMBIO_ACTUAL).toFixed(2);

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/60 cursor-pointer transition-colors';
    tr.innerHTML = `
      <td class="p-2.5 border-r border-slate-800 font-mono text-amber-400 font-bold">${s.id}</td>
      <td class="p-2.5 border-r border-slate-800 font-bold text-white">${s.nombre}</td>
      <td class="p-2.5 border-r border-slate-800 font-mono text-emerald-400">${Number(s.monto_usd || 0).toFixed(2)}</td>
      <td class="p-2.5 border-r border-slate-800 font-mono text-slate-300">${montoBsCalculado}</td>
      <td class="p-2.5 font-mono">${s.meses || 1}</td>
    `;
    tr.addEventListener('click', () => {
      seleccionarServicio(s);
      document.getElementById('modalServicios').classList.add('hidden');
    });
    tbody.appendChild(tr);
  });
}

function seleccionarServicio(s) {
  servicioSeleccionado = s;
  const montoBsCalculado = (Number(s.monto_usd || 0) * TASA_CAMBIO_ACTUAL).toFixed(2);

  const tbody = document.getElementById('tablaDetalleServicios');
  tbody.innerHTML = `
    <tr>
      <td class="p-2 border-r border-slate-800 font-mono text-amber-400 font-bold">${s.id}</td>
      <td class="p-2 border-r border-slate-800 font-bold text-white">${s.nombre}</td>
      <td class="p-2 border-r border-slate-800 font-mono">${Number(s.monto_usd || 0).toFixed(2)} USD</td>
      <td class="p-2 border-r border-slate-800 font-mono text-amber-300">${montoBsCalculado} BS</td>
      <td class="p-2 border-r border-slate-800 font-mono text-emerald-400 font-bold">${Number(s.monto_usd || 0).toFixed(2)}</td>
      <td class="p-2 font-mono">1</td>
    </tr>
  `;

  document.getElementById('facResumenBase').value = Number(s.monto_usd || 0).toFixed(2);
  document.getElementById('facResumenRef').value = Number(s.monto_usd || 0).toFixed(2);
  calcularTotales();
}

function renderizarDetalleServicioVacio() {
  const tbody = document.getElementById('tablaDetalleServicios');
  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-slate-500 italic">Ningún servicio seleccionado. Seleccione un cliente primero y luego haga clic en "Elegir Servicio".</td></tr>`;
  document.getElementById('facResumenBase').value = '0.00';
  document.getElementById('facResumenTotal').value = '0.00';
  document.getElementById('facResumenRef').value = '0.00';
}

function calcularTotales() {
  const base = parseFloat(document.getElementById('facResumenBase').value) || 0;
  const porcIva = parseFloat(document.getElementById('facIvaPorc').value) || 0;
  const montoIva = base * (porcIva / 100);
  const total = base + montoIva;
  document.getElementById('facResumenTotal').value = total.toFixed(2);
}

async function cargarFacturas() {
  const { data, error } = await supabase.from('facturas').select('*').order('id', { ascending: false });
  if (error) return;
  facturasGlobal = data || [];
  renderizar(facturasGlobal);
}

function renderizar(lista) {
  const tbody = document.getElementById('tablaFacturasBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  document.getElementById('contadorRegistros').textContent = `Cant : ${lista.length}`;

  let sumaBaseIva = 0;
  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-6 text-slate-500">No hay facturas registradas.</td></tr>`;
    document.getElementById('txtTotalBaseIva').textContent = '0.00';
    return;
  }

  lista.forEach(fac => {
    sumaBaseIva += Number(fac.base_imponible || 0);
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-800/60 hover:bg-slate-800/40 cursor-pointer transition-colors';
    tr.innerHTML = `
      <td class="p-3.5 border-r border-slate-800/50 font-mono text-amber-400 font-bold">${fac.id}</td>
      <td class="p-3.5 border-r border-slate-800/50 font-mono text-slate-400">${fac.fecha_registro || ''}</td>
      <td class="p-3.5 border-r border-slate-800/50 font-mono text-slate-400">${fac.fecha_factura || ''}</td>
      <td class="p-3.5 border-r border-slate-800/50 font-bold text-white">${fac.razon_social || ''}</td>
      <td class="p-3.5 border-r border-slate-800/50 text-slate-300">${fac.transaccion || 'VENTA'}</td>
      <td class="p-3.5 border-r border-slate-800/50 font-mono text-amber-300 font-bold">${Number(fac.total_iva || 0).toFixed(2)}</td>
      <td class="p-3.5 border-r border-slate-800/50 font-mono text-slate-300">${Number(fac.base_imponible || 0).toFixed(2)}</td>
      <td class="p-3.5 border-r border-slate-800/50 font-mono text-emerald-400 font-bold">${Number(fac.referencia_usd || 0).toFixed(2)}</td>
      <td class="p-3.5 border-r border-slate-800/50 font-mono text-slate-300">${fac.factura_num || '0'}</td>
      <td class="p-3.5 text-slate-400">${fac.usuario || ''}</td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById('txtTotalBaseIva').textContent = sumaBaseIva.toFixed(2);
}

function filtrarDatos() {
  const estatusFiltro = document.getElementById('filtroEstatus').value;
  const desde = document.getElementById('filtroDesde').value;
  const hasta = document.getElementById('filtroHasta').value;

  const filtrados = facturasGlobal.filter(fac => {
    if (estatusFiltro !== 'TODOS' && fac.estatus !== estatusFiltro) return false;
    if (desde && fac.fecha_registro < desde) return false;
    if (hasta && fac.fecha_registro > hasta) return false;
    return true;
  });
  renderizar(filtrados);
}

function mostrarAlerta(msg) {
  document.getElementById('textoAlertaModal').textContent = msg;
  document.getElementById('modalAlerta').classList.remove('hidden');
}