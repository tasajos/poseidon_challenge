// Catálogo de permisos (RBAC). Cada ruta del backend exige un permiso, no un rol;
// el administrador decide qué permisos tiene cada rol desde su panel.
export const PERMISOS = {
  evaluar: 'Comparar rotaciones y guardar evaluaciones de sus parcelas',
  ver_todas: 'Ver las parcelas y evaluaciones de todos los agricultores',
  revisar: 'Revisar evaluaciones y dejar la nota técnica',
  reportes: 'Ver el tablero de monitoreo y los reportes regionales',
  alertas: 'Recibir alertas climáticas críticas en su teléfono',
  usuarios: 'Gestionar usuarios, roles y permisos',
  respaldos: 'Crear y restaurar respaldos de la base de datos',
  ofertar: 'Publicar su oferta de cosecha y responder solicitudes de compradores',
  comprar: 'Ver la oferta sostenible y enviar solicitudes de compra a los productores',
  incidencias: 'Registrar plagas y enfermedades en el mapa, con fotos',
};

export const POR_DEFECTO = {
  administrador: ['usuarios', 'respaldos', 'reportes', 'ver_todas', 'revisar'],
  operativo: ['ver_todas', 'revisar', 'reportes', 'alertas', 'incidencias'],
  cliente: ['evaluar', 'alertas', 'ofertar'],
  monitoreo: ['ver_todas', 'reportes', 'alertas'],
  comprador: ['comprar'],
};

// Permisos que existían antes de registrar cuáles se sembraron (tabla permisos_sembrados).
// En una base de esa época solo se siembran los valores por defecto de los permisos posteriores.
export const ORIGINALES = ['evaluar', 'ver_todas', 'revisar', 'reportes', 'alertas', 'usuarios', 'respaldos'];

// El administrador conserva siempre la gestión de usuarios: así nadie queda fuera del sistema.
export const FIJOS = { administrador: ['usuarios'] };

export const esPermiso = (p) => Object.hasOwn(PERMISOS, p);
