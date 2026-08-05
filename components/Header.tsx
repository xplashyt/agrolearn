import { SproutIcon } from "@/components/SproutIcon";

export function Header() {
  return (
    <header className="border-b border-tinta">
      <div className="mx-auto flex max-w-surco items-center justify-between gap-4 px-5 py-3 md:px-8">
        <a href="#" className="flex items-center gap-2.5 text-tinta">
          <SproutIcon className="h-7 w-7" />
          <span className="font-display text-2xl leading-none tracking-tight">AgroLearn</span>
        </a>

        <p className="dato hidden text-humo sm:block">Huerta en casa · Colombia</p>

        <a
          href="#cursos"
          className="border border-tinta bg-tinta px-4 py-2 font-display text-lg leading-none text-costal transition-colors hover:bg-sello hover:border-sello"
        >
          Ver los cursos
        </a>
      </div>
    </header>
  );
}
