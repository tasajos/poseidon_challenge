-- Poseidon Challenge · Asesor de rotación de cultivos
-- NASA Space Apps 2026 · Field Shift: Adapting Farms with NASA Data
-- Si ya creó una versión anterior del esquema, bórrela primero: DROP DATABASE poseidon;
CREATE DATABASE IF NOT EXISTS poseidon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE poseidon;

-- Usuarios y roles
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(200) NOT NULL,     -- scrypt, formato "sal:hash" en hexadecimal
  rol ENUM('administrador','operativo','cliente','monitoreo','comprador') NOT NULL DEFAULT 'cliente',  -- cliente = agricultor; comprador = cooperativa o mercado
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  telefono VARCHAR(20) NULL,
  pendiente BOOLEAN NOT NULL DEFAULT FALSE,  -- cuenta con privilegios que espera aprobación (HU-ADM-01)
  creado_por INT NULL,
  aprobado_por INT NULL,
  aprobado_en TIMESTAMP NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Catálogo de cultivos (valores de referencia, a validar con un agrónomo local)
CREATE TABLE IF NOT EXISTS cultivos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(60) NOT NULL,
  familia VARCHAR(40) NOT NULL,            -- para detectar repetición de familia (ciclos de plagas)
  ciclo_dias SMALLINT NOT NULL,            -- duración del ciclo
  mes_siembra TINYINT NOT NULL,            -- 1-12, siembra típica en valles de Cochabamba
  kc DECIMAL(3,2) NOT NULL,                -- coeficiente de cultivo medio (FAO-56, aproximado)
  tolerancia_helada TINYINT NOT NULL,      -- 0 sensible, 1 media, 2 tolerante
  fija_nitrogeno BOOLEAN NOT NULL DEFAULT FALSE,
  raiz_profunda BOOLEAN NOT NULL DEFAULT FALSE,
  forraje BOOLEAN NOT NULL DEFAULT FALSE,
  valor_mercado TINYINT NOT NULL           -- 1 bajo, 2 medio, 3 alto (referencial)
);

CREATE TABLE IF NOT EXISTS parcelas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,                 -- cliente dueño de la parcela
  nombre VARCHAR(80) NOT NULL,
  lat DECIMAL(8,5) NOT NULL,               -- punto marcado o centro del perímetro
  lon DECIMAL(8,5) NOT NULL,
  -- Declarado por el agricultor (HU-USR-01); NULL = no disponible
  superficie_ha DECIMAL(9,2) NULL,
  cultivo_actual VARCHAR(30) NULL,
  etapa VARCHAR(20) NULL,                  -- preparacion, siembra, crecimiento, floracion, cosecha, descanso
  riego VARCHAR(20) NULL,                  -- permanente, temporal, sin_riego
  perimetro JSON NULL,                     -- [[lat, lon], ...]
  tecnico_id INT NULL,                     -- técnico de campo asignado (HU-OPT-01)
  -- Completado por el sistema: SRTM (HU-USR-05) y fecha del último NDVI guardado (HU-USR-02)
  elevacion_m DECIMAL(7,1) NULL,
  pendiente_pct DECIMAL(5,1) NULL,
  terreno_en TIMESTAMP NULL,
  ndvi_en TIMESTAMP NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Cada comparación de rotaciones; el técnico (operativo) la revisa
