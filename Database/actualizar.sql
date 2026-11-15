-- Poseidon · Actualiza una base EXISTENTE al esquema del commit update_4.
-- No borra datos y se puede ejecutar más de una vez.
--
-- Uso (en este orden):
--   mysql -u root -p < Database/schema.sql      -- crea las tablas que falten
--   mysql -u root -p < Database/actualizar.sql  -- agrega el rol y las columnas nuevas a las tablas que ya existían
--   cd Backend && npm run seed                   -- catálogo, usuarios de demostración y permisos por defecto
--
-- Alternativa sin scripts: el backend aplica estos mismos cambios al arrancar (y también `npm run seed`).
-- Una base nueva no necesita este archivo: basta con schema.sql.
--
-- Si su base no se llama "poseidon", cambie la línea siguiente.
USE poseidon;

-- ---------------------------------------------------------------------------
-- 1. Rol "comprador" (cooperativa o mercado local) · desde el commit upda_3
-- ---------------------------------------------------------------------------
ALTER TABLE usuarios
  MODIFY rol ENUM('administrador','operativo','cliente','monitoreo','comprador') NOT NULL DEFAULT 'cliente';
ALTER TABLE rol_permisos
  MODIFY rol ENUM('administrador','operativo','cliente','monitoreo','comprador') NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Columnas nuevas en tablas existentes · commit update_4
-- ---------------------------------------------------------------------------
-- MySQL 8 no tiene ADD COLUMN IF NOT EXISTS: este procedimiento agrega la columna solo si falta.
DROP PROCEDURE IF EXISTS poseidon_columna;
DELIMITER //
CREATE PROCEDURE poseidon_columna(IN p_tabla VARCHAR(64), IN p_columna VARCHAR(64), IN p_definicion VARCHAR(200))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = BINARY p_tabla AND BINARY COLUMN_NAME = BINARY p_columna
  ) THEN
    SET @sentencia = CONCAT('ALTER TABLE `', p_tabla, '` ADD COLUMN `', p_columna, '` ', p_definicion);
    PREPARE s FROM @sentencia;
    EXECUTE s;
    DEALLOCATE PREPARE s;
  END IF;
END //
DELIMITER ;

-- usuarios: registro con aprobación (HU-ADM-01)
CALL poseidon_columna('usuarios', 'telefono',     'VARCHAR(20) NULL');
CALL poseidon_columna('usuarios', 'pendiente',    'BOOLEAN NOT NULL DEFAULT FALSE');  -- cuenta con privilegios que espera aprobación
CALL poseidon_columna('usuarios', 'creado_por',   'INT NULL');
CALL poseidon_columna('usuarios', 'aprobado_por', 'INT NULL');
CALL poseidon_columna('usuarios', 'aprobado_en',  'TIMESTAMP NULL');

-- parcelas: datos declarados por el agricultor (HU-USR-01), técnico asignado (HU-OPT-01),
-- terreno SRTM (HU-USR-05) y fecha del último NDVI guardado (HU-USR-02)
CALL poseidon_columna('parcelas', 'superficie_ha',  'DECIMAL(9,2) NULL');
CALL poseidon_columna('parcelas', 'cultivo_actual', 'VARCHAR(30) NULL');
CALL poseidon_columna('parcelas', 'etapa',          'VARCHAR(20) NULL');   -- preparacion, siembra, crecimiento, floracion, cosecha, descanso
CALL poseidon_columna('parcelas', 'riego',          'VARCHAR(20) NULL');   -- permanente, temporal, sin_riego
CALL poseidon_columna('parcelas', 'perimetro',      'JSON NULL');          -- [[lat, lon], ...]
CALL poseidon_columna('parcelas', 'tecnico_id',     'INT NULL');
CALL poseidon_columna('parcelas', 'elevacion_m',    'DECIMAL(7,1) NULL');
CALL poseidon_columna('parcelas', 'pendiente_pct',  'DECIMAL(5,1) NULL');
CALL poseidon_columna('parcelas', 'terreno_en',     'TIMESTAMP NULL');
CALL poseidon_columna('parcelas', 'ndvi_en',        'TIMESTAMP NULL');

-- evaluaciones: estrategia que el agricultor decidió aplicar (HU-MON-03)
CALL poseidon_columna('evaluaciones', 'adoptada',    'VARCHAR(10) NULL');  -- actual, ajuste o cambio
CALL poseidon_columna('evaluaciones', 'adoptada_en', 'TIMESTAMP NULL');

DROP PROCEDURE poseidon_columna;

-- ---------------------------------------------------------------------------
-- 3. Tablas nuevas: las crea schema.sql (CREATE TABLE IF NOT EXISTS)
-- ---------------------------------------------------------------------------
--   update_1: rol_permisos, preferencias_alertas, suscripciones_push, alertas_enviadas
--   upda_3:   permisos_sembrados, ofertas, solicitudes, incidencias, incidencia_fotos
--   update_4: ciclos, ndvi, visitas, validaciones, auditoria
--
-- ---------------------------------------------------------------------------
-- 4. Permisos por rol: los carga el backend, no este script
-- ---------------------------------------------------------------------------
-- Al arrancar (o con `npm run seed`) el backend:
--   - otorga por defecto los permisos nuevos: ofertar (cliente), comprar (comprador), incidencias y
--     asistencia (operativo), asignar (administrador);
--   - retira UNA SOLA VEZ el permiso ver_todas a los roles operativo y monitoreo (HU-OPT-01, HU-MON-01).
--     El administrador puede volver a otorgarlo desde su panel.
-- La tabla permisos_sembrados registra qué ya se aplicó, para no repetirlo ni pisar cambios del administrador.

-- Comprobación: debe listar las 18 tablas
SELECT COUNT(*) AS tablas_poseidon FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (
  'usuarios','cultivos','parcelas','evaluaciones','rol_permisos','preferencias_alertas','suscripciones_push','alertas_enviadas',
  'permisos_sembrados','ofertas','solicitudes','incidencias','incidencia_fotos','ciclos','ndvi','visitas','validaciones','auditoria');
