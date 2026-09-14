import { supabase } from '../supabaseClient.js';

let inventarioUnificado = [];
let proveedoresList = [];
let seleccionado = null;

document.addEventListener('DOMContentLoaded', () => {
  cargarProveedoresListas();
  cargarInventarioCompleto();

  document.getElementById('inputBuscador')?.addEventListener('input', filtrarDatos);
  document.getElementById('selectFiltroTipo')?.addEventListener('change', filtrarDatos);
  document.getElementById('selectFiltroEstado')?.addEventListener('change', filtrarDatos);
  document.getElementById('selectFiltroOrigen')?.addEventListener('change', filtrarDatos);
  document.getElementById('btnActualizarHeader')?.addEventListener('click', cargarInventarioCompleto);

  const modal = document.getElementById('modalInventario');
  const modalAlerta = document.getElementById('modalAlerta');
  const modalEliminar = document.getElementById('modalEliminar');
  const selectTipoIngreso = document.getElementById('selectTipoIngreso');

  setupBuscadorPersonalizado('invExtra', 'sugerenciasProveedoresInv', () => proveedoresList.map(p => p.nombre));

  selectTipoIngreso?.addEventListener('change', (e) => {
    const val = e.target.value;
    const esLote = val.includes('lote');
    document.getElementById('campoCantidadLote').style.display = esLote ? 'block' : 'none';
    
    if (val.includes('linea')) {
      document.getElementById('labelIdentificador').textContent = esLote ? 'Nombre del Lote de Líneas :' : 'Número Telefónico :';
      document.getElementById('labelSecundario').textContent = 'Operadora (Ej: MOVILNET, MOVISTAR) :';
      document.getElementById('campoExtra').style.display = 'block';
      document.querySelector('#campoExtra label').textContent = 'ICCID / Serial de Tarjeta SIM :';
    } else {
      document.getElementById('labelIdentificador').textContent = esLote ? 'Nombre del Lote de Equipos :' : 'IMEI del Equipo :';
      document.getElementById('labelSecundario').textContent = 'Modelo / Marca :';
      document.getElementById('campoExtra').style.display = 'block';
      document.querySelector('#campoExtra label').textContent = 'Proveedor :';
    }
  });

  document.getElementById('btnAbrirAgregar')?.addEventListener('click', () => {
    document.getElementById('formInventario').reset();
    document.getElementById('campoCantidadLote').style.display = 'block';
    modal.classList.remove('hidden');
  });

  document.getElementById('btnCerrarModal')?.addEventListener('click', () => modal.classList.add('hidden'));
  document.getElementById('btnCerrarAlerta')?.addEventListener('click', () => modalAlerta.classList.add('hidden'));

  const btnExportarCsv = document.getElementById('btnExportarCsv');
  btnExportarCsv?.addEventListener('click', async () => {
    if (inventarioUnificado.length === 0) {
      mostrarAlerta('No hay registros de inventario para exportar.');
      return;
    }

    const textoOriginalBtn = btnExportarCsv.innerHTML;
    btnExportarCsv.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-emerald-400"></i> Exportando...`;
    btnExportarCsv.disabled = true;

    try {
      const cabeceras = ['id', 'tipo', 'identificador', 'modelo_operadora', 'proveedor_iccid', 'nota'];
      let csvContenido = cabeceras.join(',') + '\n';

      inventarioUnificado.forEach(item => {
        const fila = [
          item.id || '',
          item.tipo || '',
          item.identificador || '',
          item.secundario || '',
          item.extra || '',
          item.nota || ''
        ].map(val => {
          let str = String(val);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            str = `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
        csvContenido += fila.join(',') + '\n';
      });

      const blob = new Blob([csvContenido], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `inventario_general_galaxgps_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      mostrarAlerta('Error al exportar el archivo CSV: ' + err.message);
    } finally {
      btnExportarCsv.innerHTML = textoOriginalBtn;
      btnExportarCsv.disabled = false;
    }
  });

  document.getElementById('formInventario')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipoIngreso = selectTipoIngreso.value;
    const ident = document.getElementById('invIdentificador').value.trim().toUpperCase();
    const secundario = document.getElementById('invSecundario').value.trim().toUpperCase();
    const extra = document.getElementById('invExtra').value.trim().toUpperCase();
    const timestampBase = Date.now();

    if (tipoIngreso === 'lote_equipos') {
      const cantidad = parseInt(document.getElementById('invCantidad').value) || 1;
      const registros = [];
      for (let i = 1; i <= cantidad; i++) {
        registros.push({
          id: timestampBase + i,
          serial_imei: `PENDIENTE-${ident}-${i}`,
          modelo: secundario,
          proveedor: extra,
          nota: `LOTE ALMACÉN: ${ident}`,
          estatus: 'INACTIVO',
          telefono: null,
          esta_en_plataforma: 'NO',
          microfono: 'NO'
        });
      }
      const { error } = await supabase.from('equipos').insert(registros);
      if (error) {
        mostrarAlerta('Error al guardar lote de equipos: ' + error.message);
      } else {
        modal.classList.add('hidden');
        cargarInventarioCompleto();
      }
    } 
    else if (tipoIngreso === 'lote_lineas') {
      const cantidad = parseInt(document.getElementById('invCantidad').value) || 1;
      const registros = [];
      for (let i = 1; i <= cantidad; i++) {
        registros.push({
          id: timestampBase + i,
          telefono: `PENDIENTE-${ident}-${i}`,
          telefonia: secundario,
          serial: extra ? `${extra}-${i}` : null,
          nota: `LOTE ALMACÉN: ${ident}`,
          estatus: 'INACTIVO',
          eq_asociado: null,
          esta_en_plataforma: 'NO'
        });
      }
      const { error } = await supabase.from('lineas').insert(registros);
      if (error) {
        mostrarAlerta('Error al guardar lote de líneas: ' + error.message);
      } else {
        modal.classList.add('hidden');
        cargarInventarioCompleto();
      }
    } 
    else if (tipoIngreso === 'unitario_equipo') {
      const { error } = await supabase.from('equipos').insert([{
        id: timestampBase,
        serial_imei: ident,
        modelo: secundario,
        proveedor: extra,
        nota: 'INGRESO UNITARIO DIRECTO',
        estatus: 'INACTIVO',
        telefono: null,
        esta_en_plataforma: 'NO',
        microfono: 'NO'
      }]);
      if (error) {
        mostrarAlerta('Error: ' + error.message);
      } else {
        modal.classList.add('hidden');
        cargarInventarioCompleto();
      }
    } 
    else if (tipoIngreso === 'unitario_linea') {
      const { error } = await supabase.from('lineas').insert([{
        id: timestampBase,
        telefono: ident,
        telefonia: secundario,
        serial: extra,
        nota: 'INGRESO UNITARIO DIRECTO',
        estatus: 'INACTIVO',
        eq_asociado: null,
        esta_en_plataforma: 'NO'
      }]);
      if (error) {
        mostrarAlerta('Error: ' + error.message);
      } else {
        modal.classList.add('hidden');
        cargarInventarioCompleto();
      }
    }
  });

  document.getElementById('btnEliminar')?.addEventListener('click', () => {
    if (!seleccionado) {
      mostrarAlerta('Debe seleccionar un elemento de la lista.');
      return;
    }
    document.getElementById('textoEliminarModal').textContent = `¿Seguro que deseas eliminar este registro de ${seleccionado.tipo} (${seleccionado.identificador})?`;
    modalEliminar.classList.remove('hidden');
  });

  document.getElementById('btnCancelarEliminar')?.addEventListener('click', () => modalEliminar.classList.add('hidden'));

  document.getElementById('btnConfirmarEliminar')?.addEventListener('click', async () => {
    if (!seleccionado) return;
    const tabla = seleccionado.tipo === 'EQUIPO' ? 'equipos' : 'lineas';
    const { error } = await supabase.from(tabla).delete().eq('id', seleccionado.id);
    
    modalEliminar.classList.add('hidden');
    if (!error) {
      seleccionado = null;
      cargarInventarioCompleto();
    } else {
      mostrarAlerta('Error al eliminar: ' + error.message);
    }
  });
});

async function cargarProveedoresListas() {
  const { data } = await supabase.from('proveedores').select('nombre');
  if (data) proveedoresList = data;
}

function setupBuscadorPersonalizado(inputId, sugerenciasId, getListaFn, limite = 5) {
  const input = document.getElementById(inputId);
  const contenedor = document.getElementById(sugerenciasId);
  if (!input || !contenedor) return;

  const mostrarSugerencias = () => {
    const texto = input.value.toLowerCase().trim();
    const lista = getListaFn();
    const filtrados = texto 
      ? lista.filter(item => item.toLowerCase().includes(texto)).slice(0, limite)
      : lista.slice(0, limite);

    if (filtrados.length === 0) {
      contenedor.classList.add('hidden');
      contenedor.innerHTML = '';
      return;
    }

    contenedor.innerHTML = '';
    filtrados.forEach(item => {
      const div = document.createElement('div');
      div.className = 'p-2.5 text-slate-300 hover:bg-amber-600/30 hover:text-white cursor-pointer transition-colors';
      div.textContent = item;
      div.addEventListener('click', () => {
        input.value = item;
        contenedor.classList.add('hidden');
      });
      contenedor.appendChild(div);
    });

    contenedor.classList.remove('hidden');
  };

  input.addEventListener('input', mostrarSugerencias);
  input.addEventListener('focus', mostrarSugerencias);

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !contenedor.contains(e.target)) {
      contenedor.classList.add('hidden');
    }
  });
}

