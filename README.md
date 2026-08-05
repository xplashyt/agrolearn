# AgroLearn

Página de una sola página que vende tres cursos en video para armar una huerta en
casa, con checkout de **Wompi integrado** (tarjeta y Nequi) sin widget, sin
redirecciones y sin ventanas emergentes.

| Curso | Precio | Contenido |
| --- | --- | --- |
| `patio-inicio` — Primeras cosechas | 48.900 COP | 4 módulos · 2 h 30 · 8 cultivos |
| `patio-completo` — Huerta completa | 69.900 COP | 9 módulos · 6 h · 20 cultivos |
| `patio-maestro` — Huerta todo el año | 89.900 COP | 14 módulos · 11 h · 30 cultivos |

Pago único por curso. Los precios viven en `lib/plans.ts`; nada del resto del
código asume cuántos planes hay.

## Levantar el proyecto

```bash
npm install
cp .env.example .env.local   # y llena las 7 variables
npm run dev
```

El ambiente de Wompi se deduce de la llave pública: `pub_test_` apunta a sandbox,
cualquier otra cosa a producción. No hay variable extra para eso.

## Cómo funciona el pago

1. **La tarjeta se tokeniza en el navegador** (`POST {base}/tokens/cards` con la
   llave pública). El número y el CVC nunca pasan por nuestro servidor ni por
   nuestros logs; eso es lo que nos deja fuera del alcance pesado de PCI DSS.
2. El navegador manda a `/api/wompi/pay` solo el token (o el celular de Nequi), el
   nombre, el correo y la referencia. **El monto lo calcula el servidor** a partir
   del plan que dice la referencia: nunca se acepta un valor del cliente.
3. El servidor pide los tokens de aceptación (caducan a la hora), firma la
   integridad con `sha256(referencia + centavos + moneda + secreto)` y crea la
   transacción.
4. Mientras Wompi responde `PENDING`, el navegador consulta
   `/api/wompi/status/[id]` cada 2,5 s hasta 5 minutos. Ese estado es **cosmético**.
5. **La única fuente de verdad es el webhook** (`/api/wompi/webhook`): verifica la
   firma del evento, responde 401 si no cuadra y solo actúa con
   `status === "APPROVED"`. Ahí se dispara el correo de aviso vía Resend.

La referencia es `agl-<idPlan>-<timestamp>` y se parsea **desde la derecha**,
porque el id del plan contiene guiones. El correo del comprador no cabe en la
referencia (Wompi la exige alfanumérica): viaja como `customer_email` y vuelve
intacto en el webhook.

## Pendientes antes de vender de verdad

Esto no está implementado y hace falta resolverlo:

- **Entrega del curso.** Hoy el webhook solo te avisa la venta por correo; el
  enlace de acceso lo mandas tú a mano. Si quieres entrega automática, necesitas
  una plataforma de contenido y generar el acceso desde el webhook.
- **El curso.** Los módulos, horas y cultivos de `lib/plans.ts` son el contenido
  que prometes: no publiques la página sin haberlo grabado.
- **Deduplicación real de eventos.** El `Set` en memoria del webhook evita correos
  repetidos en una instancia, pero se pierde en cada despliegue y no sirve con
  varias instancias. Con volumen, persiste el `transaction.id`.
- **Legal.** Revisa con un abogado el derecho de retracto y la reversión de pago
  del Estatuto del Consumidor (Ley 1480) aplicado a contenido digital, y la
  política de tratamiento de datos que exige la Ley 1581. La página dice que no
  garantizamos resultados de cosecha; confirma que el texto te cubre.
- **Facturación.** No hay emisión de factura electrónica ni registro de ventas
  fuera del correo de aviso.

## Qué no hay

Base de datos, login, carrito, panel de administración, tests, i18n, modo oscuro,
PSE ni Bancolombia Transfer (obligan a redirigir al banco y rompen la premisa de
no salir de la página).
