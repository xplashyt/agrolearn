"use client";

import { useState } from "react";
import { CheckoutPanel } from "@/components/CheckoutPanel";
import { CropTable } from "@/components/CropTable";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { PlanCard } from "@/components/PlanCard";
import { TrustBar } from "@/components/TrustBar";
import { PLANS, type Plan } from "@/lib/plans";

const PASOS = [
  {
    titulo: "Pagas aquí mismo",
    texto:
      "Con tarjeta o Nequi, en esta misma página. No te mandamos a otro sitio ni te abrimos ventanas.",
  },
  {
    titulo: "Te llega el enlace",
    texto:
      "Un correo con tu acceso personal al curso. Sin contraseñas de otras cuentas, sin apps que instalar.",
  },
  {
    titulo: "Siembras esta semana",
    texto:
      "El primer módulo es la lista de materiales y la primera siembra. Vas a tu ritmo, el acceso no caduca.",
  },
];

const PREGUNTAS = [
  {
    p: "¿Necesito un patio grande?",
    r: "No. El curso base funciona con seis materas en un balcón. Con dos metros cuadrados de tierra ya puedes hacer todo lo del curso completo.",
  },
  {
    p: "¿Sirve donde yo vivo?",
    r: "Los tres cursos traen las tablas de siembra para clima frío, templado y cálido. En Huerta todo el año hay además calendario mes a mes por piso térmico.",
  },
  {
    p: "¿Por cuánto tiempo tengo el acceso?",
    r: "Es un pago único y el acceso no caduca. Puedes ver los módulos cuantas veces quieras y descargar las plantillas.",
  },
  {
    p: "¿Incluye semillas o materiales?",
    r: "No. Vendemos el curso, no insumos. Te decimos qué comprar, cuánto cuesta más o menos y qué puedes reemplazar con cosas de la casa.",
  },
  {
    p: "¿Puedo pagar con Nequi?",
    r: "Sí. Eliges Nequi, escribes tu celular y apruebas el cobro en la app. También aceptamos tarjeta débito y crédito, con cuotas.",
  },
  {
    p: "¿Y si no me llega el correo?",
    r: "Revisa correo no deseado y escríbenos a hola@agrolearn.co con tu referencia de pago. Reenviamos el acceso el mismo día.",
  },
];

export default function Page() {
  const [seleccionado, setSeleccionado] = useState<Plan | null>(null);

  return (
    <>
      <Header />
      <main>
        <Hero />
        <TrustBar />

        <section id="cursos" className="border-b border-tinta px-5 py-14 md:px-8 md:py-20">
          <div className="mx-auto max-w-surco">
            <Titulo
              etiqueta="Tres sobres, tres tamaños"
              titulo="Elige cuánta huerta quieres"
              nota="Mientras más grande el sobre, más cultivos y más semana cubierta. Todos son pago único."
            />
            <div className="mt-10 grid items-start gap-8 md:grid-cols-3 md:gap-6">
              {PLANS.map((plan, indice) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  index={indice}
                  onSelect={setSeleccionado}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-tinta px-5 py-14 md:px-8 md:py-20">
          <div className="mx-auto grid max-w-surco gap-10 md:grid-cols-12">
            <div className="md:col-span-4">
              <Titulo
                etiqueta="Lo que sale de ahí"
                titulo="Qué vas a cosechar"
                nota="Empiezas por lo rápido: en menos de un mes ya hay algo para la cocina."
              />
            </div>
            {/* min-w-0: sin esto el ancho mínimo de la tabla estira la columna del grid
                y aparece scroll horizontal en toda la página. */}
            <div className="min-w-0 md:col-span-8">
              <CropTable />
            </div>
          </div>
        </section>

        <section className="border-b border-tinta bg-tinta px-5 py-14 text-costal md:px-8 md:py-20">
          <div className="mx-auto max-w-surco">
            <p className="dato text-maiz">Cómo llega el curso</p>
            <h2 className="mt-4 max-w-2xl text-4xl md:text-6xl">Tres pasos y ya estás sembrando</h2>

            <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {PASOS.map((paso, indice) => (
                <li key={paso.titulo} className="border-t-2 border-maiz pt-5">
                  <p className="font-mono text-[0.8125rem] text-maiz">
                    Paso {indice + 1} de {PASOS.length}
                  </p>
                  <h3 className="mt-2 text-3xl">{paso.titulo}</h3>
                  <p className="mt-3 text-[0.9375rem] leading-relaxed text-costal/80">
                    {paso.texto}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="px-5 py-14 md:px-8 md:py-20">
          <div className="mx-auto grid max-w-surco gap-10 md:grid-cols-12">
            <div className="md:col-span-4">
              <Titulo etiqueta="Preguntas" titulo="Lo que más nos preguntan" />
            </div>
            <dl className="border-t border-tinta md:col-span-8">
              {PREGUNTAS.map((item) => (
                <div key={item.p} className="border-b border-surco py-5">
                  <dt className="font-display text-2xl leading-tight">{item.p}</dt>
                  <dd className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-humo">
                    {item.r}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>
      <Footer />

      {seleccionado ? (
        <CheckoutPanel plan={seleccionado} onClose={() => setSeleccionado(null)} />
      ) : null}
    </>
  );
}

function Titulo({
  etiqueta,
  titulo,
  nota,
}: {
  etiqueta: string;
  titulo: string;
  nota?: string;
}) {
  return (
    <div>
      <p className="dato text-sello">{etiqueta}</p>
      <h2 className="mt-3 max-w-2xl text-4xl md:text-5xl">{titulo}</h2>
      {nota ? (
        <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-humo">{nota}</p>
      ) : null}
    </div>
  );
}
