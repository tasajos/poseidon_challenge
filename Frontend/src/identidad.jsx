// Identidad visual de Poseidón (diseño de la rama frontend3): emblema e iconos del menú lateral.

// Emblema: tridente, hojas y agua. variante "color" para fondos claros (ingreso), "claro" para la barra verde.
export function EmblemaPoseidon({ className = 'emblema-poseidon', variante = 'color' }) {
  const tinta = variante === 'claro' ? 'currentColor' : '#0b3b2d';
  const aro = variante === 'claro' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.22)';
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="54" fill={aro} />
      <path d="M20 88 A52 52 0 1 1 103 86" fill="none" stroke={tinta} strokeWidth="5.5" strokeLinecap="round" />
      <path d="M60 12 L54 24 L58 23 L58 76 L62 76 L62 23 L66 24 Z" fill={tinta} />
      <path d="M41 20 L37 32 L41 30 L41 44 Q41 54 58 56 L58 50 Q46 49 46 42 L46 29 L49 30 Z" fill={tinta} />
      <path d="M79 20 L83 32 L79 30 L79 44 Q79 54 62 56 L62 50 Q74 49 74 42 L74 29 L71 30 Z" fill={tinta} />
      <rect x="55" y="60" width="10" height="4" rx="2" fill={tinta} />
      <path d="M16 64 C28 54, 48 58, 57 82 C38 84, 22 76, 16 64 Z" fill="#68b045" />
      <path d="M22 67 C34 65, 45 71, 55 82" fill="none" stroke="#e8f5e1" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M104 64 C92 54, 72 58, 63 82 C82 84, 98 76, 104 64 Z" fill={variante === 'claro' ? '#3a8a3e' : '#245c2a'} />
      <path d="M98 67 C86 65, 75 71, 65 82" fill="none" stroke="#7bc658" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M18 89 Q38 78 60 88 T102 86 Q86 101 60 95 T18 89 Z" fill={variante === 'claro' ? '#1b768f' : '#0e5263'} />
      <path d="M25 97 Q45 87 64 96 T104 93 Q84 109 56 104 T25 97 Z" fill={variante === 'claro' ? '#38a1c7' : '#2980a8'} />
    </svg>
  );
}

