import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Serigrafía sobre costal: papel + tres tintas planas. Sin degradados.
        costal: "#E8DFC6",
        papel: "#F2EBDA",
        tinta: "#12351F",
        tintaHonda: "#0B2013",
        sello: "#C8402A",
        maiz: "#EFB63C",
        humo: "#4F5A45",
        surco: "#B9AF93",
      },
      fontFamily: {
        display: ["var(--font-display)", "Arial Narrow", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: {
        surco: "78rem",
      },
    },
  },
  plugins: [],
};

export default config;
