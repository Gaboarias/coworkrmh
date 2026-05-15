import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { SessionProvider } from "@/components/providers/SessionProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cowork RMH | Rewind Media House",
  description: "Plataforma de gestión de proyectos para Rewind Media House",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className={inter.className}>
        <SessionProvider>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "hsl(240 8% 11%)",
                border: "1px solid hsl(240 10% 19%)",
                color: "hsl(240 40% 95%)",
              },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  );
}
