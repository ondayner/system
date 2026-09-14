import { supabase } from '../supabaseClient.js';

let proveedoresGlobal = [];
let proveedorSeleccionadoId = null;
let modoEdicion = false;

document.addEventListener('DOMContentLoaded', () => {
  cargarProveedores();

  document.getElementById('inputBuscador')?.addEventListener('input', filtrarTabla);
  document.getElementById('filtroCampo')?.addEventListener('change', filtrarTabla);
  document.getElementById('filtroEstatus')?.addEventListener('change', filtrarTabla);
  document.getElementById('btnActualizarHeader')?.addEventListener('click', cargarProveedores);

  const modalProveedor = document.getElementById('modalProveedor');
  const modalAlerta = document.getElementById('modalAlerta');
  const modalEliminar = document.getElementById('modalEliminar');

  document.getElementById('btnAbrirAgregar')?.addEventListener('click', () => {
    modoEdicion = false;
    proveedorSeleccionadoId = null;
    limpiarErrores();
    document.getElementById('modalTitulo').innerHTML = `<i class="fa-solid fa-truck-field text-amber-500"></i> Registrar Proveedor`;
    document.getElementById('formProveedor').reset();
    document.getElementById('provEstatus').value = 'ACTIVO';
    modalProveedor.classList.remove('hidden');
  });

  document.getElementById('btnAbrirEditar')?.addEventListener('click', () => {
    if (!proveedorSeleccionadoId) {
      mostrarAlerta('Debe Seleccionar un Proveedor');
      return;
    }
    modoEdicion = true;
    limpiarErrores();
    document.getElementById('modalTitulo').innerHTML = `<i class="fa-solid fa-pen-to-square text-amber-500"></i> Editar Proveedor`;

    const prov = proveedoresGlobal.find(p => p.id === proveedorSeleccionadoId);
    if (prov) {
      document.getElementById('provNombre').value = prov.nombre || '';
      document.getElementById('provContacto').value = prov.contacto || '';
      document.getElementById('provTelefono').value = prov.telefono || '';
      document.getElementById('provCorreo').value = prov.correo || '';
      document.getElementById('provEstatus').value = prov.estatus || 'ACTIVO';
      document.getElementById('provDireccion').value = prov.direccion || '';
    }
    modalProveedor.classList.remove('hidden');
  });

  document.getElementById('btnEliminarProveedor')?.addEventListener('click', () => {
    if (!proveedorSeleccionadoId) {
      mostrarAlerta('Debe Seleccionar un Proveedor');
      return;
    }
    const prov = proveedoresGlobal.find(p => p.id === proveedorSeleccionadoId);
    document.getElementById('textoEliminarModal').textContent = `¿Seguro que deseas eliminar al proveedor "${prov.nombre}"?`;
    modalEliminar.classList.remove('hidden');
  });

  document.getElementById('btnCancelarEliminar')?.addEventListener('click', () => modalEliminar.classList.add('hidden'));

  document.getElementById('btnConfirmarEliminar')?.addEventListener('click', async () => {
    const { error } = await supabase.from('proveedores').delete().eq('id', proveedorSeleccionadoId);
    if (error) {
      mostrarAlerta('Error al eliminar: ' + error.message);
    } else {
      modalEliminar.classList.add('hidden');
      proveedorSeleccionadoId = null;
      cargarProveedores();
    }
  });

  document.getElementById('btnCerrarModal')?.addEventListener('click', () => modalProveedor.classList.add('hidden'));
  document.getElementById('btnCancelarModal')?.addEventListener('click', () => modalProveedor.classList.add('hidden'));
  document.getElementById('btnCerrarAlerta')?.addEventListener('click', () => modalAlerta.classList.add('hidden'));

  document.getElementById('formProveedor')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    limpiarErrores();

    const nombreVal = document.getElementById('provNombre').value.trim().toUpperCase();

    if (!modoEdicion) {
      const existe = proveedoresGlobal.some(p => p.nombre.toLowerCase() === nombreVal.toLowerCase());
      if (existe) {
        mostrarErrorSpan('errorNombre', 'Este proveedor ya se encuentra registrado.');
        return;
      }
    }

    const datosForm = {
      nombre: nombreVal,
      contacto: document.getElementById('provContacto').value.trim().toUpperCase(),
      telefono: document.getElementById('provTelefono').value.trim(),
      correo: document.getElementById('provCorreo').value.trim(),
      estatus: document.getElementById('provEstatus').value,
      direccion: document.getElementById('provDireccion').value.trim().toUpperCase()
    };

    let res;
    if (modoEdicion) {
      res = await supabase.from('proveedores').update(datosForm).eq('id', proveedorSeleccionadoId);
    } else {
      res = await supabase.from('proveedores').insert([datosForm]);
    }

    const { error } = res;
    if (error) {
      mostrarAlerta('Error BD: ' + error.message);
      return;
    }

    modalProveedor.classList.add('hidden');
    proveedorSeleccionadoId = null;
    cargarProveedores();
  });
});

