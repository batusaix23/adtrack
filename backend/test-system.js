const https = require('https');

const API_URL = 'https://backend-production-30d8.up.railway.app/api';

// Test data
const testData = {
  technicians: [
    { firstName: 'Carlos', lastName: 'Rodriguez', email: 'carlos.test@example.com', phone: '787-555-0101', role: 'technician' },
    { firstName: 'Maria', lastName: 'Santos', email: 'maria.test@example.com', phone: '787-555-0102', role: 'technician' },
    { firstName: 'Juan', lastName: 'Perez', email: 'juan.test@example.com', phone: '787-555-0103', role: 'technician' }
  ],
  serviceItems: [
    { name: 'Mantenimiento Semanal', itemType: 'service', category: 'Mantenimiento', basePrice: 150, costPrice: 50, unit: 'month', taxRate: 11.5, description: 'Servicio de mantenimiento semanal de piscina' },
    { name: 'Cloro Granulado 50lb', itemType: 'chemical', category: 'Quimicos', basePrice: 125, costPrice: 85, unit: 'unit', taxRate: 11.5, description: 'Cloro granulado para piscinas' },
    { name: 'Acido Muriatico 1gal', itemType: 'chemical', category: 'Quimicos', basePrice: 15, costPrice: 8, unit: 'gal', taxRate: 11.5, description: 'Acido para balance de pH' },
    { name: 'Estabilizador 25lb', itemType: 'chemical', category: 'Quimicos', basePrice: 89, costPrice: 55, unit: 'unit', taxRate: 11.5, description: 'Estabilizador de cloro' },
    { name: 'Bomba Hayward 1HP', itemType: 'part', category: 'Equipos', basePrice: 450, costPrice: 320, unit: 'unit', taxRate: 11.5, description: 'Bomba de piscina Hayward' },
    { name: 'Filtro de Arena', itemType: 'part', category: 'Equipos', basePrice: 380, costPrice: 250, unit: 'unit', taxRate: 11.5, description: 'Filtro de arena para piscina' },
    { name: 'Servicio de Reparacion', itemType: 'service', category: 'Reparaciones', basePrice: 85, costPrice: 0, unit: 'hour', taxRate: 11.5, description: 'Hora de servicio de reparacion' },
    { name: 'Limpieza Profunda', itemType: 'service', category: 'Limpieza', basePrice: 250, costPrice: 50, unit: 'unit', taxRate: 11.5, description: 'Limpieza profunda de piscina' }
  ],
  clients: [
    {
      name: 'Roberto Martinez Test',
      email: 'roberto.test2@example.com', phone: '787-555-0201',
      address: 'Calle Luna 123', city: 'San Juan', state: 'PR', zipCode: '00901',
      clientType: 'residential'
    },
    {
      name: 'Ana Garcia Test',
      email: 'ana.test2@example.com', phone: '787-555-0203',
      address: 'Ave Ashford 456', city: 'Condado', state: 'PR', zipCode: '00907',
      clientType: 'commercial'
    },
    {
      name: 'Luis Rivera Test',
      email: 'luis.test2@example.com', phone: '787-555-0205',
      address: 'Urb. El Paraiso Calle 5', city: 'Guaynabo', state: 'PR', zipCode: '00969',
      clientType: 'residential'
    }
  ]
};

