import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Toaster } from "sonner";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

// Body: Geist Sans variable (paquete oficial Vercel), humanista,
// x-height alta, óptima para UI a 14–16px. Expone variable --font-geist-sans,
// la mapeamos a --font-sans abajo.

// Display: Fraunces como variable font (opsz + SOFT axes). next/font/google
// no admite `weight` array junto a `axes` — omitir weight para usar la
// variable completa y controlar peso vía font-variation-settings en CSS.
const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Pistachio",
  description: "Gestión de proyectos y CRM para Rewind Media House",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var b=localStorage.getItem('pistachio-base');if(b==='pine')document.documentElement.setAttribute('data-base','pine');}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${GeistSans.variable} ${fraunces.variable} ${jetbrainsMono.variable} font-sans`}
      >
        <ThemeProvider>
          <SessionProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "var(--surface-el)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                },
              }}
            />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
