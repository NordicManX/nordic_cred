"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/src/lib/supabase";
import {
  LayoutDashboard, Users, ShoppingCart, Wallet,
  Banknote, LogOut, ShieldCheck, Menu, X, Package, 
  BarChart3, Settings,
} from "lucide-react";
import { toast } from "sonner";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const supabase = createClient();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair");
    } else {
      router.push("/login");
      router.refresh();
    }
  };

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/" },
    { name: "Clientes", icon: Users, path: "/clientes" },
    { name: "PDV", icon: ShoppingCart, path: "/pdv" },
    { name: "Produtos", icon: Package, path: "/produtos" },
    { name: "Contas a Receber", icon: Wallet, path: "/contas-receber" },
    { name: "Contas a Pagar", icon: Banknote, path: "/contas-pagar" },
    { name: "Relatórios", icon: BarChart3, path: "/relatorios" },
    { name: "Configurações", icon: Settings, path: "/admin/configuracoes" },
    
  ];

  return (
    <>
      {/* --- MOBILE HEADER (Fixo no topo, só aparece < md) --- */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 z-50 bg-gray-900 border-b border-gray-800 px-4 flex items-center justify-between shadow-md">
        <h1 className="text-xl font-bold tracking-tighter text-white">
          Nordic<span className="text-blue-500">Cred</span>
        </h1>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="text-gray-300 hover:text-white p-2 rounded-md hover:bg-gray-800 transition-colors"
        >
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* --- OVERLAY MOBILE --- */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`
        /* Mobile: Fixa e desliza */
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-gray-900 text-gray-100 flex flex-col border-r border-gray-800 
        transition-transform duration-300 ease-in-out shadow-2xl
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} 
        
        /* Desktop: Estática (ocupa espaço real) e sempre visível */
        md:translate-x-0 md:static md:h-screen md:shadow-none md:flex-shrink-0
      `}>

        {/* Header Desktop */}
        <div className="hidden md:flex h-20 flex-col justify-center px-6 border-b border-gray-800 shrink-0">
          <h1 className="text-2xl font-bold tracking-tighter text-white">
            Nordic<span className="text-blue-500">Cred</span>
          </h1>
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mt-1">
            Gestão Inteligente
          </span>
        </div>

        {/* Espaçador Mobile */}
        <div className="md:hidden h-16 flex-shrink-0" />

        {/* Menu Scrollável (Caso tenha muitos itens) */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
            Menu Principal
          </p>

          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative font-medium mb-1
                  ${isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  }
                `}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-white" : "text-gray-500 group-hover:text-white transition-colors"} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/50 shrink-0">
          <Link
            href="/admin/usuarios"
            onClick={() => setIsMobileOpen(false)}
            className="mb-3 bg-gray-800/80 rounded-xl p-3 flex items-center gap-3 border border-gray-700 hover:border-gray-600 hover:bg-gray-800 transition-all cursor-pointer group"
          >
            <div className="bg-purple-500/10 p-2 rounded-lg group-hover:bg-purple-500/20 transition-colors">
              <ShieldCheck size={18} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Administrador</p>
              <span className="text-[10px] text-purple-300 font-medium uppercase tracking-wide">
                Gerenciar Equipe
              </span>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all text-sm font-medium group"
          >
            <LogOut size={20} className="group-hover:text-red-400 transition-colors" />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>
    </>
  );
}