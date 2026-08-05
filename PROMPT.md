# Prompt para crear GamePassHop (nueva sesión)

Construye desde cero un proyecto nuevo llamado **gamepasshop**: una tienda de una
sola página que vende suscripciones de **Game Pass** a **$69.900 COP el mes**,
con checkout de **Wompi integrado en la misma página** (sin widget, sin
redirecciones, sin ventanas emergentes).


---

## 1. Stack y estructura exacta

Next.js 14 (App Router) + TypeScript + Tailwind 3 + Resend. Sin librerías de UI,
sin shadcn, sin framer-motion, sin gestor de estado. Todo el CSS es Tailwind más
un `globals.css` corto para keyframes.

```
package.json      next 14.2.x, react 18.3, resend ^6
                  dev: typescript 5.5, tailwindcss 3.4, postcss, autoprefixer, @types/*
tsconfig.json     strict: true, paths { "@/*": ["./*"] }
tailwind.config.ts  content: app/**, components/**  |  colors y fontFamily extendidos
app/
  layout.tsx                        fuentes de next/font/google + metadata + <body>
  globals.css                       @tailwind base/components/utilities + keyframes + :focus-visible
  page.tsx                          "use client" — arma la landing y abre el checkout
  api/wompi/acceptance/route.ts     GET  — permalinks de los contratos de Wompi
  api/wompi/pay/route.ts            POST — crea la transacción
  api/wompi/status/[id]/route.ts    GET  — estado mientras el cliente espera
  api/wompi/webhook/route.ts        POST — confirmación de Wompi (fuente de verdad)
components/
  Header.tsx  Hero.tsx  TrustBar.tsx  PlanCard.tsx  CheckoutPanel.tsx  Footer.tsx
  <IconoPropio>.tsx                 un SVG hecho a mano, no una librería de iconos
lib/
  plans.ts        catálogo + formatCOP
  orders.ts       construir y parsear la referencia
  wompi.ts        firma de integridad + verificación de firma de eventos (usa node:crypto)
  wompi-env.ts    wompiBaseUrl(publicKey) — vive solo para que crypto no entre al bundle del cliente
  wompi-api.ts    SERVIDOR: getAcceptanceTokens, createTransaction, getTransaction
  wompi-client.ts NAVEGADOR: tokenizeCard + helpers de formato de tarjeta
  email.ts        aviso de pedido pagado vía Resend
.env.example      con las 7 variables documentadas
README.md         en español, explicando el flujo de pago y los pendientes antes de vender
```

Todas las rutas de API llevan `export const runtime = "nodejs"`.

---

## 2. Catálogo

`lib/plans.ts` — el precio base es **69.900 COP / mes**. Define el catálogo así:

```ts
export interface Plan {
  id: string;          // "gp-1m", "gp-3m", "gp-12m" — sin caracteres raros, va dentro de la referencia
  months: number;
  priceCOP: number;
  label: string;
  popular?: boolean;
}
```

- `gp-1m` — 1 mes — **69.900** — `popular: true` (es el producto principal).
- Agrega además `gp-3m` (199.900) y `gp-12m` (699.900) como packs con ahorro,
  y muestra en cada tarjeta el equivalente por mes. **Si prefieres un solo
  producto, basta con dejar un elemento en el arreglo: nada del resto del código
  puede asumir cuántos planes hay.**
- `formatCOP()` con `Intl.NumberFormat("es-CO", { style:"currency", currency:"COP", maximumFractionDigits:0 })`.

---

## 3. Arquitectura de pago — reglas no negociables

1. **Nada de widget ni Web Checkout de Wompi.** El formulario es nuestro y habla
   contra la API REST de Wompi. El cliente nunca sale del sitio.
2. **Medios de pago: tarjeta y Nequi únicamente.** Nada de PSE ni Bancolombia
   Transfer: obligan a redirigir al portal del banco y eso rompe la premisa.
3. **La tarjeta se tokeniza desde el navegador**, contra
   `POST {base}/tokens/cards` con `Authorization: Bearer <llave pública>`. El
   número y el CVC nunca tocan nuestro servidor ni nuestros logs — eso es lo que
   nos deja fuera del alcance pesado de PCI DSS. No muevas esa llamada al backend.
4. **El monto lo pone el servidor, siempre.** El navegador manda solo el token
   (o el celular de Nequi), el correo y la referencia. `/api/wompi/pay` deriva el
   plan desde la referencia y calcula `priceCOP * 100`. Jamás confíes en un monto
   que venga del cliente.
5. **La firma de integridad** es `sha256(referencia + montoEnCentavos + moneda + secretoDeIntegridad)`,
   calculada en el servidor. Deja un comentario diciendo que se verifique contra
   la documentación vigente de Wompi antes de producción.
