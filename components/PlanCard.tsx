"use client";

import { formatCOP, type Plan } from "@/lib/plans";
import { SproutIcon } from "@/components/SproutIcon";

interface Props {
  plan: Plan;
  // El índice decide el tamaño del sobre: más contenido, sobre más grande.
  index: number;
  onSelect: (plan: Plan) => void;
}

const TAMANOS = [
  { wrapper: "md:mt-12", pad: "px-6 pt-6 pb-7", precio: "text-6xl", titulo: "text-3xl" },
  { wrapper: "md:mt-0", pad: "px-7 pt-7 pb-9", precio: "text-7xl", titulo: "text-4xl" },
  { wrapper: "md:mt-6", pad: "px-7 pt-7 pb-8", precio: "text-[4.25rem]", titulo: "text-4xl" },
];

export function PlanCard({ plan, index, onSelect }: Props) {
  const tamano = TAMANOS[index] ?? TAMANOS[0];
  const invertido = plan.popular === true;

  return (
    <article className={`flex flex-col ${tamano.wrapper}`}>
      <div className="rasgado h-4 bg-tinta" />

      <div
        className={`flex flex-1 flex-col border-x-2 border-b-2 border-tinta ${tamano.pad} ${
          invertido ? "bg-tinta text-costal" : "bg-papel"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`dato ${invertido ? "text-maiz" : "text-sello"}`}>
              {plan.weight} de semilla
            </p>
            <h3 className={`mt-1.5 font-display ${tamano.titulo} leading-none`}>{plan.name}</h3>
          </div>
          {invertido ? <SproutIcon className="h-8 w-8 shrink-0 text-maiz" /> : null}
        </div>

        <p
          className={`mt-3 text-[0.9375rem] leading-relaxed ${
            invertido ? "text-costal/80" : "text-humo"
          }`}
        >
          {plan.summary}
        </p>

        <div className={`costura mt-6 ${invertido ? "text-costal/40" : "text-surco"}`} />

        <p className={`mt-6 font-display ${tamano.precio} leading-none`}>
          {plan.priceCOP.toLocaleString("es-CO")}
        </p>
        <p className={`dato mt-1.5 ${invertido ? "text-costal/70" : "text-humo"}`}>
          {formatCOP(plan.priceCOP)} · pago único
        </p>

        <ul className="mt-6 space-y-3 font-mono text-[0.8125rem] leading-snug">
          <li className="flex justify-between gap-4">
            <span className={invertido ? "text-costal/70" : "text-humo"}>Módulos</span>
            <span>
              {plan.modules} · {plan.hours}
            </span>
          </li>
          <li className="flex justify-between gap-4">
            <span className={invertido ? "text-costal/70" : "text-humo"}>Cultivos</span>
            <span>{plan.crops}</span>
          </li>
          <li className="flex justify-between gap-4">
            <span className={invertido ? "text-costal/70" : "text-humo"}>Espacio</span>
            <span className="text-right">{plan.space}</span>
          </li>
        </ul>

        <div className={`costura mt-6 ${invertido ? "text-costal/40" : "text-surco"}`} />

        <ul className="mt-6 flex-1 space-y-3 text-[0.9375rem] leading-snug">
          {plan.includes.map((item) => (
            <li key={item} className="flex gap-3">
              <span
                aria-hidden="true"
                className={`mt-[0.45rem] h-1.5 w-3 shrink-0 ${
                  invertido ? "bg-maiz" : "bg-sello"
                }`}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => onSelect(plan)}
          className={`mt-8 w-full border-2 py-3.5 font-display text-2xl leading-none transition-transform hover:-translate-y-0.5 ${
            invertido
              ? "border-maiz bg-maiz text-tinta"
              : "border-tinta bg-tinta text-costal hover:bg-sello hover:border-sello"
          }`}
        >
          Comprar {plan.name.toLowerCase()}
        </button>
      </div>
    </article>
  );
}