// Iconos de 24x24 en currentColor. Los de casa, ubicación, brote, barras, engranaje, llave, campana, personas
// y salir son los de frontend3; canasta, etiqueta, insecto y libro siguen el mismo trazo para las secciones nuevas.
const ICONOS = {
  inicio: <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1v-9.5z" fill="currentColor" />,
  ubicacion: <path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" fill="currentColor" />,
  brote: (
    <>
      <path d="M12 21V11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 16c-5 0-8.5-3.5-8.5-8.5 5 0 8.5 3.5 8.5 8.5z" fill="currentColor" />
      <path d="M12 13c4.5 0 7.5-3 7.5-7.5-4.5 0-7.5 3-7.5 7.5z" fill="currentColor" />
    </>
  ),
  barras: (
    <>
      <rect x="4" y="12" width="3.5" height="8" rx="1" fill="currentColor" />
      <rect x="10.2" y="7" width="3.5" height="13" rx="1" fill="currentColor" />
      <rect x="16.5" y="3" width="3.5" height="17" rx="1" fill="currentColor" />
    </>
  ),
  engranaje: <path d="M10.6 2h2.8l.5 2.2a7.8 7.8 0 0 1 2 .8l2-1.1 2 2-1.1 2c.4.6.7 1.3.8 2l2.2.5v2.8l-2.2.5a7.8 7.8 0 0 1-.8 2l1.1 2-2 2-2-1.1a7.8 7.8 0 0 1-2 .8l-.5 2.2h-2.8l-.5-2.2a7.8 7.8 0 0 1-2-.8l-2 1.1-2-2 1.1-2a7.8 7.8 0 0 1-.8-2L2.2 13.4v-2.8l2.2-.5c.1-.7.4-1.4.8-2l-1.1-2 2-2 2 1.1c.6-.4 1.3-.7 2-.8L10.6 2zm1.4 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" fill="currentColor" />,
  llave: <path d="M17.2 3.8a4.8 4.8 0 0 0-4.4 6.6l-7.6 7.6a1.9 1.9 0 1 0 2.7 2.7l7.6-7.6a4.8 4.8 0 0 0 6.6-4.4c0-.5-.1-.9-.2-1.3l-2.8 2.8-2.4-.6-.6-2.4 2.8-2.8c-.4-.1-.8-.2-1.3-.2z" fill="currentColor" />,
  campana: <path d="M12 3a6 6 0 0 0-6 6v4.2L4.3 15a1 1 0 0 0 .7 1.7h14a1 1 0 0 0 .7-1.7L18 13.2V9a6 6 0 0 0-6-6zm0 18a2.5 2.5 0 0 0 2.4-2H9.6A2.5 2.5 0 0 0 12 21z" fill="currentColor" />,
  personas: (
    <>
      <circle cx="9" cy="8" r="4" fill="currentColor" />
      <path d="M2 20c0-3.9 3.1-7 7-7s7 3.1 7 7H2z" fill="currentColor" />
      <circle cx="17.5" cy="9.5" r="2.8" fill="currentColor" />
      <path d="M16 20c0-2.5-.8-4.6-2.2-6 1-.5 2.2-.8 3.5-.8 3 0 5.5 2.5 5.5 5.5V20H16z" fill="currentColor" />
    </>
  ),
  canasta: (
    <>
      <path d="M3 9h18l-1.8 10.2a2 2 0 0 1-2 1.8H6.8a2 2 0 0 1-2-1.8L3 9z" fill="currentColor" />
      <path d="M8 9l3-6M16 9l-3-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  etiqueta: <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h6.4c.4 0 .8.2 1.1.4l8.6 8.6a1.5 1.5 0 0 1 0 2.1l-6.4 6.4a1.5 1.5 0 0 1-2.1 0L3.4 12a1.5 1.5 0 0 1-.4-1.1V4.5zM8 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" fill="currentColor" />,
  insecto: (
    <>
      <ellipse cx="12" cy="14" rx="5" ry="6.5" fill="currentColor" />
      <circle cx="12" cy="6" r="2.6" fill="currentColor" />
      <path d="M7.5 11H3.5M7.2 15H3M7.8 18.5l-3 2M16.5 11h4M16.8 15H21M16.2 18.5l3 2M10.5 4L8.5 2M13.5 4l2-2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  libro: (
    <>
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H11v17H5.5A1.5 1.5 0 0 1 4 18.5v-14z" fill="currentColor" />
      <path d="M13 3h5.5A1.5 1.5 0 0 1 20 4.5v14a1.5 1.5 0 0 1-1.5 1.5H13V3z" fill="currentColor" opacity=".7" />
    </>
  ),
  satelite: (
    <>
      <rect x="9" y="9" width="6" height="6" rx="1" transform="rotate(45 12 12)" fill="currentColor" />
      <path d="M3.5 7.5l3-3 4 4-3 3zM16.5 20.5l3-3-4-4-3 3z" fill="currentColor" opacity=".75" />
      <path d="M15.5 4.5a4 4 0 0 1 4 4M15.5 1.8a6.7 6.7 0 0 1 6.7 6.7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  salir: (
    <>
      <path d="M14 7l-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="9" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  persona: (
    <>
      <circle cx="12" cy="8" r="4" fill="currentColor" />
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8H4z" fill="currentColor" />
    </>
  ),
  bajar: <path d="M5 7.5L10 12.5L15 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
};

export function Icono({ nombre, className }) {
  const caja = nombre === 'bajar' ? '0 0 20 20' : '0 0 24 24';
  return <svg className={className} viewBox={caja} aria-hidden="true">{ICONOS[nombre] || ICONOS.inicio}</svg>;
}

// Cómo se nombra cada rol en la interfaz (etiqueta del perfil).
export const ETIQUETA_ROL = {
  cliente: 'Cliente / Agricultor',
  administrador: 'Administrador de Sistema',
  operativo: 'Operativo / Técnico',
  monitoreo: 'Monitoreo / Supervisor',
  comprador: 'Comprador / Cooperativa',
};
