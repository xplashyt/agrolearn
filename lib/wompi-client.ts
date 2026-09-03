import { wompiBaseUrl } from "@/lib/wompi-env";
import { classifyGatewayFailure } from "@/lib/payment-errors";

// NAVEGADOR. El número y el CVC de la tarjeta se cambian por un token aquí mismo:
// nunca pasan por nuestro servidor ni por nuestros logs. No mover al backend.

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCardNumber(value: string): string {
  return digitsOnly(value).slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
}

export function formatExpiry(value: string): string {
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export interface CardInput {
  number: string;
  expiry: string;
  cvc: string;
  holder: string;
}

export async function tokenizeCard(
  card: CardInput,
): Promise<{ ok: true; token: string } | { ok: false; messages: string[] }> {
  const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
  if (!publicKey) {
    return { ok: false, messages: ["La pasarela no está configurada."] };
  }

  const [month, year] = card.expiry.split("/");

  let response: Response;
  try {
    response = await fetch(`${wompiBaseUrl(publicKey)}/tokens/cards`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${publicKey}`,
      },
      body: JSON.stringify({
        number: digitsOnly(card.number),
        cvc: digitsOnly(card.cvc),
        exp_month: (month ?? "").padStart(2, "0"),
        exp_year: (year ?? "").slice(-2),
        card_holder: card.holder.trim(),
      }),
    });
  } catch {
    // El navegador nunca llegó a Wompi: sin internet, DNS, o un bloqueador de
    // contenido cortó la petición. Esto NO es un problema de la tarjeta.
    const classified = classifyGatewayFailure({ networkError: true });
    return { ok: false, messages: [`${classified.message} ${classified.hint ?? ""}`.trim()] };
  }

  // Texto primero, JSON después: antes, `response.json()` sin atrapar lanzaba
  // sin control cuando la respuesta no era JSON —típico de un bloqueo de WAF—,
  // y esa excepción rompía pagar() entero (ver CheckoutPanel.tsx) dejando a
  // quien pagaba con el botón en "Procesando" para siempre.
  const rawText = await response.text().catch(() => "");
  let payload: {
    status?: string;
    data?: { id?: string };
    error?: { type?: string; messages?: unknown };
  } | null = null;
  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.data?.id) {
    console.error("Tokenización rechazada", { httpStatus: response.status, error: payload?.error });

    // Si Wompi devolvió su formato habitual de error de validación, el
    // problema SÍ son los datos de la tarjeta. Si no —403/429/5xx, o una
    // respuesta que ni siquiera es JSON—, el problema es la pasarela o la
    // conexión, no lo que se escribió, y hay que decirlo así.
    if (payload?.error) {
      return { ok: false, messages: leafMessages(payload.error) };
    }

    const classified = classifyGatewayFailure({
      httpStatus: response.status,
      nonJsonResponse: payload === null && rawText.length > 0,
    });
    return { ok: false, messages: [`${classified.message} ${classified.hint ?? ""}`.trim()] };
  }

  return { ok: true, token: payload.data.id };
}

function leafMessages(error: unknown): string[] {
  const found: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === "string") found.push(node);
    else if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === "object") Object.values(node).forEach(walk);
  };
  walk(error);
  const unique = Array.from(new Set(found.filter((text) => text.trim().length > 1)));
  return unique.length > 0
    ? unique.slice(0, 3)
    : ["Revisa los datos de la tarjeta y vuelve a intentar."];
}
