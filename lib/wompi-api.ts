import { wompiBaseUrl, publicKeyOrThrow } from "@/lib/wompi-env";
import { classifyGatewayFailure, type PaymentErrorCode } from "@/lib/payment-errors";

// SERVIDOR. Nada de este archivo puede importarse desde un componente cliente:
// usa la llave privada.

// Error de una falla de la PASARELA (red caída, bloqueo por seguridad, rate
// limiting, etc.), ya clasificada. A diferencia de un Error genérico, trae el
// `code` para que la ruta de API elija el status HTTP correcto (ver
// app/api/wompi/pay/route.ts). Se usa para fallas que impiden siquiera crear
// la transacción; un rechazo de VALIDACIÓN de Wompi sigue devolviéndose como
// { ok: false, messages } (ver createTransaction).
export class PaymentGatewayError extends Error {
  readonly code: PaymentErrorCode;

  constructor(code: PaymentErrorCode, message: string) {
    super(message);
    this.name = "PaymentGatewayError";
    this.code = code;
  }
}

export interface AcceptanceTokens {
  acceptanceToken: string;
  personalDataToken: string;
  termsPermalink: string;
  personalDataPermalink: string;
}

interface AcceptanceLeaf {
  acceptance_token: string;
  permalink: string;
}

function privateKeyOrThrow(): string {
  const key = process.env.WOMPI_PRIVATE_KEY;
  if (!key) throw new Error("Falta WOMPI_PRIVATE_KEY en el entorno del servidor.");
  return key;
}

// Los tokens de aceptación caducan a la hora, así que se piden justo antes de cobrar.
export async function getAcceptanceTokens(): Promise<AcceptanceTokens> {
  const publicKey = publicKeyOrThrow();

  let response: Response;
  try {
    response = await fetch(`${wompiBaseUrl(publicKey)}/merchants/${publicKey}`, {
      cache: "no-store",
    });
  } catch (error) {
    console.error("No se pudo conectar para pedir los tokens de aceptación:", error);
    const classified = classifyGatewayFailure({ networkError: true });
    throw new PaymentGatewayError(classified.code, classified.message);
  }

  // Texto primero, JSON después: si lo que volvió no es JSON (por ejemplo una
  // página de bloqueo de un WAF delante de la API de Wompi), `.json()`
  // lanzaría antes de poder distinguir esa causa de un simple 5xx.
  const rawText = await response.text().catch(() => "");
  let payload: {
    data?: {
      presigned_acceptance?: AcceptanceLeaf;
      presigned_personal_data_auth?: AcceptanceLeaf;
    };
  } | null = null;
  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    console.error("Wompi /merchants respondió con error:", {
      httpStatus: response.status,
      rawBody: payload ? undefined : rawText.slice(0, 300),
    });
    const classified = classifyGatewayFailure({
      httpStatus: response.status,
      nonJsonResponse: payload === null && rawText.length > 0,
    });
    throw new PaymentGatewayError(classified.code, classified.message);
  }

  const terms = payload?.data?.presigned_acceptance;
  const personal = payload?.data?.presigned_personal_data_auth;

  if (!terms || !personal) {
    console.error("Wompi /merchants respondió sin tokens de aceptación", payload);
    throw new PaymentGatewayError(
      "UNKNOWN",
      "La pasarela de pagos no está configurada correctamente. Escríbenos para completar tu compra.",
    );
  }

  return {
    acceptanceToken: terms.acceptance_token,
    personalDataToken: personal.acceptance_token,
    termsPermalink: terms.permalink,
    personalDataPermalink: personal.permalink,
  };
}

export type PaymentMethodPayload =
  | { type: "CARD"; token: string; installments: number }
  | { type: "NEQUI"; phone_number: string };

export interface CreateTransactionInput {
  reference: string;
  amountInCents: number;
  currency: string;
  customerEmail: string;
  fullName: string;
  phone?: string;
  paymentMethod: PaymentMethodPayload;
  signature: string;
  acceptance: AcceptanceTokens;
}

