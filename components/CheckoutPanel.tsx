"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildReference } from "@/lib/orders";
import { classifyDeclineReason } from "@/lib/payment-errors";
import { formatCOP, type Plan } from "@/lib/plans";
import {
  digitsOnly,
  formatCardNumber,
  formatExpiry,
  tokenizeCard,
} from "@/lib/wompi-client";

type Fase = "form" | "procesando" | "aprobado" | "rechazado" | "expirado";
type Metodo = "CARD" | "NEQUI";

interface Props {
  plan: Plan;
  onClose: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CUOTAS = [1, 3, 6, 12, 24];

export function CheckoutPanel({ plan, onClose }: Props) {
  const [fase, setFase] = useState<Fase>("form");
  const [metodo, setMetodo] = useState<Metodo>("CARD");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [correoConfirma, setCorreoConfirma] = useState("");
  const [numero, setNumero] = useState("");
  const [vence, setVence] = useState("");
  const [cvc, setCvc] = useState("");
  const [cuotas, setCuotas] = useState(1);
  const [celular, setCelular] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [contratos, setContratos] = useState<{ terminos: string; datos: string } | null>(null);
  const [tx, setTx] = useState<string | null>(null);

  const primerCampo = useRef<HTMLInputElement>(null);
  const referencia = useMemo(() => buildReference(plan.id), [plan.id]);

  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    primerCampo.current?.focus();

    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onClose();
    };
    window.addEventListener("keydown", alTeclear);

