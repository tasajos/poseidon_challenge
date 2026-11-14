-- Poseidon Challenge · Asesor de rotación de cultivos
-- Esquema SQLite (almacenamiento local persistente sin requerir MySQL/XAMPP/MariaDB)

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'cliente',
  activo INTEGER NOT NULL DEFAULT 1,
  creado_en TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cultivos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  familia TEXT NOT NULL,
  ciclo_dias INTEGER NOT NULL,
  mes_siembra INTEGER NOT NULL,
  kc REAL NOT NULL,
  tolerancia_helada INTEGER NOT NULL,
  fija_nitrogeno INTEGER NOT NULL DEFAULT 0,
  raiz_profunda INTEGER NOT NULL DEFAULT 0,
  forraje INTEGER NOT NULL DEFAULT 0,
  valor_mercado INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS parcelas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evaluaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parcela_id INTEGER NOT NULL,
  rotacion_actual TEXT NOT NULL,
  prioridades TEXT NOT NULL,
  fuente_clima TEXT NOT NULL,
  resultado TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  nota_tecnico TEXT NULL,
  revisado_por INTEGER NULL,
  revisado_en TEXT NULL,
  creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parcela_id) REFERENCES parcelas(id) ON DELETE CASCADE,
  FOREIGN KEY (revisado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);
