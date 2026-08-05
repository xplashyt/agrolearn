import { SproutIcon } from "@/components/SproutIcon";

export function Footer() {
  return (
    <footer className="bg-tintaHonda px-5 py-12 text-costal md:px-8">
      <div className="mx-auto max-w-surco">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <SproutIcon className="h-7 w-7 text-maiz" />
            <span className="font-display text-2xl leading-none">AgroLearn</span>
          </div>
          <a
            href="mailto:hola@agrolearn.co"
            className="font-mono text-[0.8125rem] underline decoration-maiz decoration-2 underline-offset-4"
          >
            hola@agrolearn.co
          </a>
        </div>

        <div className="costura mt-8 text-costal/30" />

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <p className="max-w-md text-[0.9375rem] leading-relaxed text-costal/80">
            AgroLearn vende contenido educativo en video. No vendemos semillas, tierra
            ni insumos, y no garantizamos resultados de cosecha: dependen del clima, del
            suelo y del cuidado de cada quien. El material es informativo y no sustituye
            asesoría agronómica profesional.
          </p>
          <p className="max-w-md text-[0.9375rem] leading-relaxed text-costal/80">
            Los pagos los procesa Wompi. Nunca pedimos contraseñas: el acceso al curso es
            un enlace personal que llega al correo que registras en la compra. Las marcas
            mencionadas pertenecen a sus dueños.
          </p>
        </div>

        <p className="dato mt-10 text-costal/50">
          © {new Date().getFullYear()} AgroLearn · Colombia
        </p>
      </div>
    </footer>
  );
}
