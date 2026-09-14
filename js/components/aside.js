import { supabase } from '../supabaseClient.js';

// Función integrada directamente para evitar problemas de rutas de importación en subcarpetas
async function registrarCierreAuditoria() {
  try {
    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    const hora = ahora.toLocaleTimeString();
    const usuarioActual = localStorage.getItem('usuario_galax') || 'SISTEMA';
    const equipo = navigator.platform || 'Navegador Web';

    await supabase.from('auditoria').insert([{
      registro: fecha,
      hora: hora,
      concepto: 'Cierre de sesión manual',
      accion: 'S', // 'S' para Salida
      programa: 'Sistema Web',
      tabla: 'usuarios',
      usuario: usuarioActual,
      equipo: equipo
    }]);
  } catch (err) {
    console.error('Error registrando auditoría de salida:', err);
  }
}

export function renderAside(moduloActivo = '') {
  const asideContainer = document.getElementById('app-aside');
  if (!asideContainer) return;

  const path = window.location.pathname.toLowerCase();

  // Auto-detección robusta basada en las carpetas principales
  if (!moduloActivo) {
    if (path.includes('administracion')) moduloActivo = 'admin';
    else if (path.includes('contabilidad')) moduloActivo = 'contabilidad';
    else if (path.includes('facturacion')) moduloActivo = 'facturacion';
    else if (path.includes('finanzas')) moduloActivo = 'finanzas';
    else if (path.includes('inventario')) moduloActivo = 'inventario';
    else if (path.includes('operaciones')) moduloActivo = 'operaciones';
  }

  if (moduloActivo === 'administracion') moduloActivo = 'admin';

  const modulos = [
    {
      id: 'admin',
      nombre: 'Administración',
      icono: 'fa-shield-halved',
      link: '/views/administracion/admin.html',
      sublinks: [
        { nombre: 'Auditoría', url: '/views/administracion/auditoria/auditoria.html' },
        { nombre: 'Empleados', url: '/views/administracion/empleados/empleados.html' },
        { nombre: 'Usuarios', url: '/views/administracion/usuarios/usuarios.html' }
      ]
    },
    {
      id: 'contabilidad',
      nombre: 'Contabilidad',
      icono: 'fa-calculator',
      link: '/views/contabilidad/menu.html',
      sublinks: [
        { nombre: 'Asientos contables', url: '/views/contabilidad/asientosContables/asientos_contables.html' },
        { nombre: 'Balance comprobación', url: '/views/contabilidad/balance/balance.html' },
        { nombre: 'Detalle asientos', url: '/views/contabilidad/detalleAsientos/detalle_asientos.html' },
        { nombre: 'Libro diario', url: '/views/contabilidad/libro/libro_diario.html' },
        { nombre: 'Plan de cuentas', url: '/views/contabilidad/planCuentas/plan_cuentas.html' },
        { nombre: 'Tipos de cuenta', url: '/views/contabilidad/tiposCuentas/tipos_cuentas.html' }
      ]
    },
    {
      id: 'facturacion',
      nombre: 'Facturación',
      icono: 'fa-file-invoice-dollar',
      link: '/views/facturacion/facturacion.html',
      sublinks: [
        { nombre: 'Factura cliente', url: '/views/facturacion/facturaCliente/facturas.html' },
        { nombre: 'Pagos', url: '/views/facturacion/pagos/pagos.html' }
      ]
    },
    {
      id: 'finanzas',
      nombre: 'Finanzas',
      icono: 'fa-wallet',
      link: '/views/finanzas/finanzas.html',
      sublinks: [
        { nombre: 'Bancos', url: '/views/finanzas/bancos/bancos.html' },
        { nombre: 'Tasas de cambio', url: '/views/finanzas/tasas/tasas.html' }
      ]
    },
    {
      id: 'inventario',
      nombre: 'Inventario',
      icono: 'fa-boxes-stacked',
      link: '/views/inventario/inventario.html',
      sublinks: [
        { nombre: 'Inventario General', url: '/views/inventario/inventario/inventario_general.html' },
        { nombre: 'Proveedores', url: '/views/inventario/proveedores/proveedores.html' }
      ]
    },
    {
      id: 'operaciones',
      nombre: 'Operaciones',
      icono: 'fa-gears',
      link: '/views/operacionesGPS/operaciones.html',
      sublinks: [
        { nombre: 'Clientes', url: '/views/operacionesGPS/clientes/clientes.html' },
        { nombre: 'Equipos', url: '/views/operacionesGPS/equipos/equipos.html' },
        { nombre: 'Lineas', url: '/views/operacionesGPS/lineas/lineas.html' },
        { nombre: 'Monitor', url: '/views/operacionesGPS/monitor/monitor.html' },
        { nombre: 'Vehículos', url: '/views/operacionesGPS/vehiculos/vehiculos.html' },
        { nombre: 'Vendedor', url: '/views/operacionesGPS/vendedores/vendedores.html' }
      ]
    }
  ];

  let html = `
    <!-- Overlay oscuro para móvil -->
    <div id="aside-overlay" class="fixed inset-0 bg-black/60 z-40 hidden md:hidden"></div>

    <aside id="app-sidebar" class="fixed h-full md:static inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none z-50 transform -translate-x-full md:translate-x-0 transition-transform duration-300">
      <div class="h-16 border-b border-slate-800 flex items-center justify-between px-6 gap-3 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
            <i class="fa-solid fa-satellite-dish"></i>
          </div>
          <span class="font-black tracking-wider text-slate-100 text-sm">GALAX<span class="text-amber-500">GPS</span></span>
        </div>
        <button id="btnCloseMobile" class="md:hidden text-slate-400 hover:text-white p-1">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto py-4 px-3 space-y-1">
  `;

  modulos.forEach(mod => {
    const isActive = mod.id === moduloActivo;
    
    html += `
      <div>
        <a href="${mod.link}" class="flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-xs transition-colors ${isActive ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}">
          <span class="flex items-center gap-3">
            <i class="fa-solid ${mod.icono} text-sm w-5 text-center"></i>
            ${mod.nombre}
          </span>
          ${mod.sublinks ? `<i class="fa-solid fa-chevron-down text-[10px] transition-transform ${isActive ? 'rotate-180 text-amber-400' : ''}"></i>` : ''}
        </a>
    `;

    if (isActive && mod.sublinks && mod.sublinks.length > 0) {
      html += `<div class="pl-8 pr-2 py-1.5 space-y-1 my-1 border-l border-slate-800 ml-5">`;
      mod.sublinks.forEach(sub => {
        const nombreArchivoSub = sub.url.split('/').pop().toLowerCase();
        const esSubActivo = path.includes(nombreArchivoSub);

        html += `
          <a href="${sub.url}" class="block px-3 py-2 rounded-lg text-xs font-medium transition-colors ${esSubActivo ? 'bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}">
            • ${sub.nombre}
          </a>
        `;
      });
      html += `</div>`;
    }

    html += `</div>`;
  });

  html += `
      </div>

      <!-- Botón de Salir -->
      <div class="border-t border-slate-800 shrink-0">
        <button id="btnCerrarSesion" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-xs text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all text-left">
          <i class="fa-solid fa-arrow-right-from-bracket text-sm w-5 text-center"></i>
          SALIR
        </button>
      </div>
    </aside>
  `;

  asideContainer.innerHTML = html;

  // Inyectar botón hamburguesa flotante automático en el header si no existe
  const header = document.querySelector('header');
  if (header && !document.getElementById('btnToggleMobile')) {
    const burgerBtn = document.createElement('button');
    burgerBtn.id = 'btnToggleMobile';
    burgerBtn.className = 'md:hidden p-2.5 mr-auto hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-colors';
    burgerBtn.innerHTML = '<i class="fa-solid fa-bars text-base"></i>';
    header.prepend(burgerBtn);
  }

  // Lógica de apertura y cierre del menú móvil
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('aside-overlay');
  const toggleBtn = document.getElementById('btnToggleMobile');
  const closeBtn = document.getElementById('btnCloseMobile');

  function toggleMenu() {
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
  }

  toggleBtn?.addEventListener('click', toggleMenu);
  closeBtn?.addEventListener('click', toggleMenu);
  overlay?.addEventListener('click', toggleMenu);

  // Lógica de cierre de sesión sincronizado, auditado y garantizado
  document.getElementById('btnCerrarSesion')?.addEventListener('click', async (e) => {
    e.preventDefault();
    
    try {
      // 1. Registrar la salida en auditoría de forma directa
      await registrarCierreAuditoria();

      // 2. Cerrar sesión en Supabase
      await supabase.auth.signOut();
      
      // 3. Avisar a las demás pestañas abiertas mediante localStorage
      localStorage.setItem('logout_event', Date.now());
    } catch (error) {
      console.error("Error al procesar el cierre de sesión:", error);
    } finally {
      // 4. Limpiar datos locales de sesión y redirigir al login principal
      localStorage.removeItem('usuario_galax');
      window.location.href = '/index.html';
    }
  });
}

// Escuchar evento de cierre de sesión en otras pestañas automáticamente
window.addEventListener('storage', (event) => {
  if (event.key === 'logout_event') {
    localStorage.removeItem('usuario_galax');
    window.location.href = '/index.html';
  }
});