// Catálogo de permisos (RBAC). Cada ruta del backend exige un permiso, no un rol;
// el administrador decide qué permisos tiene cada rol desde su panel.
export const PERMISOS = {
  evaluar: 'Registrar sus parcelas, comparar rotaciones y guardar evaluaciones',
  ver_todas: 'Ver las parcelas y evaluaciones individuales de todos los agricultores',
  revisar: 'Revisar las evaluaciones de sus parcelas asignadas y dejar la nota técnica',
  reportes: 'Ver el tablero de monitoreo y los reportes regionales (datos agregados)',
  alertas: 'Recibir alertas climáticas críticas en su teléfono',
  usuarios: 'Gestionar usuarios, roles y permisos; ver la auditoría',
  respaldos: 'Crear y restaurar respaldos de la base de datos',
  ofertar: 'Publicar su oferta de cosecha y responder solicitudes de compradores',
  comprar: 'Ver la oferta sostenible y enviar solicitudes de compra a los productores',
  incidencias: 'Registrar plagas y enfermedades en el mapa, con fotos',
  asistencia: 'Registrar visitas técnicas y validar las estrategias con observaciones locales',
  asignar: 'Asignar parcelas a los técnicos de campo',
};

// Sin "ver_todas", un técnico ve solo las parcelas que tiene asignadas (HU-OPT-01) y un analista
// ve solo datos agregados por distrito (HU-MON-01).
export const POR_DEFECTO = {
  administrador: ['usuarios', 'respaldos', 'reportes', 'ver_todas', 'revisar', 'asignar'],
  operativo: ['revisar', 'reportes', 'alertas', 'incidencias', 'asistencia'],
  cliente: ['evaluar', 'alertas', 'ofertar'],
  monitoreo: ['reportes', 'alertas'],
  comprador: ['comprar'],
};

// Permisos que existían antes de registrar cuáles se sembraron (tabla permisos_sembrados).
// En una base de esa época solo se siembran los valores por defecto de los permisos posteriores.
export const ORIGINALES = ['evaluar', 'ver_todas', 'revisar', 'reportes', 'alertas', 'usuarios', 'respaldos'];

// Retiros que se aplican una sola vez a una base existente (se registran en permisos_sembrados con
// esta clave). El administrador puede volver a otorgar el permiso desde su panel.
export const RETIROS = {
  'retiro:ver_todas': { permiso: 'ver_todas', roles: ['operativo', 'monitoreo'] },
};

// El administrador conserva siempre la gestión de usuarios: así nadie queda fuera del sistema.
export const FIJOS = { administrador: ['usuarios'] };

// Roles con privilegios: sus cuentas nuevas quedan pendientes hasta que un responsable las aprueba (HU-ADM-01).
export const ROLES_CON_APROBACION = ['administrador', 'operativo', 'monitoreo'];

export const esPermiso = (p) => Object.hasOwn(PERMISOS, p);
