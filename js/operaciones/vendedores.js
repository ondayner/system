import { supabase } from '../supabaseClient.js';

let vendedoresGlobal = [];
let vehiculosGlobal = [];
let clientesGlobal = [];
let vendedorSeleccionadoId = null;
let modoEdicion = false;

document.addEventListener('DOMContentLoaded', () => {
  cargarDatosYProcesar();

  document.getElementById('inputBuscador')?.addEventListener('input', filtrarTabla);
  document.getElementById('btnActualizarHeader')?.addEventListener('click', cargarDatosYProcesar);

  const modalVendedor = document.getElementById('modalVendedor');
  const modalDetalles = document.getElementById('modalDetalles');
  const modalAlerta = document.getElementById('modalAlerta');

  // Abrir Modal Agregar Vendedor
  document.getElementById('btnAbrirAgregar')?.addEventListener('click', () => {
    modoEdicion = false;
    limpiarErrores();
    document.getElementById('modalTitulo').innerHTML = `<i class="fa-solid fa-user-plus text-blue-500"></i> Registrar Nuevo Técnico / Vendedor`;
    document.getElementById('formVendedor').reset();
    
    const inputId = document.getElementById('vendedorIdNum');
    if (inputId) {
      inputId.value = '';
      inputId.disabled = false;
    }
    modalVendedor.classList.remove('hidden');
  });

  // Abrir Modal Editar Vendedor
  document.getElementById('btnAbrirEditar')?.addEventListener('click', () => {
    if (!vendedorSeleccionadoId) {
      mostrarAlertaModal('Debe Seleccionar un Vendedor de la tabla.');
      return;
    }
    modoEdicion = true;
    limpiarErrores();
    document.getElementById('modalTitulo').innerHTML = `<i class="fa-solid fa-pen-to-square text-blue-500"></i> Modificar Vendedor`;
    
    const v = vendedoresGlobal.find(item => item.id === vendedorSeleccionadoId);
    if (v) {
      const inputId = document.getElementById('vendedorIdNum');
      if (inputId) {
        inputId.value = v.id;
        inputId.disabled = true;
      }
      document.getElementById('vendedorNombre').value = v.nombre || '';
    }
    modalVendedor.classList.remove('hidden');
  });

  // Botón Detalles (Ver equipos y vehículos asignados al técnico)
  document.getElementById('btnDetalles')?.addEventListener('click', () => {
    if (!vendedorSeleccionadoId) {
      mostrarAlertaModal('Debe Seleccionar un Vendedor de la tabla.');
      return;
    }
    const v = vendedoresGlobal.find(item => item.id === vendedorSeleccionadoId);
    if (v) {
      abrirModalDetalles(v);
    }
  });

  document.getElementById('btnCerrarModalVendedor')?.addEventListener('click', () => modalVendedor.classList.add('hidden'));
  document.getElementById('btnCancelarModal')?.addEventListener('click', () => modalVendedor.classList.add('hidden'));
  document.getElementById('btnCerrarModalDetalles')?.addEventListener('click', () => modalDetalles.classList.add('hidden'));
  document.getElementById('btnCerrarAlerta')?.addEventListener('click', () => modalAlerta.classList.add('hidden'));

  // Submit Formulario Vendedor (Guardar / Actualizar en Supabase)
  document.getElementById('formVendedor')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    limpiarErrores();

    const idInput = parseInt(document.getElementById('vendedorIdNum').value);
    const nombreVal = document.getElementById('vendedorNombre').value.trim().toUpperCase();

    if (!modoEdicion) {
      const existe = vendedoresGlobal.some(v => v.id === idInput || v.nombre.toLowerCase() === nombreVal.toLowerCase());
      if (existe) {
        mostrarErrorSpan('errorId', 'El ID o nombre ya se encuentra registrado.');
        return;
      }
    }

    const datosForm = { id: idInput, nombre: nombreVal };

    let res;
    if (modoEdicion) {
      res = await supabase.from('vendedores').update(datosForm).eq('id', idInput);
    } else {
      res = await supabase.from('vendedores').insert([datosForm]);
    }

    const { error } = res;
    if (error) {
      mostrarAlertaModal('Error al guardar vendedor: ' + error.message);
      return;
    }

    modalVendedor.classList.add('hidden');
    cargarDatosYProcesar();
  });
});

async function cargarDatosYProcesar() {
  const tbody = document.getElementById('tablaVendedoresBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Cargando tabla de vendedores...</td></tr>`;

  // 1. Consultar la tabla de vendedores y los datos de vehículos y clientes
  const { data: vendedores, error: errV } = await supabase.from('vendedores').select('*').order('id', { ascending: true });
  const { data: vehiculos } = await supabase.from('vehiculos').select('*');
  const { data: clientes } = await supabase.from('clientes').select('*');

  if (errV) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-rose-400 font-bold">Error al conectar con la tabla 'vendedores' de Supabase. Asegúrate de crearla.</td></tr>`;
    return;
  }

  vendedoresGlobal = vendedores || [];
  vehiculosGlobal = vehiculos || [];
  clientesGlobal = clientes || [];

  renderizarTabla(vendedoresGlobal);
}

