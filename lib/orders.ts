import { findPlan, type Plan } from "@/lib/plans";

const PREFIX = "agl";

export function buildReference(planId: string): string {
  return `${PREFIX}-${planId}-${Date.now()}`;
}

export interface ParsedReference {
  planId: string;
  plan: Plan;
  createdAt: number;
}

// Se parsea desde la derecha porque el id del plan contiene guiones
// ("agl-patio-inicio-1753632000000"): el último segmento es el timestamp y
// todo lo del medio es el id.
export function parseReference(reference: string): ParsedReference | null {
  const parts = reference.split("-");
  if (parts.length < 3) return null;
  if (parts[0] !== PREFIX) return null;

  const stamp = parts[parts.length - 1];
  if (!/^\d+$/.test(stamp)) return null;

  const planId = parts.slice(1, -1).join("-");
  const plan = findPlan(planId);
  if (!plan) return null;

  return { planId, plan, createdAt: Number(stamp) };
}