async function cargarInventarioCompleto() {
  const [resEquipos, resLineas] = await Promise.all([
    supabase.from('equipos').select('*').order('id', { ascending: false }),
    supabase.from('lineas').select('*').order('id', { ascending: false })
  ]);

  const listaEquipos = (resEquipos.data || []).map(e => ({
    id: e.id,
    tipo: 'EQUIPO',
    identificador: e.serial_imei,
    secundario: e.modelo || 'SIN MODELO',
    extra: e.proveedor || 'N/D',
    nota: e.nota || 'OPERACIONES GPS',
    estatusRaw: e.estatus || 'INACTIVO',
    esPendiente: e.serial_imei && e.serial_imei.startsWith('PENDIENTE-'),
    esLote: e.nota && e.nota.includes('LOTE ALMACÉN')
  }));

  const listaLineas = (resLineas.data || []).map(l => ({
    id: l.id,
    tipo: 'LINEA',
    identificador: l.telefono,
    secundario: l.telefonia || 'SIN OPERADORA',
    extra: l.serial || l.serial_iccid || 'S/ICCID',
    nota: l.nota || 'OPERACIONES GPS',
    estatusRaw: l.estatus || 'INACTIVO',
    esPendiente: l.telefono && l.telefono.startsWith('PENDIENTE-'),
    esLote: l.nota && l.nota.includes('LOTE ALMACÉN')
  }));

  inventarioUnificado = [...listaEquipos, ...listaLineas];
  renderizar(inventarioUnificado);
}

