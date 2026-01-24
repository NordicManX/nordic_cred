import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/src/components/Sidebar";
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
      {/* 1. h-screen: Força o corpo a ter EXATAMENTE a altura da janela do navegador.
         2. overflow-hidden: Impede que a janela inteira role (trava o scroll do navegador).
      */}
      <body className={`${inter.className} bg-gray-50 antialiased h-screen overflow-hidden`}>
        
        {/* Container Flexível ocupa 100% da altura */}
        <div className="flex h-full w-full">
          
          {/* A Sidebar fica parada aqui à esquerda */}
          <Sidebar />

          {/* CONTEÚDO PRINCIPAL (Área de Rolagem)
             - flex-1: Ocupa todo o espaço restante na largura.
             - h-full: Ocupa toda a altura disponível.
             - overflow-y-auto: AQUI É O SEGREDO. Se o conteúdo for maior que a tela,
               a barra de rolagem aparece SÓ AQUI, mantendo a sidebar fixa.
          */}
          <main className="flex-1 h-full overflow-y-auto p-4 md:p-8 mt-14 md:mt-0 w-full bg-gray-50">
            {children}
          </main>
        </div>

        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}