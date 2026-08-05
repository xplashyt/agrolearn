import { Resend } from "resend";
import { formatCOP, type Plan } from "@/lib/plans";

export interface PaidOrder {
  plan: Plan;
  reference: string;
  transactionId: string;
  amountInCents: number;
  paymentMethod: string;
  customerEmail: string;
}

// Si falta la API key o el envío falla, dejamos explotar la excepción: el webhook
// responde 500 y Wompi reintenta el aviso.
export async function sendPaidOrderEmail(order: PaidOrder): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Falta RESEND_API_KEY: no se pudo avisar la venta.");

  const to = process.env.ORDER_NOTIFY_EMAIL;
  if (!to) throw new Error("Falta ORDER_NOTIFY_EMAIL: no hay a quién avisarle.");

  const from = process.env.ORDER_FROM_EMAIL ?? "onboarding@resend.dev";
  const resend = new Resend(apiKey);

  const rows: Array<[string, string]> = [
    ["Curso", `${order.plan.name} (${order.plan.id})`],
    ["Módulos", `${order.plan.modules} · ${order.plan.hours} de video`],
    ["Monto pagado", formatCOP(order.amountInCents / 100)],
    ["Medio de pago", order.paymentMethod],
    ["Referencia", order.reference],
    ["ID transacción", order.transactionId],
  ];

  const html = `
    <div style="font-family:Georgia,serif;color:#12351F;background:#E8DFC6;padding:24px">
      <p style="margin:0 0 4px;font:12px/1.4 monospace;letter-spacing:.12em;text-transform:uppercase">Venta pagada · AgroLearn</p>
      <p style="margin:0 0 6px;font:14px/1.4 monospace">Enviar el acceso a</p>
      <p style="margin:0 0 20px;font:700 26px/1.2 Georgia,serif;word-break:break-all">${escapeHtml(order.customerEmail)}</p>
      <table style="border-collapse:collapse;width:100%;max-width:520px;background:#F2EBDA">
        ${rows
          .map(
            ([label, value]) => `<tr>
              <td style="padding:8px 12px;border:1px solid #12351F;font:12px/1.4 monospace;text-transform:uppercase;letter-spacing:.08em;width:40%">${label}</td>
              <td style="padding:8px 12px;border:1px solid #12351F;font:14px/1.4 Georgia,serif">${escapeHtml(value)}</td>
            </tr>`,
          )
          .join("")}
      </table>
    </div>`;

  const { error } = await resend.emails.send({
    from,
    to: [to],
    replyTo: order.customerEmail,
    subject: `Pago aprobado · ${order.plan.name} · ${order.reference}`,
    html,
  });

  if (error) throw new Error(`Resend falló: ${error.message}`);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
