import { supabase } from '../supabaseClient.js';

let empleadosGlobal = [];
let seleccionadoId = null;
let modoEdicion = false;

document.addEventListener('DOMContentLoaded', () => {
  cargarEmpleados();

  document.getElementById('inputBuscador')?.addEventListener('input', (e) => {
    const texto = e.target.value.toLowerCase();
    const filtrados = empleadosGlobal.filter(emp => 
      (emp.nombre && emp.nombre.toLowerCase().includes(texto)) ||
      (emp.cedula && emp.cedula.toLowerCase().includes(texto)) ||
      (emp.nota && emp.nota.toLowerCase().includes(texto)) ||
      (emp.email && emp.email.toLowerCase().includes(texto))
    );
    renderizar(filtrados);
  });

  document.getElementById('btnActualizarHeader')?.addEventListener('click', cargarEmpleados);

  const modal = document.getElementById('modalEmpleado');
  const modalAlerta = document.getElementById('modalAlerta');
  const modalEliminar = document.getElementById('modalEliminar');

  document.getElementById('btnAbrirAgregar')?.addEventListener('click', () => {
    modoEdicion = false;
    document.getElementById('modalTitulo').textContent = 'Registrar Empleado';
    document.getElementById('formEmpleado').reset();
    modal.classList.remove('hidden');
  });

  document.getElementById('btnAbrirEditar')?.addEventListener('click', () => {
    if (!seleccionadoId) {
      mostrarAlerta('Debe seleccionar un empleado.');
      return;
    }
    modoEdicion = true;
    document.getElementById('modalTitulo').textContent = 'Editar Empleado';
    const emp = empleadosGlobal.find(e => e.id === seleccionadoId);
    if (emp) {
      document.getElementById('empNombre').value = emp.nombre || '';
      document.getElementById('empCedula').value = emp.cedula || '';
      document.getElementById('empEmail').value = emp.email || '';
      document.getElementById('empNota').value = emp.nota || '';
    }
    modal.classList.remove('hidden');
  });

  // Lógica Eliminar Empleado
  document.getElementById('btnEliminarEmpleado')?.addEventListener('click', () => {
    if (!seleccionadoId) {
      mostrarAlerta('Debe seleccionar un empleado.');
      return;
    }
    const emp = empleadosGlobal.find(e => e.id === seleccionadoId);
    document.getElementById('textoEliminarModal').textContent = `¿Seguro que deseas eliminar al empleado: ${emp ? emp.nombre : ''}?`;
    modalEliminar.classList.remove('hidden');
  });

  document.getElementById('btnCancelarEliminar')?.addEventListener('click', () => modalEliminar.classList.add('hidden'));

  document.getElementById('btnConfirmarEliminar')?.addEventListener('click', async () => {
    const { error } = await supabase.from('empleados').delete().eq('id', seleccionadoId);
    if (error) {
      modalEliminar.classList.add('hidden');
      mostrarAlerta('Error al eliminar: ' + error.message);
    } else {
      modalEliminar.classList.add('hidden');
      seleccionadoId = null;
      cargarEmpleados();
    }
  });

  document.getElementById('btnCerrarModal')?.addEventListener('click', () => modal.classList.add('hidden'));
  document.getElementById('btnCerrarAlerta')?.addEventListener('click', () => modalAlerta.classList.add('hidden'));

  document.getElementById('formEmpleado')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = {
      nombre: document.getElementById('empNombre').value.trim().toUpperCase(),
      cedula: document.getElementById('empCedula').value.trim(),
      email: document.getElementById('empEmail').value.trim(),
      nota: document.getElementById('empNota').value.trim().toUpperCase()
    };

    let res = modoEdicion 
      ? await supabase.from('empleados').update(datos).eq('id', seleccionadoId)
      : await supabase.from('empleados').insert([datos]);

    if (res.error) {
      mostrarAlerta('Error: ' + res.error.message);
    } else {
      modal.classList.add('hidden');
      cargarEmpleados();
    }
  });
});

async function cargarEmpleados() {
  const tbody = document.getElementById('tablaEmpleadosBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-slate-500"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Cargando empleados...</td></tr>`;

  const { data, error } = await supabase.from('empleados').select('*').order('id', { ascending: true });
  if (error) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-rose-400">Error al conectar con la base de datos: ${error.message}</td></tr>`;
    return;
  }

  empleadosGlobal = data || [];
  renderizar(empleadosGlobal);
}

function renderizar(lista) {
  const tbody = document.getElementById('tablaEmpleadosBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  document.getElementById('contadorRegistros').textContent = `Cant : ${lista.length}`;

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-slate-500">No se encontraron empleados registrados.</td></tr>`;
    return;
  }

  lista.forEach(e => {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-800/60 hover:bg-slate-800/40 cursor-pointer transition-colors';
    tr.addEventListener('click', () => {
      document.querySelectorAll('#tablaEmpleadosBody tr').forEach(r => r.classList.remove('bg-blue-600/20'));
      tr.classList.add('bg-blue-600/20');
      seleccionadoId = e.id;
    });
    tr.innerHTML = `
      <td class="p-3.5 border-r border-slate-800/50 font-mono text-slate-400 font-bold">${e.id}</td>
      <td class="p-3.5 border-r border-slate-800/50 font-bold text-white">${e.nombre || ''}</td>
      <td class="p-3.5 border-r border-slate-800/50 font-mono text-amber-300">${e.cedula || ''}</td>
      <td class="p-3.5 border-r border-slate-800/50 text-slate-300">${e.email || ''}</td>
      <td class="p-3.5 text-blue-400 font-semibold">${e.nota || ''}</td>
    `;
    tbody.appendChild(tr);
  });
}

function mostrarAlerta(msg) {
  document.getElementById('textoAlertaModal').textContent = msg;
  document.getElementById('modalAlerta').classList.remove('hidden');
}