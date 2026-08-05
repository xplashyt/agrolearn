import { CROPS } from "@/lib/crops";

export function CropTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-left">
        <caption className="dato pb-4 text-left text-humo">
          Tiempos aproximados en clima frío; el curso trae el ajuste por piso térmico
        </caption>
        <thead>
          <tr className="border-y border-tinta">
            {["Cultivo", "Espacio", "Cosecha en", "Clima"].map((titulo) => (
              <th key={titulo} scope="col" className="dato py-3 pr-6 font-normal text-humo">
                {titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CROPS.map((crop) => (
            <tr key={crop.name} className="border-b border-surco">
              <td className="py-3 pr-6 font-display text-2xl leading-none">{crop.name}</td>
              <td className="py-3 pr-6 font-mono text-[0.8125rem]">{crop.space}</td>
              <td className="py-3 pr-6 font-mono text-[0.8125rem] text-sello">{crop.harvest}</td>
              <td className="py-3 pr-6 font-mono text-[0.8125rem]">{crop.climate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
