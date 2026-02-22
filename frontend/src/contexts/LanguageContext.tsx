'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Auth
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.forgotPassword': 'Forgot your password?',
    'auth.rememberMe': 'Remember me',
    'auth.noAccount': "Don't have an account?",
    'auth.hasAccount': 'Already have an account?',
    'auth.registerCompany': 'Register Company',
    'auth.companyName': 'Company Name',
    'auth.firstName': 'First Name',
    'auth.lastName': 'Last Name',
    'auth.phone': 'Phone',
    'auth.continue': 'Continue',
    'auth.back': 'Back',
    'auth.createAccount': 'Create Account',
    'auth.companyInfo': 'Company Information',
    'auth.yourInfo': 'Your Information',
    'auth.step': 'Step',
    'auth.of': 'of',
    'auth.welcome': 'Welcome',
    'auth.loginSubtitle': 'Enter your credentials to access',
    'auth.demoCredentials': 'Demo credentials',

    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.services': 'Services',
    'nav.calendar': 'Calendar',
    'nav.clients': 'Clients',
    'nav.pools': 'Pools',
    'nav.chemicals': 'Chemicals',
    'nav.inventory': 'Inventory',
    'nav.alerts': 'Alerts',
    'nav.analytics': 'Analytics',
    'nav.settings': 'Settings',
    'nav.profile': 'Profile',
    'nav.logout': 'Logout',
    'nav.company': 'Company',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.completedToday': 'Completed Today',
    'dashboard.pendingToday': 'Pending Today',
    'dashboard.activeAlerts': 'Active Alerts',
    'dashboard.lowStock': 'Low Stock',
    'dashboard.recentServices': 'Recent Services',
    'dashboard.weeklySummary': 'Weekly Summary',
    'dashboard.totalServices': 'Total Services',
    'dashboard.completed': 'Completed',
    'dashboard.totalTime': 'Total Time',
    'dashboard.completionRate': 'Completion Rate',
    'dashboard.critical': 'critical',

    // Clients
    'clients.title': 'Clients',
    'clients.search': 'Search clients...',
    'clients.new': 'New Client',
    'clients.edit': 'Edit Client',
    'clients.name': 'First Name',
    'clients.lastName': 'Last Name',
    'clients.companyName': 'Company',
    'clients.email': 'Email',
    'clients.phone': 'Phone',
    'clients.address': 'Address',
    'clients.city': 'City',
    'clients.state': 'State',
    'clients.zipCode': 'Zip Code',
    'clients.notes': 'Notes',
    'clients.pools': 'pools',
    'clients.services': 'services',
    'clients.active': 'Active',
    'clients.inactive': 'Inactive',
    'clients.import': 'Import Clients',
    'clients.importTitle': 'Import Clients from File',
    'clients.importDescription': 'Upload a CSV or Excel file with client data',
    'clients.downloadTemplate': 'Download Template',
    'clients.selectFile': 'Select File',
    'clients.dragDrop': 'or drag and drop here',
    'clients.supportedFormats': 'Supported formats: CSV, XLSX',
    'clients.importing': 'Importing...',
    'clients.importSuccess': 'clients imported successfully',
    'clients.importError': 'Error importing clients',
    'clients.noClients': 'No clients found',
    'clients.createFirst': 'Create first client',
    'clients.status': 'Client Status',
    'clients.statusDescription': 'Inactive clients will not appear in route assignments',

    // Pools
    'pools.title': 'Pools',
    'pools.new': 'New Pool',
    'pools.edit': 'Edit Pool',
    'pools.name': 'Name',
    'pools.type': 'Type',
    'pools.residential': 'Residential',
    'pools.commercial': 'Commercial',
    'pools.community': 'Community',
    'pools.volume': 'Volume (gallons)',
    'pools.serviceDay': 'Service Day',
    'pools.monthlyRate': 'Monthly Rate',
    'pools.hasSpa': 'Has Spa',
    'pools.hasHeater': 'Has Heater',
    'pools.hasSaltSystem': 'Salt System',
    'pools.all': 'All',

    // Services
    'services.title': 'Services',
    'services.new': 'New Service',
    'services.scheduled': 'Scheduled',
    'services.inProgress': 'In Progress',
    'services.completed': 'Completed',
    'services.cancelled': 'Cancelled',
    'services.pending': 'Pending',
    'services.pool': 'Pool',
    'services.technician': 'Technician',
    'services.date': 'Date',
    'services.time': 'Time',
    'services.schedule': 'Schedule',
    'services.start': 'Start',
    'services.complete': 'Complete',
    'services.cancel': 'Cancel',

    // Chemicals
    'chemicals.title': 'Chemicals',
    'chemicals.new': 'New Chemical',
    'chemicals.name': 'Name',
    'chemicals.unit': 'Unit',
    'chemicals.costPerUnit': 'Cost per Unit',
    'chemicals.category': 'Category',
    'chemicals.sanitizer': 'Sanitizer',
    'chemicals.balancer': 'Balancer',
    'chemicals.shock': 'Shock',
    'chemicals.algaecide': 'Algaecide',
    'chemicals.clarifier': 'Clarifier',
    'chemicals.stabilizer': 'Stabilizer',

    // Inventory
    'inventory.title': 'Inventory',
    'inventory.totalProducts': 'Total Products',
    'inventory.lowStock': 'Low Stock',
    'inventory.totalValue': 'Total Value',
    'inventory.product': 'Product',
    'inventory.quantity': 'Quantity',
    'inventory.minimum': 'Minimum',
    'inventory.status': 'Status',
    'inventory.addStock': 'Add Stock',
    'inventory.normal': 'Normal',
    'inventory.lowStockOnly': 'Low stock only',

    // Alerts
    'alerts.title': 'Alerts',
    'alerts.active': 'Active',
    'alerts.acknowledged': 'Acknowledged',
    'alerts.resolved': 'Resolved',
    'alerts.acknowledge': 'Acknowledge',
    'alerts.resolve': 'Resolve',
    'alerts.noAlerts': 'No active alerts',
    'alerts.allGood': 'Everything is working correctly',
    'alerts.critical': 'Critical',
    'alerts.high': 'High Priority',

    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.update': 'Update',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.loading': 'Loading...',
    'common.noData': 'No data',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.from': 'From',
    'common.to': 'To',
    'common.all': 'All',
    'common.actions': 'Actions',

    // Days
    'days.monday': 'Monday',
    'days.tuesday': 'Tuesday',
    'days.wednesday': 'Wednesday',
    'days.thursday': 'Thursday',
    'days.friday': 'Friday',
    'days.saturday': 'Saturday',
    'days.sunday': 'Sunday',

    // Technician
    'tech.hello': 'Hello',
    'tech.servicesToday': 'Services today',
    'tech.todayServices': "Today's Services",
    'tech.noServices': 'No services scheduled for today',
    'tech.startService': 'Start Service',
    'tech.continueService': 'Continue',
    'tech.viewDetails': 'View',
    'tech.waterReadings': 'Water Readings',
    'tech.tasksCompleted': 'Tasks Completed',
    'tech.chemicalsUsed': 'Chemicals Used',
    'tech.notes': 'Notes',
    'tech.completeService': 'Complete Service',
    'tech.serviceCompleted': 'Service Completed',

    // Water readings
    'water.ph': 'pH',
    'water.chlorine': 'Chlorine (ppm)',
    'water.alkalinity': 'Alkalinity',
    'water.salt': 'Salt (ppm)',
    'water.temperature': 'Temperature',

    // Tasks
    'task.skimmedSurface': 'Skimmed surface',
    'task.brushedWalls': 'Brushed walls',
    'task.vacuumedPool': 'Vacuumed pool',
    'task.cleanedSkimmer': 'Cleaned skimmer',
    'task.checkedEquipment': 'Checked equipment',
    'task.backwashedFilter': 'Backwashed filter',
    'task.emptiedPumpBasket': 'Emptied pump basket',
  },
  es: {
    // Auth
    'auth.login': 'Iniciar Sesión',
    'auth.register': 'Registrarse',
    'auth.email': 'Correo electrónico',
    'auth.password': 'Contraseña',
    'auth.confirmPassword': 'Confirmar Contraseña',
    'auth.forgotPassword': '¿Olvidaste tu contraseña?',
    'auth.rememberMe': 'Recordarme',
    'auth.noAccount': '¿No tienes cuenta?',
    'auth.hasAccount': '¿Ya tienes cuenta?',
    'auth.registerCompany': 'Registrar Empresa',
    'auth.companyName': 'Nombre de la Empresa',
    'auth.firstName': 'Nombre',
    'auth.lastName': 'Apellido',
    'auth.phone': 'Teléfono',
    'auth.continue': 'Continuar',
    'auth.back': 'Atrás',
    'auth.createAccount': 'Crear Cuenta',
    'auth.companyInfo': 'Información de la Empresa',
    'auth.yourInfo': 'Tu Información',
    'auth.step': 'Paso',
    'auth.of': 'de',
    'auth.welcome': 'Bienvenido',
    'auth.loginSubtitle': 'Ingresa tus credenciales para acceder',
    'auth.demoCredentials': 'Credenciales demo',

    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.services': 'Servicios',
    'nav.calendar': 'Calendario',
    'nav.clients': 'Clientes',
    'nav.pools': 'Piscinas',
    'nav.chemicals': 'Químicos',
    'nav.inventory': 'Inventario',
    'nav.alerts': 'Alertas',
    'nav.analytics': 'Analíticas',
    'nav.settings': 'Configuración',
    'nav.profile': 'Perfil',
    'nav.logout': 'Cerrar Sesión',
    'nav.company': 'Empresa',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.completedToday': 'Completados Hoy',
    'dashboard.pendingToday': 'Pendientes Hoy',
    'dashboard.activeAlerts': 'Alertas Activas',
    'dashboard.lowStock': 'Inventario Bajo',
    'dashboard.recentServices': 'Servicios Recientes',
    'dashboard.weeklySummary': 'Resumen Semanal',
    'dashboard.totalServices': 'Servicios totales',
    'dashboard.completed': 'Completados',
    'dashboard.totalTime': 'Tiempo total',
    'dashboard.completionRate': 'Tasa de completado',
    'dashboard.critical': 'críticas',

    // Clients
    'clients.title': 'Clientes',
    'clients.search': 'Buscar clientes...',
    'clients.new': 'Nuevo Cliente',
    'clients.edit': 'Editar Cliente',
    'clients.name': 'Nombre',
    'clients.lastName': 'Apellido',
    'clients.companyName': 'Empresa',
    'clients.email': 'Email',
    'clients.phone': 'Teléfono',
    'clients.address': 'Dirección',
    'clients.city': 'Ciudad',
    'clients.state': 'Estado',
    'clients.zipCode': 'Código Postal',
    'clients.notes': 'Notas',
    'clients.pools': 'piscinas',
    'clients.services': 'servicios',
    'clients.active': 'Activo',
    'clients.inactive': 'Inactivo',
    'clients.import': 'Importar Clientes',
    'clients.importTitle': 'Importar Clientes desde Archivo',
    'clients.importDescription': 'Sube un archivo CSV o Excel con datos de clientes',
    'clients.downloadTemplate': 'Descargar Plantilla',
    'clients.selectFile': 'Seleccionar Archivo',
    'clients.dragDrop': 'o arrastra y suelta aquí',
    'clients.supportedFormats': 'Formatos soportados: CSV, XLSX',
    'clients.importing': 'Importando...',
    'clients.importSuccess': 'clientes importados exitosamente',
    'clients.importError': 'Error al importar clientes',
    'clients.noClients': 'No se encontraron clientes',
    'clients.createFirst': 'Crear primer cliente',
    'clients.status': 'Estado del Cliente',
    'clients.statusDescription': 'Los clientes inactivos no aparecerán en las asignaciones de rutas',

    // Pools
    'pools.title': 'Piscinas',
    'pools.new': 'Nueva Piscina',
    'pools.edit': 'Editar Piscina',
    'pools.name': 'Nombre',
    'pools.type': 'Tipo',
    'pools.residential': 'Residencial',
    'pools.commercial': 'Comercial',
    'pools.community': 'Comunitaria',
    'pools.volume': 'Volumen (galones)',
    'pools.serviceDay': 'Día de Servicio',
    'pools.monthlyRate': 'Tarifa Mensual',
    'pools.hasSpa': 'Tiene Spa',
    'pools.hasHeater': 'Calentador',
    'pools.hasSaltSystem': 'Sistema de Sal',
    'pools.all': 'Todas',

    // Services
    'services.title': 'Servicios',
    'services.new': 'Nuevo Servicio',
    'services.scheduled': 'Programado',
    'services.inProgress': 'En Progreso',
    'services.completed': 'Completado',
    'services.cancelled': 'Cancelado',
    'services.pending': 'Pendiente',
    'services.pool': 'Piscina',
    'services.technician': 'Técnico',
    'services.date': 'Fecha',
    'services.time': 'Hora',
    'services.schedule': 'Programar',
    'services.start': 'Iniciar',
    'services.complete': 'Completar',
    'services.cancel': 'Cancelar',

    // Chemicals
    'chemicals.title': 'Químicos',
    'chemicals.new': 'Nuevo Químico',
    'chemicals.name': 'Nombre',
    'chemicals.unit': 'Unidad',
    'chemicals.costPerUnit': 'Costo por Unidad',
    'chemicals.category': 'Categoría',
    'chemicals.sanitizer': 'Sanitizante',
    'chemicals.balancer': 'Balanceador',
    'chemicals.shock': 'Shock',
    'chemicals.algaecide': 'Algicida',
    'chemicals.clarifier': 'Clarificador',
    'chemicals.stabilizer': 'Estabilizador',

    // Inventory
    'inventory.title': 'Inventario',
    'inventory.totalProducts': 'Total Productos',
    'inventory.lowStock': 'Stock Bajo',
    'inventory.totalValue': 'Valor Total',
    'inventory.product': 'Producto',
    'inventory.quantity': 'Cantidad',
    'inventory.minimum': 'Mínimo',
    'inventory.status': 'Estado',
    'inventory.addStock': 'Agregar Stock',
    'inventory.normal': 'Normal',
    'inventory.lowStockOnly': 'Solo stock bajo',

    // Alerts
    'alerts.title': 'Alertas',
    'alerts.active': 'Activas',
    'alerts.acknowledged': 'Reconocidas',
    'alerts.resolved': 'Resueltas',
    'alerts.acknowledge': 'Reconocer',
    'alerts.resolve': 'Resolver',
    'alerts.noAlerts': 'No hay alertas activas',
    'alerts.allGood': 'Todo está funcionando correctamente',
    'alerts.critical': 'Críticas',
    'alerts.high': 'Alta Prioridad',

    // Common
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.create': 'Crear',
    'common.update': 'Actualizar',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',
    'common.export': 'Exportar',
    'common.import': 'Importar',
    'common.loading': 'Cargando...',
    'common.noData': 'Sin datos',
    'common.confirm': 'Confirmar',
    'common.yes': 'Sí',
    'common.no': 'No',
    'common.from': 'Desde',
    'common.to': 'Hasta',
    'common.all': 'Todos',
    'common.actions': 'Acciones',

    // Days
    'days.monday': 'Lunes',
    'days.tuesday': 'Martes',
    'days.wednesday': 'Miércoles',
    'days.thursday': 'Jueves',
    'days.friday': 'Viernes',
    'days.saturday': 'Sábado',
    'days.sunday': 'Domingo',

    // Technician
    'tech.hello': 'Hola',
    'tech.servicesToday': 'Servicios hoy',
    'tech.todayServices': 'Servicios del día',
    'tech.noServices': 'No hay servicios programados para hoy',
    'tech.startService': 'Iniciar Servicio',
    'tech.continueService': 'Continuar',
    'tech.viewDetails': 'Ver',
    'tech.waterReadings': 'Lecturas de Agua',
    'tech.tasksCompleted': 'Tareas Completadas',
    'tech.chemicalsUsed': 'Químicos Utilizados',
    'tech.notes': 'Notas',
    'tech.completeService': 'Completar Servicio',
    'tech.serviceCompleted': 'Servicio Completado',

    // Water readings
    'water.ph': 'pH',
    'water.chlorine': 'Cloro (ppm)',
    'water.alkalinity': 'Alcalinidad',
    'water.salt': 'Sal (ppm)',
    'water.temperature': 'Temperatura',

    // Tasks
    'task.skimmedSurface': 'Superficie desnatada',
    'task.brushedWalls': 'Paredes cepilladas',
    'task.vacuumedPool': 'Piscina aspirada',
    'task.cleanedSkimmer': 'Skimmer limpio',
    'task.checkedEquipment': 'Equipo revisado',
    'task.backwashedFilter': 'Filtro lavado',
    'task.emptiedPumpBasket': 'Cesta de bomba vaciada',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('language') as Language;
    if (saved && (saved === 'en' || saved === 'es')) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