function renderizarTabla(lista) {
  const tbody = document.getElementById('tablaVendedoresBody');
  const contador = document.getElementById('contadorRegistros');
  if (!tbody) return;

  tbody.innerHTML = '';
  if (contador) contador.textContent = `Cant : ${lista.length}`;

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500">No hay vendedores registrados en la base de datos.</td></tr>`;
    return;
  }

  const hoyStr = new Date().toISOString().split('T')[0];

  lista.forEach((v) => {
    // Cruce de datos: Filtrar vehículos donde el técnico asignado coincida con el nombre del vendedor
    const vehiculosAsociados = vehiculosGlobal.filter(veh => {
      const tecnicoVehiculo = (veh.tecnico || veh.responsable || veh.canal || '').trim().toUpperCase();
      return tecnicoVehiculo.includes(v.nombre.toUpperCase());
    });

    const cantVehiculos = vehiculosAsociados.length;
    
    // Contar clientes asociados
    const clientesAsociados = clientesGlobal.filter(c => {
      const vendedorCli = (c.vendedor || '').trim().toUpperCase();
      return vendedorCli.includes(v.nombre.toUpperCase());
    });
    const cantClientes = clientesAsociados.length;

    let vencidos = 0;
    let solventes = 0;

    vehiculosAsociados.forEach(veh => {
      if (veh.vencimiento && veh.vencimiento < hoyStr) {
        vencidos++;
      } else {
        solventes++;
      }
    });

    const row = document.createElement('tr');
    row.className = 'border-b border-slate-800/60 hover:bg-slate-800/40 cursor-pointer transition-colors';
    
    row.addEventListener('click', () => {
      document.querySelectorAll('#tablaVendedoresBody tr').forEach(tr => tr.classList.remove('bg-blue-600/20', 'border-blue-500/40'));
      row.classList.add('bg-blue-600/20', 'border-blue-500/40');
      vendedorSeleccionadoId = v.id;
    });

    row.innerHTML = `
      <td class="p-3.5 border-r border-slate-800/50 font-mono text-blue-400 font-bold">${v.id}</td>
      <td class="p-3.5 border-r border-slate-800/50 font-bold text-white">${v.nombre}</td>
      <td class="p-3.5 border-r border-slate-800/50 font-mono text-center text-slate-300 font-bold">${cantVehiculos}</td>
      <td class="p-3.5 border-r border-slate-800/50 font-mono text-center text-slate-300">${cantClientes}</td>
      <td class="p-3.5 border-r border-slate-800/50 font-mono text-center text-rose-400 font-bold">${vencidos}</td>
      <td class="p-3.5 font-mono text-center text-emerald-400 font-bold">${solventes}</td>
    `;
    tbody.appendChild(row);
  });
}

function abrirModalDetalles(vendedor) {
  document.getElementById('tituloModalDetalle').innerHTML = `<i class="fa-solid fa-microchip text-amber-400"></i> Equipos de: ${vendedor.nombre}`;
  const tbody = document.getElementById('tablaDetallesEquipos');
  tbody.innerHTML = '';

  const vehiculosAsociados = vehiculosGlobal.filter(veh => {
    const tecnicoVehiculo = (veh.tecnico || veh.responsable || veh.canal || '').trim().toUpperCase();
    return tecnicoVehiculo.includes(vendedor.nombre.toUpperCase());
  });

  if (vehiculosAsociados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-slate-500 italic">No hay vehículos asignados a este instalador actualmente.</td></tr>`;
  } else {
    vehiculosAsociados.forEach(veh => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-slate-800/40';
      const hoyStr = new Date().toISOString().split('T')[0];
      const estaVencido = veh.vencimiento && veh.vencimiento < hoyStr;
      
      tr.innerHTML = `
        <td class="p-2.5 font-mono text-amber-300 font-bold">${veh.matricula || 'S/N'}</td>
        <td class="p-2.5 text-slate-300">${veh.modelo || 'N/A'}</td>
        <td class="p-2.5 text-slate-300">${veh.cliente || 'Sin cliente'}</td>
        <td class="p-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${estaVencido ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}">${estaVencido ? 'VENCIDO' : 'SOLVENTE'}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById('modalDetalles').classList.remove('hidden');
}

function filtrarTabla() {
  const texto = document.getElementById('inputBuscador').value.toLowerCase().trim();
  const filtrados = vendedoresGlobal.filter(v => v.nombre.toLowerCase().includes(texto));
  renderizarTabla(filtrados);
}

function mostrarErrorSpan(spanId, mensaje) {
  const span = document.getElementById(spanId);
  if (span) {
    span.textContent = mensaje;
    span.classList.remove('hidden');
  }
}

function limpiarErrores() {
  const span = document.getElementById('errorId');
  if (span) span.classList.add('hidden');
}

function mostrarAlertaModal(texto) {
  document.getElementById('textoAlertaModal').textContent = texto;
  document.getElementById('modalAlerta').classList.remove('hidden');
}