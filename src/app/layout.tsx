import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

// Tipografía Edition 04:
// - Satoshi (Fontshare via CSS API <link>, no via npm — Fontshare no publica
//   en npm registry). Carga via Fontshare CDN, font-family: "Satoshi".
// - JetBrains Mono — via next/font/google. Labels técnicos, timestamps.
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
        {/* Satoshi (Fontshare) — todos los weights + italics que el sistema usa */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900,300i,400i,500i,700i,900i&display=swap"
        />
        {/* Theme inicial sincronizado para evitar flash. next-themes lo
            hidrata después con su propio script. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('pistachio-theme')||'light';if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}`,
          }}
        />
      </head>
      <body className={`${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider>
          <SessionProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "var(--surface-el)",
                  border: "1px solid var(--border)",
                  color: "var(--ink)",
                  fontFamily: "Satoshi, system-ui, sans-serif",
                },
              }}
            />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
