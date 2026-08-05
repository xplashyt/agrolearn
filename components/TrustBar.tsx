const HECHOS = [
  "Pagas con tarjeta o Nequi sin salir de esta página",
  "El acceso llega a tu correo en minutos",
  "Cada módulo dura menos de 12 minutos",
];

export function TrustBar() {
  return (
    <section className="border-b border-tinta bg-maiz">
      <ul className="mx-auto grid max-w-surco divide-y divide-tinta/25 px-5 md:grid-cols-3 md:divide-x md:divide-y-0 md:px-8">
        {HECHOS.map((hecho) => (
          <li
            key={hecho}
            className="py-4 font-mono text-[0.8125rem] leading-snug md:px-6 md:first:pl-0 md:last:pr-0"
          >
            {hecho}
          </li>
        ))}
      </ul>
    </section>
  );
}
