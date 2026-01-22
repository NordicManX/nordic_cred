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
      <body className={`${inter.className} bg-gray-50 antialiased`}>
        {/* Container Flexível */}
        <div className="flex min-h-screen">
          
          {/* Sidebar (Agora se comporta bem no mobile) */}
          <Sidebar />

          {/* CONTEÚDO PRINCIPAL 
             - mt-14: Dá espaço para a barra de menu no topo (só no mobile)
             - md:mt-0: Remove esse espaço no desktop
             - md:ml-0: A Sidebar agora é flex item no desktop, não precisa de margin fixa se usarmos flex normal, 
               MAS como a Sidebar no código acima usa 'md:static', ela ocupa espaço real no fluxo.
               Então podemos remover a 'ml-64' fixa e deixar o flexbox cuidar do layout.
          */}
          <main className="flex-1 p-4 md:p-8 mt-14 md:mt-0 w-full overflow-x-hidden">
            {children}
          </main>
        </div>

        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}