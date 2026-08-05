// Este archivo existe separado de wompi.ts para que node:crypto no entre al
// bundle del navegador: wompi-client.ts necesita la URL base, no la firma.
export function wompiBaseUrl(publicKey: string): string {
  return publicKey.startsWith("pub_test_")
    ? "https://sandbox.wompi.co/v1"
    : "https://production.wompi.co/v1";
}

export function publicKeyOrThrow(): string {
  const key = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
  if (!key) {
    throw new Error(
      "Falta NEXT_PUBLIC_WOMPI_PUBLIC_KEY. Copia .env.example a .env.local y vuelve a levantar el servidor.",
    );
  }
  return key;
}