export interface WompiTransaction {
  id: string;
  status: string;
  reference: string;
  amount_in_cents: number;
  payment_method_type: string | null;
  status_message?: string | null;
}

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<{ ok: true; transaction: WompiTransaction } | { ok: false; messages: string[] }> {
  const publicKey = publicKeyOrThrow();

  let response: Response;
  try {
    response = await fetch(`${wompiBaseUrl(publicKey)}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${privateKeyOrThrow()}`,
      },
      cache: "no-store",
      body: JSON.stringify({
        amount_in_cents: input.amountInCents,
        currency: input.currency,
        customer_email: input.customerEmail,
        reference: input.reference,
        signature: input.signature,
        acceptance_token: input.acceptance.acceptanceToken,
        accept_personal_auth: input.acceptance.personalDataToken,
        payment_method: input.paymentMethod,
        customer_data: {
          full_name: input.fullName,
          ...(input.phone ? { phone_number: input.phone } : {}),
        },
      }),
    });
  } catch (error) {
    // El fetch nunca llegó a Wompi: DNS, timeout, sin salida a internet desde
    // el servidor... Nada de esto tiene un status HTTP que clasificar.
    console.error("No se pudo conectar para crear la transacción:", {
      reference: input.reference,
      message: error instanceof Error ? error.message : String(error),
    });
    const classified = classifyGatewayFailure({ networkError: true });
    throw new PaymentGatewayError(classified.code, classified.message);
  }

  // Texto primero, JSON después: antes, `response.json()` sin atrapar lanzaba
  // sin control cuando la respuesta no era JSON —típico de un bloqueo de
  // WAF/firewall delante de la API de Wompi (IP marcada como sospechosa, por
  // ejemplo)—, y esa excepción se escapaba sin clasificar hasta el catch
  // genérico de la ruta.
  const rawText = await response.text().catch(() => "");
  let payload: {
    data?: WompiTransaction;
    error?: { type?: string; reason?: unknown; messages?: unknown };
    messages?: unknown;
  } | null = null;
  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.data) {
    console.error("Wompi rechazó la transacción", {
      httpStatus: response.status,
      payload,
      rawBody: payload ? undefined : rawText.slice(0, 300),
      reference: input.reference,
    });

    // Si Wompi respondió con SU formato habitual de error (validación de
    // campos), esos mensajes sí describen algo corregible. Si no —403/429/5xx,
    // o ni siquiera vino JSON—, el problema es la pasarela o la conexión, y
    // así se lo decimos en vez de un mensaje genérico que no distingue nada.
    const hasStructuredError = Boolean(payload && (payload.error || payload.messages));
    if (hasStructuredError) {
      return { ok: false, messages: collectMessages(payload) };
    }

    const classified = classifyGatewayFailure({
      httpStatus: response.status,
      wompiErrorType: payload?.error?.type ?? null,
      nonJsonResponse: payload === null && rawText.length > 0,
    });
    throw new PaymentGatewayError(classified.code, classified.message);
  }

  return { ok: true, transaction: payload.data };
}

export async function getTransaction(id: string): Promise<WompiTransaction | null> {
  const publicKey = publicKeyOrThrow();
  const response = await fetch(`${wompiBaseUrl(publicKey)}/transactions/${id}`, {
    headers: { Authorization: `Bearer ${privateKeyOrThrow()}` },
    cache: "no-store",
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as { data?: WompiTransaction };
  return payload.data ?? null;
}

// Los errores de validación de Wompi vienen anidados con profundidad variable
// ({ payment_method: { messages: { token: [...] } } }): solo nos sirven las hojas.
export function collectMessages(payload: unknown): string[] {
  const found: string[] = [];

  const walk = (node: unknown) => {
    if (typeof node === "string") {
      found.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === "object") {
      Object.values(node as Record<string, unknown>).forEach(walk);
    }
  };

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    walk(record.error ?? record.messages ?? record);
  }

  const unique = Array.from(new Set(found.filter((text) => text.trim().length > 1)));
  return unique.length > 0 ? unique.slice(0, 4) : ["El pago no se pudo procesar."];
}