let authToken = '';
let results = { passed: 0, failed: 0, tests: [] };

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL + path);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
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
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function logTest(name, passed, details = '') {
  const status = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${status}\x1b[0m ${name}${details ? ` - ${details}` : ''}`);
  results.tests.push({ name, passed, details });
  if (passed) results.passed++; else results.failed++;
}

async function runTests() {
  console.log('\n========================================');
  console.log('  AGUADULCE TRACK - PRUEBAS DEL SISTEMA');
  console.log('========================================\n');
  console.log(`API: ${API_URL}\n`);

  // 1. Health Check - test auth endpoint exists
  console.log('\n--- VERIFICACION DE SALUD ---');
  try {
    // Test that API responds (auth endpoint should return error but 400/401 means it's working)
    const health = await makeRequest('POST', '/auth/login', { email: '', password: '' });
    const isUp = health.status === 400 || health.status === 401 || health.status === 200;
    logTest('API Disponible', isUp, `Status: ${health.status}`);
  } catch (e) {
    logTest('API Disponible', false, e.message);
  }

  // 2. Login as admin
  console.log('\n--- AUTENTICACION ---');
  try {
    const login = await makeRequest('POST', '/auth/login', {
      email: 'admin@aguadulcetrack.com',
      password: 'Admin123!'
    });
    if (login.data.accessToken || login.data.token) {
      authToken = login.data.accessToken || login.data.token;
      logTest('Login Admin', true, 'Token obtenido');
    } else if (login.data.error === 'Credenciales inválidas') {
      // Try to register new company
      console.log('  Usuario no existe. Registrando nueva empresa...');
      const register = await makeRequest('POST', '/auth/register', {
        companyName: 'Aguadulce Track Test',
        email: 'admin@aguadulcetrack.com',
        password: 'Admin123!',
        firstName: 'Admin',
        lastName: 'System',
        phone: '787-555-0000'
      });
      if (register.data.accessToken || register.data.token) {
        authToken = register.data.accessToken || register.data.token;
        logTest('Registro Empresa', true, 'Empresa y usuario creados');
      } else {
        logTest('Autenticacion', false, JSON.stringify(register.data));
      }
    } else {
      logTest('Autenticacion', false, JSON.stringify(login.data));
    }
  } catch (e) {
    logTest('Autenticacion', false, e.message);
  }

  if (!authToken) {
    console.log('\n\x1b[31mNo se pudo autenticar. Abortando pruebas.\x1b[0m\n');
    return;
  }

  // 3. Create Service Items (Catalog)
  console.log('\n--- CATALOGO DE ITEMS ---');
  const createdItems = [];
  for (const item of testData.serviceItems) {
    try {
      const res = await makeRequest('POST', '/service-items', item);
      if (res.status === 201 || res.status === 200) {
        createdItems.push(res.data.item);
        logTest(`Crear Item: ${item.name}`, true, `SKU: ${res.data.item?.sku || 'N/A'}`);
      } else {
        logTest(`Crear Item: ${item.name}`, false, JSON.stringify(res.data));
      }
    } catch (e) {
      logTest(`Crear Item: ${item.name}`, false, e.message);
    }
  }

  // 4. Get all items
  try {
    const items = await makeRequest('GET', '/service-items');
    logTest('Listar Items', items.status === 200, `Total: ${items.data.items?.length || 0}`);
  } catch (e) {
    logTest('Listar Items', false, e.message);
  }

  // 5. Search items
  try {
    const search = await makeRequest('GET', '/service-items/search?q=cloro');
    logTest('Buscar Items (cloro)', search.status === 200, `Encontrados: ${search.data.items?.length || 0}`);
  } catch (e) {
    logTest('Buscar Items', false, e.message);
  }

  // 6. Create Technicians
  console.log('\n--- TECNICOS ---');
  const createdTechs = [];
  for (const tech of testData.technicians) {
    try {
      const res = await makeRequest('POST', '/users', { ...tech, password: 'Tech123!' });
      if (res.status === 201 || res.status === 200) {
        createdTechs.push(res.data.user);
        logTest(`Crear Tecnico: ${tech.firstName} ${tech.lastName}`, true);
      } else if (res.data.error?.includes('ya está registrado') || res.data.error?.includes('already exists')) {
        logTest(`Crear Tecnico: ${tech.firstName}`, true, 'Ya existe');
      } else {
        logTest(`Crear Tecnico: ${tech.firstName}`, false, JSON.stringify(res.data));
      }
    } catch (e) {
      logTest(`Crear Tecnico: ${tech.firstName}`, false, e.message);
    }
  }

  // 7. Get technicians
  try {
    const techs = await makeRequest('GET', '/users?role=technician');
    logTest('Listar Tecnicos', techs.status === 200, `Total: ${techs.data.users?.length || 0}`);
  } catch (e) {
    logTest('Listar Tecnicos', false, e.message);
  }

  // 8. Create Clients
  console.log('\n--- CLIENTES ---');
  const createdClients = [];
  for (const client of testData.clients) {
    try {
      const res = await makeRequest('POST', '/clients', client);
      if (res.status === 201 || res.status === 200) {
        createdClients.push(res.data.client);
        logTest(`Crear Cliente: ${client.name}`, true, `ID: ${res.data.client?.id?.slice(0,8) || 'N/A'}`);
      } else if (res.data.error?.includes('ya existe') || res.data.error?.includes('already exists')) {
        logTest(`Crear Cliente: ${client.name}`, true, 'Ya existe');
      } else {
        logTest(`Crear Cliente: ${client.name}`, false, JSON.stringify(res.data));
      }
    } catch (e) {
      logTest(`Crear Cliente: ${client.name}`, false, e.message);
    }
  }

  // 9. Get all clients
  try {
    const clients = await makeRequest('GET', '/clients');
    logTest('Listar Clientes', clients.status === 200, `Total: ${clients.data.clients?.length || 0}`);

    // Save first client for invoice test
    if (clients.data.clients?.length > 0) {
      createdClients.push(clients.data.clients[0]);
    }
  } catch (e) {
    logTest('Listar Clientes', false, e.message);
  }

  // 10. Search clients
  try {
    const search = await makeRequest('GET', '/clients?search=roberto');
    logTest('Buscar Clientes (roberto)', search.status === 200, `Encontrados: ${search.data.clients?.length || 0}`);
  } catch (e) {
    logTest('Buscar Clientes', false, e.message);
  }

  // 11. Create Invoice
  console.log('\n--- FACTURAS ---');
  if (createdClients.length > 0) {
    const clientId = createdClients[0]?.id;
    if (clientId) {
      try {
        const invoiceData = {
          clientId: clientId,
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
          items: [
            { description: 'Mantenimiento Mensual', quantity: 1, unitPrice: 150, taxRate: 11.5 },
            { description: 'Cloro Granulado', quantity: 2, unitPrice: 125, taxRate: 11.5 }
          ],
          notes: 'Factura de prueba generada automaticamente'
        };
        const res = await makeRequest('POST', '/invoices', invoiceData);
        if (res.status === 201 || res.status === 200) {
          logTest('Crear Factura', true, `Numero: ${res.data.invoice?.invoice_number || 'N/A'}`);
        } else {
          logTest('Crear Factura', false, JSON.stringify(res.data));
        }
      } catch (e) {
        logTest('Crear Factura', false, e.message);
      }
    }
  }

  // 12. Get invoices
  try {
    const invoices = await makeRequest('GET', '/invoices');
    logTest('Listar Facturas', invoices.status === 200, `Total: ${invoices.data.invoices?.length || 0}`);
  } catch (e) {
    logTest('Listar Facturas', false, e.message);
  }

  // 13. Get client transactions
  console.log('\n--- TRANSACCIONES DE CLIENTE ---');
  if (createdClients.length > 0 && createdClients[0]?.id) {
    try {
      const trans = await makeRequest('GET', `/clients/${createdClients[0].id}/transactions`);
      logTest('Transacciones de Cliente', trans.status === 200, `Total: ${trans.data.transactions?.length || 0}`);
    } catch (e) {
      logTest('Transacciones de Cliente', false, e.message);
    }

    try {
      const summary = await makeRequest('GET', `/clients/${createdClients[0].id}/summary`);
      logTest('Resumen de Cliente', summary.status === 200);
    } catch (e) {
      logTest('Resumen de Cliente', false, e.message);
    }
  }

  // 14. Test categories
  console.log('\n--- CATEGORIAS ---');
  try {
    const cats = await makeRequest('GET', '/service-items/categories');
    logTest('Obtener Categorias', cats.status === 200, `Total: ${cats.data.categories?.length || 0}`);
  } catch (e) {
    logTest('Obtener Categorias', false, e.message);
  }

  // Summary
  console.log('\n========================================');
  console.log('            RESUMEN DE PRUEBAS');
  console.log('========================================');
  console.log(`\x1b[32mPasaron: ${results.passed}\x1b[0m`);
  console.log(`\x1b[31mFallaron: ${results.failed}\x1b[0m`);
  console.log(`Total: ${results.passed + results.failed}`);
  console.log('========================================\n');

  if (results.failed > 0) {
    console.log('Pruebas fallidas:');
    results.tests.filter(t => !t.passed).forEach(t => {
      console.log(`  - ${t.name}: ${t.details}`);
    });
    console.log('');
  }
}

runTests().catch(console.error);
