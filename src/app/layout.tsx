import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

// Tipografía Consola:
// - JetBrains Mono — via next/font/google. Es la voz de toda la interfaz:
//   estructura, etiquetas, números y controles.
// - Satoshi (Fontshare via CSS API <link>, no via npm — Fontshare no publica
//   en npm registry). Queda reservada a `.prose` y `.reading`: el editor de
//   notas y las descripciones, que son texto para leer y no para operar.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pistachio · RMH",
  description: "Gestión de proyectos y operaciones — Rewind Media House",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Satoshi (Fontshare) — sólo los pesos roman.
            OJO: NO agregar tokens de itálica (300i/400i/…). Satoshi no tiene
            corte itálico en Fontshare y pedirlo hace que la API devuelva 500
            para la request ENTERA, así que no cargaba ningún peso y toda la
            app caía al fallback system-ui. La itálica del drop-line de
            PageHeader la sintetiza el navegador. */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap"
        />
        {/*
          Theme inicial sincronizado para evitar flash (FOUC). next-themes
          hidrata después con su propio script.

          El `'dark'` de acá DEBE coincidir con el `defaultTheme` de
          ThemeProvider. Si se separan, cada carga pinta un tema y la
          hidratación lo cambia por el otro: un parpadeo en toda la app que no
          rompe nada y que nadie sabe de dónde sale. Un test de conformidad
          compara los dos valores.

          dangerouslySetInnerHTML es intencional: el string es un literal
          hardcodeado — no contiene ni interpola datos de usuario, por lo
          que no hay riesgo de XSS. Patrón estándar para inline scripts de
          inicialización en Next.js App Router.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('pistachio-theme')||'dark';if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}`,
          }}
        />
      </head>
      {/* `font-mono` y no `font-sans`: la utilidad de Tailwind se emite después
          del @layer base, así que gana sobre la regla de `body` en globals.css.
          Con `font-sans` acá, el cambio de voz de Consola no se aplicaba en
          ningún lado y no rompía nada — fallaba en silencio. */}
      <body className={`${jetbrainsMono.variable} font-mono antialiased`}>
        <ThemeProvider>
          <SessionProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "var(--surface-el)",
                  border: "1px solid var(--rule-strong)",
                  color: "var(--ink)",
                  // Un toast es cromo, no lectura: va en la voz de la interfaz.
                  fontFamily: "var(--font-mono), ui-monospace, monospace",
                  fontSize: "13px",
                  borderRadius: "2px",
                },
              }}
            />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
