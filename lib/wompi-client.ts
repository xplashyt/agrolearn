import { wompiBaseUrl } from "@/lib/wompi-env";

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

  const response = await fetch(`${wompiBaseUrl(publicKey)}/tokens/cards`, {
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

  const payload = (await response.json()) as {
    status?: string;
    data?: { id?: string };
    error?: unknown;
  };

  if (!response.ok || !payload.data?.id) {
    console.error("Tokenización rechazada", JSON.stringify(payload.error ?? payload));
    return { ok: false, messages: leafMessages(payload.error) };
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
