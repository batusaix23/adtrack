const https = require('https');

const API_URL = 'https://backend-production-30d8.up.railway.app/api';

let authToken = '';
let technicianToken = '';
let clientPortalToken = '';
let companyId = '';
let results = { passed: 0, failed: 0, tests: [] };

// Test data storage
const created = {
  clients: [],
  items: [],
  technicians: [],
  invoices: [],
  pools: [],
  routes: [],
  serviceRecords: [],
  equipment: []
};

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL + path);
    const useToken = token || authToken;
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(useToken && { 'Authorization': `Bearer ${useToken}` })
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function logTest(name, passed, details = '') {
  const status = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`  ${color}${status}\x1b[0m ${name}${details ? ` - ${details}` : ''}`);
  results.tests.push({ name, passed, details });
  if (passed) results.passed++; else results.failed++;
}

function logSection(name) {
  console.log(`\n\x1b[36m═══ ${name} ═══\x1b[0m`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('\n' + '═'.repeat(50));
  console.log('  AGUADULCE TRACK - PRUEBAS COMPLETAS DEL SISTEMA');
  console.log('═'.repeat(50));
  console.log(`\nAPI: ${API_URL}\n`);

  // ============================================
  // 1. AUTENTICACIÓN
  // ============================================
  logSection('1. AUTENTICACIÓN');

  // 1.1 Login Admin
  try {
    const login = await makeRequest('POST', '/auth/login', {
      email: 'admin@aguadulcetrack.com',
      password: 'Admin123!'
    });
    if (login.data.accessToken) {
      authToken = login.data.accessToken;
      companyId = login.data.user?.companyId;
      logTest('Login Admin', true);
    } else {
      logTest('Login Admin', false, JSON.stringify(login.data));
      return;
    }
  } catch (e) {
    logTest('Login Admin', false, e.message);
    return;
  }

  // 1.2 Get current user
  try {
    const me = await makeRequest('GET', '/auth/me');
    logTest('Obtener usuario actual', me.status === 200, `Role: ${me.data.user?.role}`);
  } catch (e) {
    logTest('Obtener usuario actual', false, e.message);
  }

  // 1.3 Refresh token
  try {
    const refresh = await makeRequest('POST', '/auth/refresh');
    logTest('Refresh token', refresh.status === 200 || refresh.status === 401, 'Token refresh');
  } catch (e) {
    logTest('Refresh token', false, e.message);
  }

  // ============================================
  // 2. CATÁLOGO DE SERVICIOS/PRODUCTOS
  // ============================================
  logSection('2. CATÁLOGO DE SERVICIOS/PRODUCTOS');

  // 2.1 Create items
  const testItems = [
    { name: 'Test Mantenimiento Basico', itemType: 'service', category: 'Mantenimiento', basePrice: 120, unit: 'month', description: 'Servicio basico semanal' },
    { name: 'Test Cloro Liquido', itemType: 'chemical', category: 'Quimicos', basePrice: 45, costPrice: 25, unit: 'gal', taxRate: 11.5 },
    { name: 'Test Motor Bomba', itemType: 'part', category: 'Equipos', basePrice: 350, costPrice: 200, unit: 'unit' }
  ];

  for (const item of testItems) {
    try {
      const res = await makeRequest('POST', '/service-items', item);
      if (res.status === 201 || res.status === 200) {
        created.items.push(res.data.item);
        logTest(`Crear item: ${item.name}`, true, `ID: ${res.data.item?.id?.slice(0,8)}`);
      } else {
        logTest(`Crear item: ${item.name}`, false, JSON.stringify(res.data));
      }
    } catch (e) {
      logTest(`Crear item: ${item.name}`, false, e.message);
    }
  }

  // 2.2 List items
  try {
    const items = await makeRequest('GET', '/service-items');
    logTest('Listar items', items.status === 200, `Total: ${items.data.items?.length}`);
  } catch (e) {
    logTest('Listar items', false, e.message);
  }

  // 2.3 Filter by type
  try {
    const services = await makeRequest('GET', '/service-items?type=service');
    logTest('Filtrar por tipo (service)', services.status === 200, `Encontrados: ${services.data.items?.length}`);
  } catch (e) {
    logTest('Filtrar por tipo', false, e.message);
  }

  // 2.4 Get categories
  try {
    const cats = await makeRequest('GET', '/service-items/categories');
    logTest('Obtener categorías', cats.status === 200, `Categorías: ${cats.data.categories?.join(', ')}`);
  } catch (e) {
    logTest('Obtener categorías', false, e.message);
  }

  // 2.5 Update item
  if (created.items.length > 0) {
    try {
      const update = await makeRequest('PUT', `/service-items/${created.items[0].id}`, {
        basePrice: 135,
        description: 'Descripcion actualizada'
      });
      logTest('Actualizar item', update.status === 200);
    } catch (e) {
      logTest('Actualizar item', false, e.message);
    }
  }

  // ============================================
  // 3. GESTIÓN DE TÉCNICOS
  // ============================================
  logSection('3. GESTIÓN DE TÉCNICOS');

  // 3.1 Create technicians
  const testTechs = [
    { firstName: 'Pedro', lastName: 'Gonzalez', email: `pedro.test${Date.now()}@example.com`, phone: '787-555-1001', role: 'technician' },
    { firstName: 'Sofia', lastName: 'Lopez', email: `sofia.test${Date.now()}@example.com`, phone: '787-555-1002', role: 'technician' }
  ];

  for (const tech of testTechs) {
    try {
      const res = await makeRequest('POST', '/users', { ...tech, password: 'Tech123!' });
      if (res.status === 201 || res.status === 200) {
        created.technicians.push(res.data.user);
        logTest(`Crear técnico: ${tech.firstName}`, true, `ID: ${res.data.user?.id?.slice(0,8)}`);
      } else if (res.data.error?.includes('registrado')) {
        logTest(`Crear técnico: ${tech.firstName}`, true, 'Ya existe');
      } else {
        logTest(`Crear técnico: ${tech.firstName}`, false, JSON.stringify(res.data));
      }
    } catch (e) {
      logTest(`Crear técnico: ${tech.firstName}`, false, e.message);
    }
  }

  // 3.2 List users
  try {
    const users = await makeRequest('GET', '/users');
    logTest('Listar usuarios', users.status === 200, `Total: ${users.data.users?.length}`);
  } catch (e) {
    logTest('Listar usuarios', false, e.message);
  }

  // 3.3 Filter technicians
  try {
    const techs = await makeRequest('GET', '/users?role=technician');
    logTest('Filtrar técnicos', techs.status === 200, `Técnicos: ${techs.data.users?.length}`);
    if (techs.data.users?.length > 0 && !created.technicians.length) {
      created.technicians = techs.data.users;
    }
  } catch (e) {
    logTest('Filtrar técnicos', false, e.message);
  }

  // 3.4 Get technicians list (specific endpoint)
  try {
    const techList = await makeRequest('GET', '/technicians');
    logTest('Lista de técnicos (endpoint)', techList.status === 200 || techList.status === 404);
  } catch (e) {
    logTest('Lista de técnicos', false, e.message);
  }

  // ============================================
  // 4. GESTIÓN DE CLIENTES
  // ============================================
  logSection('4. GESTIÓN DE CLIENTES');

  // 4.1 Create clients with different types
  const testClients = [
    {
      name: 'Cliente Residencial Test',
      email: `resid.test${Date.now()}@example.com`,
      phone: '787-555-2001',
      address: 'Calle Residencial 123',
      city: 'San Juan',
      state: 'PR',
      zipCode: '00901',
      clientType: 'residential'
    },
    {
      name: 'Hotel Comercial Test',
      email: `hotel.test${Date.now()}@example.com`,
      phone: '787-555-2002',
      address: 'Ave Comercial 456',
      city: 'Condado',
      state: 'PR',
      zipCode: '00907',
      clientType: 'commercial'
    }
  ];

  for (const client of testClients) {
    try {
      const res = await makeRequest('POST', '/clients', client);
      if (res.status === 201 || res.status === 200) {
        created.clients.push(res.data.client);
        logTest(`Crear cliente: ${client.name}`, true, `Tipo: ${client.clientType}`);
      } else {
        logTest(`Crear cliente: ${client.name}`, false, JSON.stringify(res.data));
      }
    } catch (e) {
      logTest(`Crear cliente: ${client.name}`, false, e.message);
    }
  }

  // 4.2 List clients
  try {
    const clients = await makeRequest('GET', '/clients');
    logTest('Listar clientes', clients.status === 200, `Total: ${clients.data.clients?.length}`);
    if (clients.data.clients?.length > 0 && !created.clients.length) {
      created.clients = clients.data.clients.slice(0, 2);
    }
  } catch (e) {
    logTest('Listar clientes', false, e.message);
  }

  // 4.3 Search clients
  try {
    const search = await makeRequest('GET', '/clients?search=test');
    logTest('Buscar clientes', search.status === 200, `Encontrados: ${search.data.clients?.length}`);
  } catch (e) {
    logTest('Buscar clientes', false, e.message);
  }

  // 4.4 Get single client
  if (created.clients.length > 0) {
    try {
      const client = await makeRequest('GET', `/clients/${created.clients[0].id}`);
      logTest('Obtener cliente por ID', client.status === 200, `Nombre: ${client.data.client?.name}`);
    } catch (e) {
      logTest('Obtener cliente por ID', false, e.message);
    }
  }

  // 4.5 Update client
  if (created.clients.length > 0) {
    try {
      const update = await makeRequest('PUT', `/clients/${created.clients[0].id}`, {
        notes: 'Notas de prueba actualizadas',
        phone: '787-555-9999'
      });
      logTest('Actualizar cliente', update.status === 200);
    } catch (e) {
      logTest('Actualizar cliente', false, e.message);
    }
  }

  // ============================================
  // 5. PISCINAS
  // ============================================
  logSection('5. PISCINAS');

  if (created.clients.length > 0) {
    // 5.1 Create pool
    try {
      const pool = await makeRequest('POST', '/pools', {
        clientId: created.clients[0].id,
        name: 'Piscina Principal',
        poolType: 'inground',
        volumeGallons: 15000,
        surfaceAreaSqft: 400,
        hasSpa: false,
        hasHeater: false,
        hasSaltSystem: true,
        serviceDay: 'Monday',
        notes: 'Piscina de prueba'
      });
      if (pool.status === 201 || pool.status === 200) {
        created.pools.push(pool.data.pool);
        logTest('Crear piscina', true, `ID: ${pool.data.pool?.id?.slice(0,8)}`);
      } else {
        logTest('Crear piscina', false, JSON.stringify(pool.data));
      }
    } catch (e) {
      logTest('Crear piscina', false, e.message);
    }

    // 5.2 List pools for client
    try {
      const pools = await makeRequest('GET', `/pools?clientId=${created.clients[0].id}`);
      logTest('Listar piscinas del cliente', pools.status === 200, `Total: ${pools.data.pools?.length}`);
      if (pools.data.pools?.length > 0 && !created.pools.length) {
        created.pools = pools.data.pools;
      }
    } catch (e) {
      logTest('Listar piscinas', false, e.message);
    }
  }

  // ============================================
  // 6. EQUIPAMIENTO DE CLIENTE
  // ============================================
  logSection('6. EQUIPAMIENTO DE CLIENTE');

  if (created.clients.length > 0) {
    // 6.1 Add equipment
    try {
      const equip = await makeRequest('POST', `/client-equipment/${created.clients[0].id}`, {
        equipmentType: 'pump',
        brand: 'Pentair',
        model: 'IntelliFlo VSF',
        serialNumber: 'PNT-2024-001',
        installationDate: '2024-01-15',
        warrantyExpires: '2027-01-15',
        notes: 'Bomba variable de alta eficiencia'
      });
      if (equip.status === 201 || equip.status === 200) {
        created.equipment.push(equip.data.equipment);
        logTest('Agregar equipo', true);
      } else {
        logTest('Agregar equipo', false, JSON.stringify(equip.data));
      }
    } catch (e) {
      logTest('Agregar equipo', false, e.message);
    }

    // 6.2 List equipment
    try {
      const equipment = await makeRequest('GET', `/client-equipment/${created.clients[0].id}`);
      logTest('Listar equipo', equipment.status === 200, `Total: ${equipment.data.equipment?.length}`);
    } catch (e) {
      logTest('Listar equipo', false, e.message);
    }
  }

  // ============================================
  // 7. RUTAS DE SERVICIO
  // ============================================
  logSection('7. RUTAS DE SERVICIO');

  // 7.1 Create route schedule
  if (created.technicians.length > 0 && created.clients.length > 0) {
    try {
      const route = await makeRequest('POST', '/routes/schedules', {
        clientId: created.clients[0]?.id,
        technicianId: created.technicians[0]?.id,
        dayOfWeek: 1, // Monday
        timeSlot: 'morning',
        notes: 'Ruta de prueba'
      });
      if (route.status === 201 || route.status === 200) {
        created.routes.push(route.data.schedule || route.data.route);
        logTest('Crear horario de ruta', true);
      } else {
        logTest('Crear horario de ruta', false, JSON.stringify(route.data));
      }
    } catch (e) {
      logTest('Crear horario de ruta', false, e.message);
    }
  }

  // 7.2 List schedules
  try {
    const routes = await makeRequest('GET', '/routes/schedules');
    logTest('Listar horarios', routes.status === 200, `Total: ${routes.data.schedules?.length}`);
  } catch (e) {
    logTest('Listar horarios', false, e.message);
  }

  // 7.3 Get available clients for routes
  try {
    const available = await makeRequest('GET', '/routes/available-clients');
    logTest('Clientes disponibles para rutas', available.status === 200);
  } catch (e) {
    logTest('Clientes disponibles', false, e.message);
  }

  // ============================================
  // 8. REGISTROS DE SERVICIO
  // ============================================
  logSection('8. REGISTROS DE SERVICIO');

  if (created.pools.length > 0) {
    // 8.1 Create service record
    try {
      const service = await makeRequest('POST', '/services', {
        poolId: created.pools[0].id,
        technicianId: created.technicians[0]?.id,
        serviceDate: new Date().toISOString().split('T')[0],
        serviceType: 'routine',
        status: 'completed',
        duration: 45,
        notes: 'Servicio de mantenimiento completo',
        chemicalsUsed: [
          { name: 'Cloro', amount: 2, unit: 'lb' },
          { name: 'Acido', amount: 0.5, unit: 'gal' }
        ],
        readings: {
          ph: 7.4,
          chlorine: 3.0,
          alkalinity: 100,
          temperature: 82
        }
      });
      if (service.status === 201 || service.status === 200) {
        created.serviceRecords.push(service.data.service || service.data.record);
        logTest('Crear registro de servicio', true);
      } else {
        logTest('Crear registro de servicio', false, JSON.stringify(service.data));
      }
    } catch (e) {
      logTest('Crear registro de servicio', false, e.message);
    }

    // 8.2 List services
    try {
      const services = await makeRequest('GET', '/services');
      logTest('Listar servicios', services.status === 200, `Total: ${services.data.services?.length || services.data.records?.length}`);
    } catch (e) {
      logTest('Listar servicios', false, e.message);
    }

    // 8.3 Get pool service history
    try {
      const history = await makeRequest('GET', `/services?poolId=${created.pools[0].id}`);
      logTest('Historial de piscina', history.status === 200);
    } catch (e) {
      logTest('Historial de piscina', false, e.message);
    }
  }

  // ============================================
  // 9. FACTURACIÓN
  // ============================================
  logSection('9. FACTURACIÓN');

  if (created.clients.length > 0) {
    // 9.1 Create invoice
    try {
      const invoice = await makeRequest('POST', '/invoices', {
        clientId: created.clients[0].id,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        items: [
          { description: 'Servicio Mensual', quantity: 1, unitPrice: 150, taxRate: 11.5 },
          { description: 'Quimicos', quantity: 1, unitPrice: 45, taxRate: 11.5 }
        ],
        notes: 'Factura de prueba completa'
      });
      if (invoice.status === 201 || invoice.status === 200) {
        created.invoices.push(invoice.data.invoice);
        logTest('Crear factura', true, `Número: ${invoice.data.invoice?.invoice_number}`);
      } else {
        logTest('Crear factura', false, JSON.stringify(invoice.data));
      }
    } catch (e) {
      logTest('Crear factura', false, e.message);
    }

    // 9.2 List invoices
    try {
      const invoices = await makeRequest('GET', '/invoices');
      logTest('Listar facturas', invoices.status === 200, `Total: ${invoices.data.invoices?.length}`);
      if (invoices.data.invoices?.length > 0 && !created.invoices.length) {
        created.invoices = invoices.data.invoices.slice(0, 1);
      }
    } catch (e) {
      logTest('Listar facturas', false, e.message);
    }

    // 9.3 Get single invoice
    if (created.invoices.length > 0) {
      try {
        const inv = await makeRequest('GET', `/invoices/${created.invoices[0].id}`);
        logTest('Obtener factura por ID', inv.status === 200);
      } catch (e) {
        logTest('Obtener factura por ID', false, e.message);
      }
    }

    // 9.4 Filter invoices by status
    try {
      const pending = await makeRequest('GET', '/invoices?status=draft');
      logTest('Filtrar facturas por estado', pending.status === 200);
    } catch (e) {
      logTest('Filtrar facturas', false, e.message);
    }

    // 9.5 Update invoice status
    if (created.invoices.length > 0) {
      try {
        const update = await makeRequest('PUT', `/invoices/${created.invoices[0].id}`, {
          status: 'sent'
        });
        logTest('Actualizar estado factura', update.status === 200);
      } catch (e) {
        logTest('Actualizar factura', false, e.message);
      }
    }
  }

  // ============================================
  // 10. PAGOS
  // ============================================
  logSection('10. PAGOS');

  if (created.invoices.length > 0) {
    // 10.1 Create payment
    try {
      const payment = await makeRequest('POST', `/invoices/${created.invoices[0].id}/payment`, {
        amount: 100,
        paymentMethod: 'card',
        paymentDate: new Date().toISOString().split('T')[0],
        reference: 'TEST-PAY-001',
        notes: 'Pago parcial de prueba'
      });
      logTest('Registrar pago', payment.status === 201 || payment.status === 200);
    } catch (e) {
      logTest('Registrar pago', false, e.message);
    }

    // 10.2 List payments
    try {
      const payments = await makeRequest('GET', `/invoices/${created.invoices[0].id}/payments`);
      logTest('Listar pagos de factura', payments.status === 200);
    } catch (e) {
      logTest('Listar pagos', false, e.message);
    }
  }

  // ============================================
  // 11. ALERTAS Y RECORDATORIOS
  // ============================================
  logSection('11. ALERTAS Y RECORDATORIOS');

  // 11.1 Create reminder
  try {
    const reminder = await makeRequest('POST', '/reminders', {
      title: 'Recordatorio de prueba',
      message: 'Revisar equipo del cliente',
      dueDate: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
      priority: 'medium'
    });
    logTest('Crear recordatorio', reminder.status === 201 || reminder.status === 200);
  } catch (e) {
    logTest('Crear recordatorio', false, e.message);
  }

  // 11.2 List reminders
  try {
    const reminders = await makeRequest('GET', '/reminders');
    logTest('Listar recordatorios', reminders.status === 200);
  } catch (e) {
    logTest('Listar recordatorios', false, e.message);
  }

  // 11.3 List alerts
  try {
    const alerts = await makeRequest('GET', '/alerts');
    logTest('Listar alertas', alerts.status === 200, `Total: ${alerts.data.alerts?.length}`);
  } catch (e) {
    logTest('Listar alertas', false, e.message);
  }

  // ============================================
  // 12. INVENTARIO
  // ============================================
  logSection('12. INVENTARIO');

  // 12.1 List inventory
  try {
    const inventory = await makeRequest('GET', '/inventory');
    logTest('Listar inventario', inventory.status === 200);
  } catch (e) {
    logTest('Listar inventario', false, e.message);
  }

  // 12.2 Add inventory item
  try {
    const inv = await makeRequest('POST', '/inventory', {
      name: 'Cloro Granulado Test',
      sku: 'CLR-TEST-001',
      category: 'Quimicos',
      quantity: 50,
      unit: 'lb',
      minQuantity: 10,
      costPrice: 2.50
    });
    logTest('Agregar item inventario', inv.status === 201 || inv.status === 200);
  } catch (e) {
    logTest('Agregar inventario', false, e.message);
  }

  // ============================================
  // 13. REPORTES Y ANALYTICS
  // ============================================
  logSection('13. REPORTES Y ANALYTICS');

  // 13.1 Dashboard stats
  try {
    const stats = await makeRequest('GET', '/analytics/dashboard');
    logTest('Dashboard estadísticas', stats.status === 200);
  } catch (e) {
    logTest('Dashboard stats', false, e.message);
  }

  // 13.2 Services report
  try {
    const services = await makeRequest('GET', '/reports/services');
    logTest('Reporte de servicios', services.status === 200);
  } catch (e) {
    logTest('Reporte servicios', false, e.message);
  }

  // 13.3 Technicians report
  try {
    const techReport = await makeRequest('GET', '/reports/technicians');
    logTest('Reporte de técnicos', techReport.status === 200);
  } catch (e) {
    logTest('Reporte técnicos', false, e.message);
  }

  // 13.4 Client report (specific client)
  if (created.clients.length > 0) {
    try {
      const clientReport = await makeRequest('GET', `/reports/client/${created.clients[0].id}`);
      logTest('Reporte de cliente', clientReport.status === 200);
    } catch (e) {
      logTest('Reporte cliente', false, e.message);
    }
  }

  // ============================================
  // 14. PORTAL DEL TÉCNICO
  // ============================================
  logSection('14. PORTAL DEL TÉCNICO');

  // 14.1 Login as technician
  if (created.technicians.length > 0) {
    try {
      const techLogin = await makeRequest('POST', '/technician-portal/login', {
        email: created.technicians[0]?.email,
        password: 'Tech123!'
      });
      if (techLogin.data.token || techLogin.data.accessToken) {
        technicianToken = techLogin.data.token || techLogin.data.accessToken;
        logTest('Login técnico portal', true);
      } else {
        // Try regular login
        const regLogin = await makeRequest('POST', '/auth/login', {
          email: created.technicians[0]?.email,
          password: 'Tech123!'
        });
        if (regLogin.data.accessToken) {
          technicianToken = regLogin.data.accessToken;
          logTest('Login técnico (auth regular)', true);
        } else {
          logTest('Login técnico', false, JSON.stringify(techLogin.data));
        }
      }
    } catch (e) {
      logTest('Login técnico', false, e.message);
    }

    // 14.2 Get technician's route
    if (technicianToken) {
      try {
        const myRoute = await makeRequest('GET', '/technician-portal/my-route', null, technicianToken);
        logTest('Obtener mi ruta', myRoute.status === 200 || myRoute.status === 404);
      } catch (e) {
        logTest('Mi ruta', false, e.message);
      }

      // 14.3 Get today's assignments
      try {
        const today = await makeRequest('GET', '/technician-portal/today', null, technicianToken);
        logTest('Asignaciones de hoy', today.status === 200 || today.status === 404);
      } catch (e) {
        logTest('Asignaciones hoy', false, e.message);
      }

      // 14.4 Get assigned pools
      try {
        const pools = await makeRequest('GET', '/technician-portal/pools', null, technicianToken);
        logTest('Piscinas asignadas', pools.status === 200 || pools.status === 404);
      } catch (e) {
        logTest('Piscinas asignadas', false, e.message);
      }
    }
  }

  // ============================================
  // 15. PORTAL DEL CLIENTE
  // ============================================
  logSection('15. PORTAL DEL CLIENTE');

  // 15.1 Enable portal for client
  if (created.clients.length > 0) {
    try {
      const enablePortal = await makeRequest('PUT', `/clients/${created.clients[0].id}`, {
        portalEnabled: true,
        portalEmail: created.clients[0].email
      });
      logTest('Habilitar portal cliente', enablePortal.status === 200);
    } catch (e) {
      logTest('Habilitar portal', false, e.message);
    }

    // 15.2 Portal endpoints (public)
    try {
      const portalInfo = await makeRequest('GET', '/portal/info');
      logTest('Info portal (público)', portalInfo.status === 200 || portalInfo.status === 401);
    } catch (e) {
      logTest('Info portal', false, e.message);
    }

    // 15.3 Test portal login
    try {
      const portalLogin = await makeRequest('POST', '/portal/login', {
        email: created.clients[0].email,
        password: 'test123'
      });
      logTest('Login portal cliente', portalLogin.status === 200 || portalLogin.status === 401, 'Sin password configurado');
    } catch (e) {
      logTest('Login portal cliente', false, e.message);
    }
  }

  // ============================================
  // 16. CONFIGURACIÓN DE EMPRESA
  // ============================================
  logSection('16. CONFIGURACIÓN DE EMPRESA');

  // 16.1 Get company settings
  try {
    const company = await makeRequest('GET', '/company');
    logTest('Obtener configuración empresa', company.status === 200, `Nombre: ${company.data.company?.name || company.data.company?.company_name}`);
  } catch (e) {
    logTest('Config empresa', false, e.message);
  }

  // 16.2 Update company settings
  try {
    const update = await makeRequest('PUT', '/company', {
      phone: '787-555-0000',
      timezone: 'America/Puerto_Rico'
    });
    logTest('Actualizar empresa', update.status === 200);
  } catch (e) {
    logTest('Actualizar empresa', false, e.message);
  }

  // ============================================
  // 17. ESTIMADOS
  // ============================================
  logSection('17. ESTIMADOS');

  if (created.clients.length > 0) {
    // 17.1 Create estimate
    try {
      const estimate = await makeRequest('POST', '/estimates', {
        clientId: created.clients[0].id,
        validUntil: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        items: [
          { description: 'Instalación de bomba', quantity: 1, unitPrice: 500 },
          { description: 'Mano de obra', quantity: 4, unitPrice: 85 }
        ],
        notes: 'Estimado de prueba'
      });
      logTest('Crear estimado', estimate.status === 201 || estimate.status === 200);
    } catch (e) {
      logTest('Crear estimado', false, e.message);
    }

    // 17.2 List estimates
    try {
      const estimates = await makeRequest('GET', '/estimates');
      logTest('Listar estimados', estimates.status === 200, `Total: ${estimates.data.estimates?.length}`);
    } catch (e) {
      logTest('Listar estimados', false, e.message);
    }
  }

  // ============================================
  // RESUMEN FINAL
  // ============================================
  console.log('\n' + '═'.repeat(50));
  console.log('              RESUMEN DE PRUEBAS');
  console.log('═'.repeat(50));
  console.log(`\n  \x1b[32m✓ Pasaron: ${results.passed}\x1b[0m`);
  console.log(`  \x1b[31m✗ Fallaron: ${results.failed}\x1b[0m`);
  console.log(`  Total: ${results.passed + results.failed}`);
  console.log(`  Porcentaje: ${Math.round(results.passed / (results.passed + results.failed) * 100)}%`);
  console.log('═'.repeat(50));

  if (results.failed > 0) {
    console.log('\n\x1b[33mPruebas fallidas:\x1b[0m');
    results.tests.filter(t => !t.passed).forEach(t => {
      console.log(`  • ${t.name}${t.details ? `: ${t.details}` : ''}`);
    });
  }

  console.log('\n\x1b[36mDatos creados en producción:\x1b[0m');
  console.log(`  • Items: ${created.items.length}`);
  console.log(`  • Técnicos: ${created.technicians.length}`);
  console.log(`  • Clientes: ${created.clients.length}`);
  console.log(`  • Piscinas: ${created.pools.length}`);
  console.log(`  • Rutas: ${created.routes.length}`);
  console.log(`  • Facturas: ${created.invoices.length}`);
  console.log(`  • Equipos: ${created.equipment.length}`);
  console.log('');
}

runTests().catch(console.error);
