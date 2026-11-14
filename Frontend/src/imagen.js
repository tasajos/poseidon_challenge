// Reduce una foto del teléfono antes de subirla: lado mayor de 1600 px, JPEG al 82 %.
// Una foto de 4-8 MB queda en unos 300-600 KB, lo que importa con señal débil en el campo.
// Al volver a codificarla se descartan los metadatos EXIF (incluida la ubicación del teléfono);
// las coordenadas de la incidencia se guardan aparte.
const LADO = 1600, CALIDAD = 0.82;
const ACEPTADAS = ['image/jpeg', 'image/png', 'image/webp'];

async function decodificar(archivo) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(archivo, { imageOrientation: 'from-image' }); } catch { /* se intenta con <img> */ }
  }
  const url = URL.createObjectURL(archivo);
  try {
    return await new Promise((ok, mal) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => mal(new Error('no se pudo leer'));
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export async function comprimir(archivo) {
  let img;
  try {
    img = await decodificar(archivo);
  } catch {
    // Formato que el navegador no sabe abrir (p. ej. HEIC en Chrome): se envía tal cual si el servidor lo acepta.
    if (ACEPTADAS.includes(archivo.type) && archivo.size <= 8 * 1024 * 1024) return archivo;
    throw new Error(`${archivo.name}: formato no compatible. Use JPEG o PNG (en iPhone: Ajustes > Cámara > Formatos > Más compatible).`);
  }
  const k = Math.min(1, LADO / Math.max(img.width, img.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(img.width * k);
  lienzo.height = Math.round(img.height * k);
  lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height);
  img.close?.();
  const blob = await new Promise((ok) => lienzo.toBlob(ok, 'image/jpeg', CALIDAD));
  if (!blob) throw new Error(`${archivo.name}: no se pudo preparar la foto`);
  return blob;
}
