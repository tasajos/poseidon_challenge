// Carga en la base de datos (SQLite o MySQL) el catálogo de cultivos y los usuarios de demostración.
import 'dotenv/config';
import { getPool, cultivosDeArchivo, usuariosDemo, modo, iniciar, seedSQLite } from './db.js';
import { hashPassword } from './auth.js';

await iniciar();

if (modo() === 'sqlite') {
  await seedSQLite();
  const cultivos = await cultivosDeArchivo();
  const usuarios = await usuariosDemo();
  console.log(`Catálogo cargado en SQLite: ${cultivos.length} cultivos`);
  console.log(`Usuarios de demostración en SQLite: ${usuarios.map((u) => u.email).join(', ')}`);
} else if (modo() === 'mysql') {
  const db = getPool();
  const cultivos = await cultivosDeArchivo();
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
  console.log(`Catálogo cargado en MySQL: ${cultivos.length} cultivos`);

  const clave = process.env.DEMO_PASSWORD;
  if (!clave || clave === 'cambie-esta-clave') {
    console.warn('Defina DEMO_PASSWORD en .env para crear los usuarios de demostración.');
  } else {
    const usuarios = await usuariosDemo();
    for (const u of usuarios) {
      await db.query(
        `INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), password_hash=VALUES(password_hash), rol=VALUES(rol)`,
        [u.nombre, u.email, hashPassword(clave), u.rol],
      );
    }
    console.log(`Usuarios de demostración en MySQL: ${usuarios.map((u) => u.email).join(', ')}`);
  }
  await db.end();
} else {
  console.log('[seed] En modo memoria no es necesario sembrar; los datos se cargan en memoria.');
}
