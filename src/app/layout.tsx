import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AppLayout } from "@/src/components/AppLayout"; // Importa o gerenciador

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NordicCred",
  description: "Sistema de Gestão de Crediário - Nordic Tech",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <body className={`${inter.className} bg-gray-50 antialiased`}>
        {/* Envolvemos tudo no AppLayout para decidir se mostra Sidebar ou não */}
        <AppLayout>
          {children}
        </AppLayout>
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}