CREATE TABLE IF NOT EXISTS evaluaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parcela_id INT NOT NULL,
  rotacion_actual JSON NOT NULL,           -- ["papa","maiz"]
  prioridades JSON NOT NULL,               -- {"agua":5,"suelo":3,...}
  fuente_clima VARCHAR(20) NOT NULL,       -- "nasa-power" o "demo"
  resultado JSON NOT NULL,                 -- las 3 estrategias devueltas
  estado ENUM('pendiente','revisada') NOT NULL DEFAULT 'pendiente',
  nota_tecnico TEXT NULL,
  revisado_por INT NULL,
  revisado_en TIMESTAMP NULL,
  adoptada VARCHAR(10) NULL,               -- estrategia que el agricultor decidió aplicar: actual, ajuste o cambio (HU-MON-03)
  adoptada_en TIMESTAMP NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parcela_id) REFERENCES parcelas(id) ON DELETE CASCADE,
  FOREIGN KEY (revisado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ---------- Permisos por rol (HU-ADM-04) ----------
-- El administrador edita esta matriz desde su panel. npm run seed carga los valores por defecto
-- (Backend/src/permisos.js) solo si la tabla está vacía. El backend crea estas tablas al arrancar si faltan.
CREATE TABLE IF NOT EXISTS rol_permisos (
  rol ENUM('administrador','operativo','cliente','monitoreo','comprador') NOT NULL,
  permiso VARCHAR(30) NOT NULL,            -- ver Backend/src/permisos.js
  PRIMARY KEY (rol, permiso)
);

-- ---------- Alertas climáticas (HU-USR-03) ----------
CREATE TABLE IF NOT EXISTS preferencias_alertas (
  usuario_id INT PRIMARY KEY,
  helada BOOLEAN NOT NULL DEFAULT TRUE,    -- tipos de alerta que la persona quiere recibir
  sequia BOOLEAN NOT NULL DEFAULT TRUE,
  web BOOLEAN NOT NULL DEFAULT TRUE,       -- canales
  sms BOOLEAN NOT NULL DEFAULT FALSE,
  telefono VARCHAR(20) NULL,               -- formato internacional, +59170000000
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Navegadores (teléfono o computadora) que aceptaron notificaciones web
CREATE TABLE IF NOT EXISTS suscripciones_push (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  endpoint VARCHAR(500) NOT NULL UNIQUE,
  p256dh VARCHAR(200) NOT NULL,
  auth VARCHAR(100) NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Historial de alertas enviadas; "clave" evita repetir la misma alerta
CREATE TABLE IF NOT EXISTS alertas_enviadas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  parcela_id INT NULL,
  tipo VARCHAR(20) NOT NULL,               -- helada, sequia, prueba
  clave VARCHAR(120) NOT NULL,
  titulo VARCHAR(120) NOT NULL,
  mensaje TEXT NOT NULL,
  canales JSON NOT NULL,                   -- [{canal:"web", estado:"enviado"}, {canal:"sms", ...}]
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY una_vez (usuario_id, clave),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Permisos cuyos valores por defecto ya se cargaron: un permiso nuevo se siembra una sola vez
CREATE TABLE IF NOT EXISTS permisos_sembrados (
  permiso VARCHAR(30) PRIMARY KEY
);

-- ---------- Oferta sostenible y solicitudes de compra (HU-CLI-02, HU-CLI-03) ----------
-- El agricultor publica un cultivo de una parcela evaluada. Las prácticas de rotación y el índice de
-- agua se calculan con esa evaluación; no los declara el productor.
CREATE TABLE IF NOT EXISTS ofertas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,                 -- productor
  evaluacion_id INT NOT NULL,              -- rotación de la que sale la cosecha
  cultivo VARCHAR(30) NOT NULL,            -- código del catálogo, parte de la rotación
  cantidad DECIMAL(10,2) NOT NULL,
  unidad ENUM('kg','qq','t') NOT NULL,
  disponible_desde CHAR(7) NOT NULL,       -- AAAA-MM
  nota VARCHAR(300) NULL,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones(id) ON DELETE CASCADE
);

-- Contacto mediado: los correos (y el teléfono, si el productor quiere) solo se comparten al aceptar
CREATE TABLE IF NOT EXISTS solicitudes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  oferta_id INT NOT NULL,
  comprador_id INT NOT NULL,
  productor_id INT NOT NULL,
  tipo ENUM('compra','contacto') NOT NULL,
  cantidad DECIMAL(10,2) NULL,
  mensaje VARCHAR(1000) NOT NULL,
  estado ENUM('pendiente','aceptada','rechazada','retirada') NOT NULL DEFAULT 'pendiente',
  respuesta VARCHAR(1000) NULL,
  telefono_productor VARCHAR(20) NULL,
  respondido_en TIMESTAMP NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (oferta_id) REFERENCES ofertas(id) ON DELETE CASCADE,
  FOREIGN KEY (comprador_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (productor_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ---------- Incidencias de plagas y enfermedades en campo (HU-OPT-02) ----------
CREATE TABLE IF NOT EXISTS incidencias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tecnico_id INT NOT NULL,
  tipo ENUM('plaga','enfermedad','deficiencia') NOT NULL,
  agente VARCHAR(80) NOT NULL,             -- p. ej. "gorgojo de los Andes", "tizón tardío"
  cultivo VARCHAR(30) NULL,                -- cultivo afectado (su familia orienta la rotación)
  severidad ENUM('baja','media','alta') NOT NULL,
  lat DECIMAL(9,6) NOT NULL,               -- coordenadas del GPS del teléfono
  lon DECIMAL(9,6) NOT NULL,
  precision_m SMALLINT NULL,               -- precisión informada por el GPS
  nota VARCHAR(500) NULL,
  estado ENUM('activa','controlada') NOT NULL DEFAULT 'activa',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tecnico_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Fotos: el archivo está en la unidad compartida de Google Drive (archivo = id de Drive)
-- o, sin Drive configurado, en Backend/fotos/ (archivo = nombre local)
CREATE TABLE IF NOT EXISTS incidencia_fotos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  incidencia_id INT NOT NULL,
  almacen ENUM('drive','local') NOT NULL,
  archivo VARCHAR(200) NOT NULL,
  enlace VARCHAR(300) NULL,                -- webViewLink de Drive
  mime VARCHAR(40) NOT NULL,
  bytes INT NOT NULL,
  subido_por INT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (incidencia_id) REFERENCES incidencias(id) ON DELETE CASCADE,
  FOREIGN KEY (subido_por) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ---------- Historial de la parcela (HU-USR-02) ----------
-- Campañas anteriores que registra el agricultor
CREATE TABLE IF NOT EXISTS ciclos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parcela_id INT NOT NULL,
  anio SMALLINT NOT NULL,
  cultivo VARCHAR(30) NOT NULL,
  rendimiento DECIMAL(8,2) NULL,           -- quintales por hectárea
  nota VARCHAR(300) NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parcela_id) REFERENCES parcelas(id) ON DELETE CASCADE
);

-- NDVI de MODIS (MOD13Q1, 250 m) guardado por parcela: época húmeda (ene-mar) y seca (jul-sep) de cada año
CREATE TABLE IF NOT EXISTS ndvi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parcela_id INT NOT NULL,
  fecha CHAR(10) NOT NULL,                 -- AAAA-MM-DD del compuesto de 16 días
  valor DECIMAL(5,4) NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY una_fecha (parcela_id, fecha),
  FOREIGN KEY (parcela_id) REFERENCES parcelas(id) ON DELETE CASCADE
);

-- ---------- Asistencia técnica (HU-OPT-03, HU-OPT-04) ----------
CREATE TABLE IF NOT EXISTS visitas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tecnico_id INT NOT NULL,
  parcela_id INT NULL,
  agricultor_id INT NOT NULL,
  fecha CHAR(10) NOT NULL,                 -- AAAA-MM-DD
  observaciones VARCHAR(2000) NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tecnico_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (agricultor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (parcela_id) REFERENCES parcelas(id) ON DELETE SET NULL
);

-- Observación del técnico local sobre una estrategia (semillas, microclima)
CREATE TABLE IF NOT EXISTS validaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  evaluacion_id INT NOT NULL,
  estrategia VARCHAR(10) NOT NULL,         -- actual, ajuste o cambio
  semillas VARCHAR(12) NULL,               -- disponible, limitada, no_disponible
  observacion VARCHAR(1000) NOT NULL,
  tecnico_id INT NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (tecnico_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ---------- Auditoría (HU-ADM-01) ----------
-- Quién hizo qué. El detalle nunca guarda contraseñas ni hashes.
CREATE TABLE IF NOT EXISTS auditoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_id INT NULL,
  actor VARCHAR(120) NOT NULL,             -- correo de quien actuó, o "sistema"
  accion VARCHAR(40) NOT NULL,             -- usuario.registrado, usuario.aprobado, permisos.cambiados, parcela.asignada...
  objeto VARCHAR(120) NOT NULL,
  detalle JSON NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
