// SVG dibujado a mano con polígonos: dos hojas y un tallo saliendo de un surco.
// Sin librerías de iconos.
export function SproutIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
      <path d="M16 29V14" stroke="currentColor" strokeWidth="2.5" />
      <path d="M16 15 4 11l1-7 11 5z" fill="currentColor" />
      <path d="M16 17l11-5 1 6-12 4z" fill="currentColor" opacity="0.72" />
      <path d="M3 29h26" stroke="currentColor" strokeWidth="2.5" strokeDasharray="5 3" />
    </svg>
  );
}
