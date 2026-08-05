import { wompiBaseUrl, publicKeyOrThrow } from "@/lib/wompi-env";

// SERVIDOR. Nada de este archivo puede importarse desde un componente cliente:
// usa la llave privada.

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
  const response = await fetch(`${wompiBaseUrl(publicKey)}/merchants/${publicKey}`, {
    cache: "no-store",
  });

  const payload = (await response.json()) as {
    data?: {
      presigned_acceptance?: AcceptanceLeaf;
      presigned_personal_data_auth?: AcceptanceLeaf;
    };
  };

  const terms = payload.data?.presigned_acceptance;
  const personal = payload.data?.presigned_personal_data_auth;

  if (!response.ok || !terms || !personal) {
    console.error("Wompi /merchants respondió sin tokens de aceptación", payload);
    throw new Error("No pudimos consultar los términos de la pasarela.");
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

  const response = await fetch(`${wompiBaseUrl(publicKey)}/transactions`, {
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

  const payload = (await response.json()) as {
    data?: WompiTransaction;
    error?: unknown;
    messages?: unknown;
  };

  if (!response.ok || !payload.data) {
    console.error("Wompi rechazó la transacción", JSON.stringify(payload));
    return { ok: false, messages: collectMessages(payload) };
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