    return () => {
      document.body.style.overflow = previo;
      window.removeEventListener("keydown", alTeclear);
    };
  }, [onClose]);

  useEffect(() => {
    let vivo = true;
    fetch("/api/wompi/acceptance", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!vivo || !data) return;
        setContratos({ terminos: data.termsPermalink, datos: data.personalDataPermalink });
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);

  // El estado que ve el navegador es cosmético: la verdad la trae el webhook.
  // Si el panel se cierra, el sondeo muere con el cleanup.
  useEffect(() => {
    if (!tx) return;
    let vivo = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const limite = Date.now() + 5 * 60 * 1000;

    const consultar = async () => {
      if (!vivo) return;
      try {
        const res = await fetch(`/api/wompi/status/${tx}`, { cache: "no-store" });
        const data = (await res.json()) as { status?: string; statusMessage?: string | null };
        if (!vivo) return;

        if (data.status === "APPROVED") {
          setFase("aprobado");
          return;
        }
        if (data.status && ["DECLINED", "VOIDED", "ERROR"].includes(data.status)) {
          const clasificado = classifyDeclineReason(data.statusMessage);
          setMensaje(`${clasificado.message} ${clasificado.hint ?? ""}`.trim());
          setFase("rechazado");
          return;
        }
      } catch {
        // Un fallo de red no decide nada: se vuelve a consultar.
      }
      if (!vivo) return;
      if (Date.now() > limite) {
        setFase("expirado");
        return;
      }
      timer = setTimeout(consultar, 2500);
    };

    timer = setTimeout(consultar, 2500);
    return () => {
      vivo = false;
      if (timer) clearTimeout(timer);
    };
  }, [tx]);

  const correosOk =
    EMAIL_RE.test(correo.trim()) &&
    correo.trim().toLowerCase() === correoConfirma.trim().toLowerCase();

  const tarjetaOk =
    digitsOnly(numero).length >= 13 &&
    /^(0[1-9]|1[0-2])\/\d{2}$/.test(vence) &&
    digitsOnly(cvc).length >= 3;

  const nequiOk = /^3\d{9}$/.test(digitsOnly(celular));

  const puedePagar =
    nombre.trim().length >= 3 &&
    correosOk &&
    acepta &&
    (metodo === "CARD" ? tarjetaOk : nequiOk);

  async function pagar() {
    setError(null);
    setFase("procesando");

    // Todo el intento de pago va en UN solo try/catch: antes, tokenizeCard()
    // se llamaba afuera, y si lanzaba (red caída, respuesta bloqueada por un
    // WAF...) la excepción quedaba sin atrapar y el panel se quedaba
    // congelado en "Procesando el pago" para siempre, sin error ni forma de
    // reintentar.
    try {
      let cardToken: string | undefined;
      if (metodo === "CARD") {
        const tokenizado = await tokenizeCard({
          number: numero,
          expiry: vence,
          cvc,
          holder: nombre,
        });
        if (!tokenizado.ok) {
          setError(tokenizado.messages.join(" "));
          setFase("form");
          return;
        }
        cardToken = tokenizado.token;
      }

      const res = await fetch("/api/wompi/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: referencia,
          email: correo.trim(),
          fullName: nombre.trim(),
          acceptedTerms: acepta,
          method: metodo,
          cardToken,
          installments: cuotas,
          phone: digitsOnly(celular),
        }),
      });

      const data = (await res.json()) as {
        id?: string;
        status?: string;
        statusMessage?: string | null;
        error?: string;
      };

      if (!res.ok || !data.id) {
        setError(data.error ?? "El pago no se pudo procesar.");
        setFase("form");
        return;
      }

      if (data.status === "APPROVED") {
        setFase("aprobado");
        return;
      }
      if (data.status && ["DECLINED", "VOIDED", "ERROR"].includes(data.status)) {
        // `statusMessage` es el motivo real del banco cuando Wompi resuelve
        // el rechazo de una vez, sin necesidad de sondear el estado. Se
        // identifica en vez de mostrarlo crudo: ver lib/payment-errors.ts.
        const clasificado = classifyDeclineReason(data.statusMessage);
        setMensaje(`${clasificado.message} ${clasificado.hint ?? ""}`.trim());
        setFase("rechazado");
        return;
      }
      setTx(data.id);
    } catch (fallo) {
      if (fallo instanceof TypeError) {
        setError("Se cayó la conexión. Revisa tu internet y vuelve a intentar.");
      } else {
        setError(fallo instanceof Error && fallo.message ? fallo.message : "Algo falló al procesar el pago.");
      }
      setFase("form");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-tintaHonda/80 px-4 py-6 sm:px-6"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-orden"
        className="anim-sobre mx-auto w-full max-w-[36rem]"
      >
        <div className="rasgado h-4 bg-maiz" />

        <div className="border-x-2 border-b-2 border-tinta bg-costal">
          <div className="flex items-start justify-between gap-4 border-b border-tinta bg-maiz px-5 py-4 sm:px-7">
            <div>
              <p className="dato">Orden de compra</p>
              <h2 id="titulo-orden" className="mt-1 font-display text-3xl leading-none">
                {plan.name}
              </h2>
              <p className="mt-1.5 font-mono text-[0.75rem]">Ref. {referencia}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-4xl leading-none">
                {plan.priceCOP.toLocaleString("es-CO")}
              </p>
              <p className="dato mt-1 whitespace-nowrap">COP · único</p>
            </div>
          </div>

          <div className="px-5 py-6 sm:px-7">
            {fase === "form" ? (
              <form
                onSubmit={(evento) => {
                  evento.preventDefault();
                  if (puedePagar) void pagar();
                }}
                noValidate
              >
                <fieldset>
                  <legend className="dato text-humo">Tus datos</legend>
                  <div className="mt-3 space-y-4">
                    <Campo etiqueta="Nombre completo" id="nombre">
                      <input
                        ref={primerCampo}
                        id="nombre"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        autoComplete="name"
                        className={estiloInput}
                        placeholder="Como aparece en tu tarjeta"
                      />
                    </Campo>

                    <Campo etiqueta="Correo para el acceso" id="correo">
                      <input
                        id="correo"
                        type="email"
                        inputMode="email"
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                        autoComplete="email"
                        className={estiloInput}
                        placeholder="tucorreo@ejemplo.com"
                      />
                    </Campo>

                    <Campo etiqueta="Confirma tu correo" id="correo2">
                      <input
                        id="correo2"
                        type="email"
                        inputMode="email"
                        value={correoConfirma}
                        onChange={(e) => setCorreoConfirma(e.target.value)}
                        autoComplete="email"
                        className={estiloInput}
                        placeholder="Escríbelo otra vez"
                      />
                      {correoConfirma.length > 3 && !correosOk ? (
                        <p className="mt-1.5 font-mono text-[0.75rem] text-sello">
                          Los dos correos deben ser iguales: ahí llega tu acceso.
                        </p>
                      ) : null}
                    </Campo>
                  </div>
                </fieldset>

                <div className="costura my-7 text-surco" />

                <fieldset>
                  <legend className="dato text-humo">Cómo pagas</legend>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {(["CARD", "NEQUI"] as Metodo[]).map((opcion) => (
                      <button
                        key={opcion}
                        type="button"
                        aria-pressed={metodo === opcion}
                        onClick={() => setMetodo(opcion)}
                        className={`border-2 border-tinta py-3 font-display text-xl leading-none ${
                          metodo === opcion ? "bg-tinta text-costal" : "bg-papel text-tinta"
                        }`}
                      >
                        {opcion === "CARD" ? "Tarjeta" : "Nequi"}
                      </button>
                    ))}
                  </div>

                  {metodo === "CARD" ? (
                    <div className="mt-4 space-y-4">
                      <Campo etiqueta="Número de la tarjeta" id="tarjeta">
                        <input
                          id="tarjeta"
                          inputMode="numeric"
                          autoComplete="cc-number"
                          value={numero}
                          onChange={(e) => setNumero(formatCardNumber(e.target.value))}
                          className={`${estiloInput} font-mono`}
                          placeholder="4242 4242 4242 4242"
                        />
                      </Campo>
                      <div className="grid grid-cols-2 gap-3">
                        <Campo etiqueta="Vence (MM/AA)" id="vence">
                          <input
                            id="vence"
                            inputMode="numeric"
                            autoComplete="cc-exp"
                            value={vence}
                            onChange={(e) => setVence(formatExpiry(e.target.value))}
                            className={`${estiloInput} font-mono`}
                            placeholder="09/28"
                          />
                        </Campo>
                        <Campo etiqueta="CVC" id="cvc">
                          <input
                            id="cvc"
                            inputMode="numeric"
                            autoComplete="cc-csc"
                            value={cvc}
                            onChange={(e) => setCvc(digitsOnly(e.target.value).slice(0, 4))}
                            className={`${estiloInput} font-mono`}
                            placeholder="123"
                          />
                        </Campo>
                      </div>
                      <Campo etiqueta="Cuotas" id="cuotas">
                        <select
                          id="cuotas"
                          value={cuotas}
                          onChange={(e) => setCuotas(Number(e.target.value))}
                          className={`${estiloInput} font-mono`}
                        >
                          {CUOTAS.map((n) => (
                            <option key={n} value={n}>
                              {n === 1 ? "1 cuota" : `${n} cuotas`}
                            </option>
                          ))}
                        </select>
                      </Campo>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <Campo etiqueta="Celular de Nequi" id="celular">
                        <input
                          id="celular"
                          inputMode="tel"
                          autoComplete="tel-national"
                          value={celular}
                          onChange={(e) => setCelular(digitsOnly(e.target.value).slice(0, 10))}
                          className={`${estiloInput} font-mono`}
                          placeholder="3001234567"
                        />
                      </Campo>
                      <p className="mt-2 font-mono text-[0.75rem] text-humo">
                        Te llega una notificación a la app de Nequi para aprobar el pago.
                      </p>
                    </div>
                  )}
                </fieldset>

                <div className="costura my-7 text-surco" />

                <label className="flex cursor-pointer items-start gap-3 text-[0.875rem] leading-snug">
                  <input
                    type="checkbox"
                    checked={acepta}
                    onChange={(e) => setAcepta(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-sello"
                  />
                  <span>
                    Acepto los{" "}
                    <Contrato href={contratos?.terminos}>términos y condiciones</Contrato> y la{" "}
                    <Contrato href={contratos?.datos}>autorización de datos personales</Contrato> de
                    la pasarela de pagos.
                  </span>
                </label>

                {error ? (
                  <p
                    role="alert"
                    className="mt-5 border-l-4 border-sello bg-papel px-4 py-3 text-[0.875rem] leading-snug"
                  >
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={!puedePagar}
                  className="mt-6 w-full border-2 border-tinta bg-tinta py-4 font-display text-2xl leading-none text-costal transition-colors hover:bg-sello hover:border-sello disabled:cursor-not-allowed disabled:border-surco disabled:bg-surco disabled:text-tinta/50"
                >
                  Pagar {formatCOP(plan.priceCOP)}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 w-full py-2 font-mono text-[0.8125rem] underline decoration-surco underline-offset-4"
                >
                  Cancelar
                </button>
              </form>
            ) : null}

            {fase === "procesando" ? (
              <Estado
                titulo="Procesando el pago"
                detalle={
                  metodo === "NEQUI"
                    ? "Abre la app de Nequi y aprueba el cobro. Esta ventana se actualiza sola."
                    : "Estamos confirmando con el banco. No cierres esta ventana."
                }
              >
                <div className="mt-6 h-2 w-full overflow-hidden border border-tinta bg-papel">
                  <div className="anim-germina h-full w-full origin-left bg-maiz" />
                </div>
              </Estado>
            ) : null}

            {fase === "aprobado" ? (
              <Estado
                titulo="Pago aprobado"
                detalle={`Te estamos enviando el acceso a ${correo.trim()}. Llega en pocos minutos; si no lo ves, revisa correo no deseado.`}
              >
                <p className="mt-5 font-mono text-[0.75rem] text-humo">Ref. {referencia}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-6 w-full border-2 border-tinta bg-maiz py-3.5 font-display text-2xl leading-none"
                >
                  Listo
                </button>
              </Estado>
            ) : null}

            {fase === "rechazado" ? (
              <Estado
                titulo="El pago no pasó"
                detalle={
                  mensaje ??
                  "El banco no autorizó el cobro. No te descontamos nada; puedes intentar con otra tarjeta o con Nequi."
                }
              >
                <button
                  type="button"
                  onClick={() => {
                    setTx(null);
                    setMensaje(null);
                    setFase("form");
                  }}
                  className="mt-6 w-full border-2 border-tinta bg-tinta py-3.5 font-display text-2xl leading-none text-costal"
                >
                  Intentar otra vez
                </button>
              </Estado>
            ) : null}

            {fase === "expirado" ? (
              <Estado
                titulo="Sigue en proceso"
                detalle={`El banco todavía no responde. Cuando confirme, el acceso llega a ${correo.trim()} sin que tengas que hacer nada más.`}
              >
                <p className="mt-5 font-mono text-[0.75rem] text-humo">Ref. {referencia}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-6 w-full border-2 border-tinta bg-papel py-3.5 font-display text-2xl leading-none"
                >
                  Cerrar
                </button>
              </Estado>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

const estiloInput =
  "w-full border-2 border-tinta bg-papel px-3 py-2.5 text-[0.9375rem] text-tinta placeholder:text-humo/60";

function Campo({
  etiqueta,
  id,
  children,
}: {
  etiqueta: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="dato block pb-1.5 text-tinta">
        {etiqueta}
      </label>
      {children}
    </div>
  );
}

function Contrato({ href, children }: { href?: string; children: React.ReactNode }) {
  if (!href) return <span className="underline decoration-surco underline-offset-2">{children}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="underline decoration-sello decoration-2 underline-offset-2"
    >
      {children}
    </a>
  );
}

function Estado({
  titulo,
  detalle,
  children,
}: {
  titulo: string;
  detalle: string;
  children?: React.ReactNode;
}) {
  return (
    <div aria-live="polite" className="py-4">
      <h3 className="font-display text-4xl leading-none">{titulo}</h3>
      <p className="mt-3 text-[0.9375rem] leading-relaxed">{detalle}</p>
      {children}
    </div>
  );
}