6. **Los tokens de aceptación caducan a la hora**: se piden en el servidor justo
   antes de cobrar (`GET {base}/merchants/{publicKey}` →
   `presigned_acceptance` y `presigned_personal_data_auth`). Al navegador solo se
   le devuelven los *permalinks*, nunca los tokens. Y el servidor rechaza con 400
   si `acceptedTerms !== true`.
7. **El webhook es la única fuente de verdad.** Verifica la firma del evento
   (`sha256(valores de signature.properties concatenados + timestamp + secretoDeEventos)`
   comparado contra `signature.checksum`), responde 401 si no cuadra, y solo
   actúa si `transaction.status === "APPROVED"`. Un `Set` en memoria evita
   correos duplicados por reintentos — con un comentario que diga que no es
   garantía si hay varias instancias.
8. **El estado que ve el navegador es solo cosmético.** Mientras la transacción
   está en `PENDING`, el frontend consulta `/api/wompi/status/[id]` cada 2500 ms
   hasta un máximo de 5 minutos; si se agota, no digas "falló": di que sigue en
   proceso y que igual llegará el correo. El polling debe morir si el usuario
   cierra el panel (`useRef` cancelado + cleanup del `useEffect`).

El ambiente se deduce de la llave pública: `pub_test_` → `https://sandbox.wompi.co/v1`,
si no → `https://production.wompi.co/v1`. Nunca una variable extra para eso.

Guarda de arranque: si `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` no existe en el build,
lanza un error legible en vez de dejar que reviente con
"Cannot read properties of undefined".

Los errores de validación de Wompi vienen anidados con profundidad variable
(`{ payment_method: { messages: { token: [...] } } }`): recoge solo los textos
hoja para mostrárselos al comprador, y manda el JSON crudo a `console.error`.

---

## 4. Qué cambia respecto a la tienda de diamantes (importante)

- **No hay "ID de jugador".** El producto se entrega por correo, así que el dato
  crítico es el **email del comprador**. Pide el correo y un segundo campo
  **"confirma tu correo"** que debe coincidir: si hay un typo, el código se pierde.
- **La referencia no puede llevar el correo** (Wompi exige referencia
  alfanumérica y un email trae `@` y puntos). Formato:
  `gph-<idPlan>-<timestamp>` → `gph-gp-1m-1753632000000`. Se parsea **desde la
  derecha** porque el id del plan contiene guiones. Valida que el último segmento
  sea numérico y que el plan exista en el catálogo. El correo del comprador ya
  viaja a Wompi como `customer_email` y vuelve intacto en el webhook.
- **`customer_data.full_name`**: usa el nombre que escriba el comprador (campo
  nuevo en el formulario), no un texto armado.
- **El correo de aviso** (`lib/email.ts`) debe llevar en grande el **correo de
  entrega**, y en la tabla: plan, meses, monto pagado, medio de pago, referencia,
  id de transacción. `replyTo` al correo del cliente. Si falta `RESEND_API_KEY`
  o el envío falla, deja explotar la excepción para que el webhook responda 500 y
  Wompi reintente.
- **Nunca pidas la contraseña ni las credenciales de la cuenta de Microsoft.**
  Lo que se vende es un **código canjeable** que se envía por correo. Que la
  interfaz lo diga con todas las letras.
- Textos de espera y de resultado adaptados: "Estamos generando tu código, te
  llega al correo en pocos minutos", etc.

---

## 5. Diseño — que NO parezca hecho por una IA

Esto es tan importante como el código. **Prohibido explícitamente:**

- Fondos con degradado violeta/índigo/azul-morado. Nada de `from-purple-600 to-blue-500`.
- Hero centrado con titular gigante en texto degradado.
- Glassmorphism, `backdrop-blur` decorativo, `bg-white/5` por todos lados.
- `rounded-2xl` en absolutamente todo, sombras difusas suaves genéricas.
- Emojis usados como iconos (🚀 ⚡ ✨) ni "check" verdes de librería.
- Inter/Poppins como tipografía de titulares.
- Tres tarjetas idénticas alineadas al centro con un "Más popular" flotando.
- Frases de relleno tipo "Potencia tu experiencia gaming al siguiente nivel".

**Dirección que sí quiero — concepto "ficha / tiquete de suscripción":**

- **Paleta** (defínela en `tailwind.config.ts` con nombres propios, no uses los
  colores por defecto de Tailwind): carbón casi negro con tinte frío `#0E1211`,
  un "hueso" claro `#EDE8DF` para bloques invertidos, acento primario lima ácida
  `#C6F04A`, acento secundario naranja quemado `#FF5A1F`, gris humo `#8A9391`.
  Colores planos, sin degradados de fondo.
- **Tipografía**: display = una condensada/pesada de `next/font/google`
  (Archivo 800/900 con tracking negativo, o similar); precios, contadores y
  metadatos en **mono** (IBM Plex Mono); cuerpo en la misma familia display en
  peso normal. Los números grandes son protagonistas.
