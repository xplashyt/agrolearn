import { NextResponse } from "next/server";
import { parseReference } from "@/lib/orders";
import { sendPaidOrderEmail } from "@/lib/email";
import { verifyEventSignature, type WompiEvent } from "@/lib/wompi";

export const runtime = "nodejs";

// Wompi reintenta los eventos. Este Set evita correos duplicados dentro de la
// misma instancia; con varias instancias o tras un redeploy no garantiza nada
// (haría falta persistirlo).
const avisados = new Set<string>();

export async function POST(request: Request) {
  const secret = process.env.WOMPI_EVENTS_SECRET;
  if (!secret) {
    console.error("Falta WOMPI_EVENTS_SECRET: no se puede verificar el evento");
    return NextResponse.json({ error: "No configurado." }, { status: 500 });
  }

  let event: WompiEvent;
  try {
    event = (await request.json()) as WompiEvent;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!verifyEventSignature(event, secret)) {
    return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  }

  const transaction = event.data?.transaction;
  if (!transaction) return NextResponse.json({ error: "Evento sin transacción." }, { status: 400 });

  if (transaction.status !== "APPROVED") {
    return NextResponse.json({ ok: true, ignored: transaction.status });
  }

  if (avisados.has(transaction.id)) {
    return NextResponse.json({ ok: true, duplicated: true });
  }

  const parsed = parseReference(transaction.reference);
  if (!parsed) {
    console.error("Referencia aprobada que no reconocemos", transaction.reference);
    return NextResponse.json({ ok: true, unknownReference: true });
  }

  if (!transaction.customer_email) {
    console.error("Transacción aprobada sin customer_email", transaction.id);
    return NextResponse.json({ error: "Falta el correo del comprador." }, { status: 500 });
  }

  await sendPaidOrderEmail({
    plan: parsed.plan,
    reference: transaction.reference,
    transactionId: transaction.id,
    amountInCents: transaction.amount_in_cents,
    paymentMethod: transaction.payment_method_type ?? "desconocido",
    customerEmail: transaction.customer_email,
  });

  avisados.add(transaction.id);
  return NextResponse.json({ ok: true });
}
