import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// O segredo está aqui: o @ aponta direto para a pasta src
import { Sidebar } from "../components/Sidebar";
import { Toaster } from "sonner";

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
      <body className={`${inter.className} bg-zinc-50 antialiased`}>
        <div className="flex min-h-screen">
          {/* Sidebar Fixa (não precisa passar props, ela se gerencia) */}
          <Sidebar />

          {/* Área principal do conteúdo.
            ml-64: Margem esquerda de 64 (256px) para compensar a largura da Sidebar fixa.
            Isso impede que o conteúdo fique escondido atrás do menu.
          */}
          <main className="flex-1 ml-64 p-8 transition-all duration-300">
            {children}
          </main>
        </div>

        {/* Toaster: O componente que mostra os alertas bonitos.
          richColors: Ativa cores semânticas (Verde para sucesso, Vermelho para erro).
        */}
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}