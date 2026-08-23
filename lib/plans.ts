export interface Plan {
  // El id viaja dentro de la referencia de Wompi: solo minúsculas, números y guiones.
  id: string;
  name: string;
  priceCOP: number;
  modules: number;
  hours: string;
  crops: number;
  // Peso del sobre: es el tamaño visual de la tarjeta, no un dato de inventario.
  weight: string;
  space: string;
  summary: string;
  includes: string[];
  popular?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "patio-inicio",
    name: "Primeras cosechas",
    priceCOP: 2000,
    modules: 4,
    hours: "2 h 30",
    crops: 8,
    weight: "5 g",
    space: "Materas y un balcón",
    summary:
      "Para arrancar esta semana con materas o cajones y cosechar en menos de un mes.",
    includes: [
      "8 cultivos rápidos: cilantro, lechuga, rábano, cebollín, acelga, espinaca, albahaca y perejil",
      "Cómo preparar tierra con residuos de cocina",
      "Riego: cuánta agua, a qué hora y cómo saber si te pasaste",
      "Lista de materiales con precios de referencia",
    ],
  },
  {
    id: "patio-completo",
    name: "Huerta completa",
    priceCOP: 69900,
    modules: 9,
    hours: "6 h",
    crops: 20,
    weight: "20 g",
    space: "2 m² de patio o 6 materas",
    summary:
      "El curso central: una huerta que te da algo para la cocina todas las semanas.",
    popular: true,
    includes: [
      "20 cultivos, incluidos tomate cherry, ají, fríjol, zanahoria y cebolla larga",
      "Compostaje de cocina en balde, sin olores",
      "Plan de siembra escalonada para no cosechar todo el mismo día",
      "Plagas comunes y qué preparado casero funciona para cada una",
      "Plantillas imprimibles: plano del patio y bitácora de riego",
    ],
  },
  {
    id: "patio-maestro",
    name: "Huerta todo el año",
    priceCOP: 494900,
    modules: 14,
    hours: "11 h",
    crops: 30,
    weight: "50 g",
    space: "Patio, terraza o lote pequeño",
    summary:
      "Para dejar de comprar semillas y sostener la huerta en cualquier época del año.",
    includes: [
      "30 cultivos y cómo rotarlos para que la tierra no se cargue",
      "Semilleros propios: cómo guardar y secar tu semilla",
      "Calendario de siembra para clima frío, templado y cálido",
      "Control de plagas sin químicos de síntesis",
      "Riego por goteo casero con botellas y manguera",
      "Tres sesiones grupales en vivo al mes para revisar tu huerta",
    ],
  },
];

export function findPlan(id: string): Plan | undefined {
  return PLANS.find((plan) => plan.id === id);
}

export function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}