function mostrarErrorSpan(spanId, mensaje) {
  const span = document.getElementById(spanId);
  if (span) {
    span.textContent = mensaje;
    span.classList.remove('hidden');
  }
}

function limpiarErrores() {
  const span = document.getElementById('errorNombre');
  if (span) {
    span.textContent = '';
    span.classList.add('hidden');
  }
}

function mostrarAlerta(texto) {
  document.getElementById('textoAlertaModal').textContent = texto;
  document.getElementById('modalAlerta').classList.remove('hidden');
}

async function cargarProveedores() {
  const tbody = document.getElementById('tablaProveedoresBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-500"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Cargando proveedores...</td></tr>`;

  const { data, error } = await supabase.from('proveedores').select('*').order('nombre', { ascending: true });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-rose-400">Error al conectar con la base de datos.</td></tr>`;
    return;
  }

  proveedoresGlobal = data || [];
  renderizarTabla(proveedoresGlobal);
}

function renderizarTabla(lista) {
  const tbody = document.getElementById('tablaProveedoresBody');
  const contador = document.getElementById('contadorRegistros');
  if (!tbody) return;

  tbody.innerHTML = '';
  if (contador) contador.textContent = `Cant : ${lista.length}`;

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-500">No se encontraron proveedores registrados.</td></tr>`;
    return;
  }

  lista.forEach((prov) => {
    const row = document.createElement('tr');
    row.className = 'border-b border-slate-800/60 hover:bg-slate-800/40 cursor-pointer transition-colors';
    
    row.addEventListener('click', () => {
      document.querySelectorAll('#tablaProveedoresBody tr').forEach(tr => tr.classList.remove('bg-amber-600/20', 'border-amber-500/40'));
      row.classList.add('bg-amber-600/20', 'border-amber-500/40');
      proveedorSeleccionadoId = prov.id;
    });

    const estatusColor = prov.estatus === 'ACTIVO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20';

    row.innerHTML = `
      <td class="p-3.5 font-mono text-amber-400 font-bold">${prov.id || 'N/A'}</td>
      <td class="p-3.5 font-bold text-white">${prov.nombre || ''}</td>
      <td class="p-3.5 text-slate-300">${prov.contacto || 'N/D'}</td>
      <td class="p-3.5 font-mono text-slate-300">${prov.telefono || 'N/D'}</td>
      <td class="p-3.5 text-slate-400">${prov.correo || 'N/D'}</td>
      <td class="p-3.5 text-slate-400 truncate max-w-[200px]" title="${prov.direccion || ''}">${prov.direccion || 'N/D'}</td>
      <td class="p-3.5"><span class="px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${estatusColor}">${prov.estatus || 'ACTIVO'}</span></td>
    `;
    tbody.appendChild(row);
  });
}

function filtrarTabla() {
  const campo = document.getElementById('filtroCampo').value;
  const estatusFiltro = document.getElementById('filtroEstatus').value;
  const textoBusqueda = document.getElementById('inputBuscador').value.toLowerCase().trim();

  const filtrados = proveedoresGlobal.filter(prov => {
    if (estatusFiltro !== 'TODOS' && prov.estatus !== estatusFiltro) return false;
    if (textoBusqueda) {
      const valorCampo = String(prov[campo] || '').toLowerCase();
      return valorCampo.includes(textoBusqueda);
    }
    return true;
  });

  renderizarTabla(filtrados);
}