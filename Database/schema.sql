-- Poseidon Challenge · Asesor de rotación de cultivos
-- NASA Space Apps 2026 · Field Shift: Adapting Farms with NASA Data
CREATE DATABASE IF NOT EXISTS poseidon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE poseidon;

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
  nombre VARCHAR(80) NOT NULL,
  lat DECIMAL(8,5) NOT NULL,
  lon DECIMAL(8,5) NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cada comparación de rotaciones que pide un agricultor
CREATE TABLE IF NOT EXISTS evaluaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parcela_id INT NOT NULL,
  rotacion_actual JSON NOT NULL,           -- ["papa","maiz"]
  prioridades JSON NOT NULL,               -- {"agua":5,"suelo":3,...}
  fuente_clima VARCHAR(20) NOT NULL,       -- "nasa-power" o "demo"
  resultado JSON NOT NULL,                 -- las 3 estrategias devueltas
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parcela_id) REFERENCES parcelas(id) ON DELETE CASCADE
);
