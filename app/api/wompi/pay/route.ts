import { NextResponse } from "next/server";
import { parseReference } from "@/lib/orders";
import type { PaymentErrorCode } from "@/lib/payment-errors";
import { integritySignature } from "@/lib/wompi";
import {
  createTransaction,
  getAcceptanceTokens,
  PaymentGatewayError,
  type PaymentMethodPayload,
} from "@/lib/wompi-api";

export const runtime = "nodejs";

// Status HTTP por tipo de falla de la PASARELA (ver lib/payment-errors.ts).
// Lo que no está listado cae en 502: falla del lado de Wompi, no de quien pide.
const HTTP_STATUS_BY_CODE: Partial<Record<PaymentErrorCode, number>> = {
  ACCESS_BLOCKED: 403,
  TOO_MANY_ATTEMPTS: 429,
  INVALID_CONFIGURATION: 500,
  GATEWAY_UNAVAILABLE: 502,
  NO_CONNECTION: 502,
};

const CURRENCY = "COP";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface PayBody {
  reference?: string;
  email?: string;
  fullName?: string;
  acceptedTerms?: boolean;
  method?: "CARD" | "NEQUI";
  cardToken?: string;
  installments?: number;
  phone?: string;
}

export async function POST(request: Request) {
  let body: PayBody;
  try {
    body = (await request.json()) as PayBody;
  } catch {
    return bad("Petición inválida.");
  }

  const reference = (body.reference ?? "").trim();
  const parsed = parseReference(reference);
  if (!parsed) return bad("La referencia del pedido no es válida.");

  const email = (body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return bad("El correo no es válido.");

  const fullName = (body.fullName ?? "").trim();
  if (fullName.length < 3) return bad("Escribe tu nombre completo.");

  if (body.acceptedTerms !== true) return bad("Debes aceptar los términos para pagar.");

  let paymentMethod: PaymentMethodPayload;
  if (body.method === "CARD") {
    const token = (body.cardToken ?? "").trim();
    if (!token) return bad("Falta el token de la tarjeta.");
    const installments = Number(body.installments ?? 1);
    if (!Number.isInteger(installments) || installments < 1 || installments > 36) {
      return bad("Número de cuotas inválido.");
    }
    paymentMethod = { type: "CARD", token, installments };
  } else if (body.method === "NEQUI") {
    const phone = (body.phone ?? "").replace(/\D/g, "");
    if (!/^3\d{9}$/.test(phone)) return bad("El celular de Nequi debe tener 10 dígitos y empezar por 3.");
    paymentMethod = { type: "NEQUI", phone_number: phone };
  } else {
    return bad("Medio de pago no soportado.");
  }

  // El monto lo pone el servidor a partir del plan que dice la referencia.
  // Nunca se acepta un monto enviado por el navegador.
  const amountInCents = parsed.plan.priceCOP * 100;

  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
  if (!integritySecret) {
    console.error("Falta WOMPI_INTEGRITY_SECRET");
    return NextResponse.json({ error: "Pasarela mal configurada." }, { status: 500 });
  }

  try {
    const acceptance = await getAcceptanceTokens();
    const signature = integritySignature(reference, amountInCents, CURRENCY, integritySecret);

    const result = await createTransaction({
      reference,
      amountInCents,
      currency: CURRENCY,
      customerEmail: email,
      fullName,
      phone: body.method === "NEQUI" ? (body.phone ?? "").replace(/\D/g, "") : undefined,
      paymentMethod,
      signature,
      acceptance,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.messages.join(" ") }, { status: 422 });
    }

    return NextResponse.json({
      id: result.transaction.id,
      status: result.transaction.status,
      reference: result.transaction.reference,
      // Por si Wompi ya resolvió DECLINED/ERROR en esta misma respuesta: sin
      // esto, el motivo real del banco se perdía cuando el rechazo era
      // inmediato y no hacía falta ni empezar el sondeo de estado.
      statusMessage: result.transaction.status_message ?? null,
    });
  } catch (error) {
    if (error instanceof PaymentGatewayError) {
      // Clasificado: sabemos si fue la red, un bloqueo de la pasarela (WAF/IP),
      // rate limiting, configuración inválida, etc. Ver lib/payment-errors.ts.
      console.error("El pago no se pudo iniciar", { code: error.code, message: error.message });
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: HTTP_STATUS_BY_CODE[error.code] ?? 502 },
      );
    }

    console.error("Error creando la transacción", error);
    return NextResponse.json(
      { error: "No pudimos contactar la pasarela. Intenta de nuevo.", code: "UNKNOWN" satisfies PaymentErrorCode },
      { status: 502 },
    );
  }
}

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
