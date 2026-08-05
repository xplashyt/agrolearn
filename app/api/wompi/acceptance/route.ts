import { NextResponse } from "next/server";
import { getAcceptanceTokens } from "@/lib/wompi-api";

export const runtime = "nodejs";
// Sin esto Next intenta prerenderizar la ruta en el build, cuando todavía no hay
// llaves; y los tokens caducan, así que no tiene sentido cachearla.
export const dynamic = "force-dynamic";

// Al navegador solo le devolvemos los permalinks de los contratos: los tokens de
// aceptación se quedan en el servidor y se piden de nuevo al momento de cobrar.
export async function GET() {
  try {
    const acceptance = await getAcceptanceTokens();
    return NextResponse.json({
      termsPermalink: acceptance.termsPermalink,
      personalDataPermalink: acceptance.personalDataPermalink,
    });
  } catch (error) {
    console.error("No se pudieron leer los contratos de Wompi", error);
    return NextResponse.json({ error: "No pudimos cargar los términos." }, { status: 502 });
  }
}
