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
  rol ENUM('administrador','operativo','cliente','monitoreo') NOT NULL DEFAULT 'cliente',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
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
  lat DECIMAL(8,5) NOT NULL,
  lon DECIMAL(8,5) NOT NULL,
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
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parcela_id) REFERENCES parcelas(id) ON DELETE CASCADE,
  FOREIGN KEY (revisado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);
