"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Se for Login ou Cadastro, tela limpa
  const isPublicPage = pathname === "/login" || pathname === "/cadastro";

  if (isPublicPage) {
    return (
      <main className="min-h-screen w-full bg-gray-100 flex items-center justify-center p-4">
        {children}
      </main>
    );
  }

  // --- LAYOUT DO SISTEMA ---
  return (
    // 1. O Pai segura a altura da tela inteira e proíbe rolagem externa
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      
      {/* 2. Sidebar é inserida aqui. Ela terá largura fixa no Desktop */}
      <Sidebar />

      {/* 3. Área Principal:
          - flex-1: Ocupa todo o espaço restante (cola na sidebar)
          - h-full: Altura total
          - overflow-y-auto: SÓ AQUI tem rolagem. A sidebar fica parada.
      */}
      <main className="flex-1 h-full overflow-y-auto w-full transition-all duration-300">
        {/* - pt-20 no mobile: para não ficar embaixo do header do menu
            - p-6 md:p-8: Espaçamento interno confortável
            - w-full: Garante que usa 100% da largura disponível
        */}
        <div className="w-full p-4 md:p-8 pt-20 md:pt-8 pb-20">
           {children}
        </div>
      </main>
    </div>
  );
}