- **Geometría dura**: radios de 0–2px, bordes sólidos de 1px, sombra dura con
  desplazamiento (`4px 4px 0`) en botones y tarjetas; en hover la pieza se mueve
  2px y la sombra se cierra. Nada de blur.
- **Layout asimétrico**: hero en rejilla desbalanceada (bloque de texto ancho a
  la izquierda, y a la derecha una "ficha" con borde perforado —simulado con
  `repeating-linear-gradient` o `radial-gradient`— que muestra 69.900/mes).
  Nada centrado.
- **Secciones numeradas** en mono (`01 / EL PLAN`, `02 / CÓMO LLEGA`,
  `03 / PREGUNTAS`), con reglas horizontales de 1px separándolas.
- **Una cinta marquee** horizontal entre secciones con texto repetido en mayúscula
  ("ENTREGA EN MINUTOS · TARJETA O NEQUI · SIN SALIR DE LA PÁGINA ·"), animada
  por CSS y desactivada bajo `prefers-reduced-motion: reduce`.
- **Icono propio**: un SVG dibujado a mano con polígonos (estilo del
  `DiamondIcon` del proyecto de referencia) — una ficha/token o un botón de
  mando en trazos geométricos. Nada de librerías de iconos.
- **Checkout**: no repitas el panel lateral derecho. Hazlo un *takeover* a
  pantalla completa: en escritorio, dos columnas — izquierda la ficha del plan
  con el resumen y el sello de precio, derecha el formulario; en móvil, una sola
  columna con la ficha arriba y el formulario abajo. `role="dialog"`,
  `aria-modal="true"`, cerrar con Escape y bloquear el scroll del fondo.
- **Accesibilidad**: contraste AA real sobre el carbón, `:focus-visible` con
  outline del acento, `aria-pressed` en el selector de medio de pago, `<label>`
  asociado a cada input, `inputMode` y `autoComplete` correctos
  (`cc-number`, `cc-exp`, `cc-csc`, `cc-name`, `email`, `tel-national`).

El checkout maneja las fases `form | procesando | aprobado | rechazado | expirado`
con un solo estado, y el botón de pagar se deshabilita hasta que la validación
del lado del cliente pase (correos iguales y válidos, términos aceptados, tarjeta
≥13 dígitos con `MM/AA` y CVC, o celular Nequi `^3\d{9}$`).

---

## 6. Contenido y legal

- La tienda se llama **GamePassHop**. Tono directo, en español de Colombia, sin
  jerga de marketing. Frases cortas.
- Secciones: hero, cinta, el plan (tarjetas), cómo llega el código (3 pasos),
  preguntas frecuentes cortas (4–5: ¿cuánto tarda?, ¿sirve para consola y PC?,
  ¿piden mi contraseña?, ¿y si no me llega?, ¿puedo pagar con Nequi?), footer.
- **Aviso legal en el footer, obligatorio**: GamePassHop es una tienda
  independiente, no está afiliada ni respaldada por Microsoft ni por Xbox, y las
  marcas mencionadas pertenecen a sus dueños. Los pagos los procesa Wompi.
- Deja en el README una advertencia clara: revisar con un abogado si la reventa
  de códigos de suscripción está permitida por los términos del proveedor y de
  dónde vas a obtener el inventario legítimamente, antes de vender de verdad.

---

## 7. Variables de entorno (`.env.example`, comentadas en español)

```
NEXT_PUBLIC_WOMPI_PUBLIC_KEY   pub_test_... (sandbox) o pub_prod_...
WOMPI_PRIVATE_KEY              nunca sale del servidor
WOMPI_INTEGRITY_SECRET         firma de cada transacción
WOMPI_EVENTS_SECRET            verificación del webhook
RESEND_API_KEY                 sin esto el webhook responde 500
ORDER_NOTIFY_EMAIL             a dónde te llega el aviso de venta
ORDER_FROM_EMAIL               remitente, opcional
```

---

## 8. Criterios de aceptación

- `npm install && npm run build` pasa sin errores de TypeScript.
- `npx tsc --noEmit` limpio; `strict: true` respetado, sin `any` sueltos salvo el
  cast puntual del payload del webhook.
- No hay ni un solo `console.log` con datos de tarjeta.
- Buscar "purple", "indigo", "gradient-to" en el proyecto no devuelve nada.
- El sitio se ve bien de 360px a 1440px.
- Comentarios en el código **solo donde la razón no es obvia** (por qué el
  webhook manda, por qué la tokenización va en el cliente, por qué la referencia
  se parsea desde la derecha) — en español, densidad parecida a la del proyecto
  de referencia. No comentes lo que el código ya dice.

## 9. Qué NO construir

Base de datos, login, carrito, panel de administración, tests, i18n, modo claro,
PSE, entrega automatizada. Nada de eso hace falta. Si algo queda pendiente para
vender de verdad, va listado en el README, no implementado a medias.
