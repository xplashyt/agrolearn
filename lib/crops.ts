export interface Crop {
  name: string;
  space: string;
  harvest: string;
  climate: string;
}

// Días a cosecha aproximados a nivel del mar y en clima frío colombiano;
// en el curso se ajustan por piso térmico.
export const CROPS: Crop[] = [
  { name: "Rábano", space: "Matera de 15 cm", harvest: "25 días", climate: "Frío y templado" },
  { name: "Cilantro", space: "Matera de 20 cm", harvest: "35 días", climate: "Todo clima" },
  { name: "Lechuga crespa", space: "Cajón de 30 cm", harvest: "45 días", climate: "Frío y templado" },
  { name: "Acelga", space: "Cajón de 30 cm", harvest: "50 días", climate: "Todo clima" },
  { name: "Cebolla larga", space: "Matera de 25 cm", harvest: "70 días", climate: "Frío y templado" },
  { name: "Fríjol arbustivo", space: "0,5 m²", harvest: "75 días", climate: "Templado y cálido" },
  { name: "Tomate cherry", space: "Matera de 40 cm", harvest: "90 días", climate: "Templado y cálido" },
  { name: "Zanahoria", space: "Cajón de 35 cm", harvest: "100 días", climate: "Frío" },
];
