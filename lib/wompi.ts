import { createHash, timingSafeEqual } from "node:crypto";

// Verificar el orden exacto de la concatenación contra la documentación vigente
// de Wompi antes de pasar a producción: si cambia, la transacción se rechaza.
export function integritySignature(
  reference: string,
  amountInCents: number,
  currency: string,
  secret: string,
): string {
  return createHash("sha256")
    .update(`${reference}${amountInCents}${currency}${secret}`)
    .digest("hex");
}

export interface WompiEventTransaction {
  id: string;
  reference: string;
  status: string;
  amount_in_cents: number;
  currency: string;
  customer_email: string | null;
  payment_method_type: string | null;
  finalized_at: string | null;
}

export interface WompiEvent {
  event: string;
  data: { transaction: WompiEventTransaction };
  signature: { properties: string[]; checksum: string };
  timestamp: number;
  sent_at?: string;
}

function readPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
}

export function verifyEventSignature(event: WompiEvent, secret: string): boolean {
  const properties = event.signature?.properties;
  const checksum = event.signature?.checksum;
  if (!Array.isArray(properties) || typeof checksum !== "string") return false;

  const values = properties
    .map((property) => readPath(event.data, property))
    .map((value) => (value === undefined || value === null ? "" : String(value)))
    .join("");

  const expected = createHash("sha256")
    .update(`${values}${event.timestamp}${secret}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(checksum.toLowerCase(), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
