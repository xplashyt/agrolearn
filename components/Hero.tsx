import { formatCOP, PLANS } from "@/lib/plans";
import { SproutIcon } from "@/components/SproutIcon";

const cheapest = PLANS.reduce((min, plan) => (plan.priceCOP < min.priceCOP ? plan : min), PLANS[0]);

export function Hero() {
  return (
    <section className="border-b border-tinta">
      <div className="mx-auto grid max-w-surco gap-10 px-5 py-12 md:grid-cols-12 md:gap-8 md:px-8 md:py-16">
        <div className="md:col-span-7">
          <p className="dato text-sello">Sembrar en el patio · Sin invernadero</p>

          <h1 className="mt-4 text-[3.25rem] sm:text-7xl md:text-[5.5rem]">
            Cultiva tu comida
            <br />
            en el patio
            <br />
            <span className="text-sello">de tu casa</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-tinta/90">
            Cursos en video para armar una huerta en materas, cajones o dos metros de
            tierra. Con lo que ya tienes en la cocina y semillas de tienda de barrio.
          </p>

          <dl className="mt-8 grid max-w-xl grid-cols-3 gap-x-4 border-t border-surco pt-6 sm:gap-x-6">
            <div>
              <dt className="dato text-humo">Desde</dt>
              <dd className="mt-1 font-display text-2xl leading-none sm:text-3xl">
                {formatCOP(cheapest.priceCOP)}
              </dd>
            </div>
            <div>
              <dt className="dato text-humo">Pago</dt>
              <dd className="mt-1 font-display text-2xl leading-none sm:text-3xl">Único</dd>
            </div>
            <div>
              <dt className="dato text-humo">Acceso</dt>
              <dd className="mt-1 font-display text-2xl leading-none sm:text-3xl">De por vida</dd>
            </div>
          </dl>

          <a
            href="#cursos"
            className="mt-9 inline-block border-2 border-tinta bg-maiz px-7 py-3.5 font-display text-2xl leading-none text-tinta transition-transform hover:-translate-y-0.5"
          >
            Elegir un curso
          </a>
        </div>

        {/* Sobre de semillas: es la pieza que se repite después en cada curso. */}
        <div className="md:col-span-5 md:pl-6">
          <div className="anim-sobre mx-auto max-w-sm md:mt-2">
            <div className="rasgado h-4 bg-tinta" />
            <div className="border-x-2 border-b-2 border-tinta bg-tinta px-6 pb-7 pt-5 text-costal">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="dato text-maiz">Sobre de semillas</p>
                  <p className="mt-1 font-display text-4xl leading-none">Huerta de patio</p>
                </div>
                <SproutIcon className="h-9 w-9 shrink-0 text-maiz" />
              </div>

              <div className="costura mt-5 text-costal/40" />

              <ul className="mt-5 space-y-2.5 font-mono text-[0.8125rem] leading-snug">
                <li className="flex justify-between gap-4">
                  <span className="text-costal/70">Espacio mínimo</span>
                  <span>2 m² o 6 materas</span>
                </li>
                <li className="flex justify-between gap-4">
                  <span className="text-costal/70">Primera cosecha</span>
                  <span>25 días</span>
                </li>
                <li className="flex justify-between gap-4">
                  <span className="text-costal/70">Clima</span>
                  <span>Frío, templado, cálido</span>
                </li>
                <li className="flex justify-between gap-4">
                  <span className="text-costal/70">Riego</span>
                  <span>Manguera o regadera</span>
                </li>
              </ul>

              <div className="costura mt-5 text-costal/40" />

              <div className="mt-5 flex items-end justify-between gap-4">
                <p className="dato max-w-[9rem] text-costal/70">
                  Lote {new Date().getFullYear()} · {PLANS.length} niveles
                </p>
                <div className="anim-sello border-2 border-maiz px-3 py-1.5 text-center text-maiz">
                  <p className="dato leading-none">Desde</p>
                  <p className="font-display text-3xl leading-none">
                    {cheapest.priceCOP.toLocaleString("es-CO")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