function renderizar(lista) {
  const tbody = document.getElementById('tablaInventarioBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  document.getElementById('contadorRegistros').textContent = `Cant : ${lista.length}`;

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500">No hay registros de inventario disponibles.</td></tr>`;
    return;
  }

  lista.forEach((item) => {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-800/60 hover:bg-slate-800/40 cursor-pointer transition-colors';
    tr.addEventListener('click', () => {
      document.querySelectorAll('#tablaInventarioBody tr').forEach(r => r.classList.remove('bg-amber-600/20', 'border-amber-500/40'));
      tr.classList.add('bg-amber-600/20', 'border-amber-500/40');
      seleccionado = { id: item.id, tipo: item.tipo, identificador: item.identificador };
    });

    tr.innerHTML = `
      <td class="p-3.5 border-r border-slate-800/50">
        ${item.esPendiente 
          ? '<span class="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[10px] font-bold flex items-center gap-1.5 w-fit"><i class="fa-solid fa-triangle-exclamation"></i> PENDIENTE</span>'
          : '<span class="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold flex items-center gap-1.5 w-fit"><i class="fa-solid fa-check"></i> OPERATIVO</span>'}
      </td>
      <td class="p-3.5 border-r border-slate-800/50 font-semibold text-slate-300">
        ${item.tipo === 'EQUIPO' ? '<i class="fa-solid fa-satellite-dish text-amber-400 mr-1"></i> EQUIPO' : '<i class="fa-solid fa-sim-card text-blue-400 mr-1"></i> LÍNEA'}
      </td>
      <td class="p-3.5 border-r border-slate-800/50 font-mono text-amber-400 font-bold">${item.identificador}</td>
      <td class="p-3.5 border-r border-slate-800/50 font-bold text-white">${item.secundario}</td>
      <td class="p-3.5 border-r border-slate-800/50 text-slate-300 font-mono">${item.extra}</td>
      <td class="p-3.5 text-blue-400 font-semibold">${item.nota}</td>
    `;
    tbody.appendChild(tr);
  });
}

function filtrarDatos() {
  const texto = document.getElementById('inputBuscador').value.toLowerCase().trim();
  const filtroTipo = document.getElementById('selectFiltroTipo').value;
  const filtroEstado = document.getElementById('selectFiltroEstado').value;
  const filtroOrigen = document.getElementById('selectFiltroOrigen').value;

  const filtrados = inventarioUnificado.filter(item => {
    if (filtroTipo !== 'todos' && item.tipo.toLowerCase() !== filtroTipo) return false;
    
    if (filtroEstado === 'activo' && !String(item.estatusRaw).includes('ACTIVO')) return false;
    if (filtroEstado === 'inactivo' && !String(item.estatusRaw).includes('INACTIVO')) return false;
    if (filtroEstado === 'pendiente' && !item.esPendiente) return false;

    if (filtroOrigen === 'lote' && !item.esLote) return false;
    if (filtroOrigen === 'operaciones' && item.esLote) return false;

    return (
      (item.identificador && item.identificador.toLowerCase().includes(texto)) ||
      (item.secundario && item.secundario.toLowerCase().includes(texto)) ||
      (item.extra && item.extra.toLowerCase().includes(texto)) ||
      (item.nota && item.nota.toLowerCase().includes(texto))
    );
  });
  renderizar(filtrados);
}

function mostrarAlerta(msg) {
  document.getElementById('textoAlertaModal').textContent = msg;
  document.getElementById('modalAlerta').classList.remove('hidden');
}