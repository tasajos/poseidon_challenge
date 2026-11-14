// Carga Database/cultivos.json en la tabla cultivos (inserta o actualiza).
import { getPool, cultivosDeArchivo } from './db.js';

const cultivos = await cultivosDeArchivo();
const db = getPool();
for (const c of cultivos) {
  await db.query(
    `INSERT INTO cultivos (codigo, nombre, familia, ciclo_dias, mes_siembra, kc, tolerancia_helada,
       fija_nitrogeno, raiz_profunda, forraje, valor_mercado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), familia=VALUES(familia), ciclo_dias=VALUES(ciclo_dias),
       mes_siembra=VALUES(mes_siembra), kc=VALUES(kc), tolerancia_helada=VALUES(tolerancia_helada),
       fija_nitrogeno=VALUES(fija_nitrogeno), raiz_profunda=VALUES(raiz_profunda),
       forraje=VALUES(forraje), valor_mercado=VALUES(valor_mercado)`,
    [c.codigo, c.nombre, c.familia, c.ciclo_dias, c.mes_siembra, c.kc, c.tolerancia_helada,
      c.fija_nitrogeno, c.raiz_profunda, c.forraje, c.valor_mercado],
  );
}
console.log(`Catálogo cargado: ${cultivos.length} cultivos`);
await db.end();
