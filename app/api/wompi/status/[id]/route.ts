import { NextResponse } from "next/server";
import { getTransaction } from "@/lib/wompi-api";

export const runtime = "nodejs";

// Lo que ve el navegador es cosmético: la confirmación real llega por el webhook.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!/^[\w-]{6,64}$/.test(id)) {
    return NextResponse.json({ error: "Id inválido." }, { status: 400 });
  }

  try {
    const transaction = await getTransaction(id);
    if (!transaction) {
      return NextResponse.json({ error: "Transacción no encontrada." }, { status: 404 });
    }
    return NextResponse.json({
      id: transaction.id,
      status: transaction.status,
      statusMessage: transaction.status_message ?? null,
    });
  } catch (error) {
    console.error("Error consultando el estado", error);
    return NextResponse.json({ error: "No pudimos consultar el estado." }, { status: 502 });
  }
}
