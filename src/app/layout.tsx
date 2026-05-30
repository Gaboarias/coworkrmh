import type { Metadata } from "next";
import { Sora, JetBrains_Mono } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Toaster } from "sonner";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuroraBackground } from "@/components/layout/AuroraBackground";

// Body: Geist Sans variable (Vercel oficial) — humanista, x-height alta,
// óptima para UI a 14–16px. Expone --font-geist-sans (lo usa el body).

// Sora — sans geométrica cálida para headings (Sunset Aurora).
// Pareada con Geist en body para contraste sutil display/body.
const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sora",
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
        className={`${GeistSans.variable} ${sora.variable} ${jetbrainsMono.variable} font-sans`}
      >
        {/* Fondo aurora fijo detrás de todo (z-index: -1) */}
        <AuroraBackground />
        <ThemeProvider>
          <SessionProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "rgba(0, 0, 0, 0.5)",
                  backdropFilter: "blur(28px) saturate(180%)",
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
