"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react"; // Importante para controlar o menu mobile
import { LayoutDashboard, Users, ShoppingCart, Wallet, Banknote, LogOut, ShieldCheck, Menu, X, Package } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false); // Estado do menu

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/" },
    { name: "Clientes", icon: Users, path: "/clientes" },
    { name: "PDV", icon: ShoppingCart, path: "/pdv" },
    { name: "Produtos", icon: Package, path: "/produtos" },
    { name: "Contas a Receber", icon: Wallet, path: "/contas-receber" },
    { name: "Contas a Pagar", icon: Banknote, path: "/contas-pagar" },
  ];

  return (
    <>
      {/* --- BOTÃO MOBILE (Só aparece em telas pequenas) --- */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tighter text-white">
          Nordic<span className="text-blue-600">Cred</span>
        </h1>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="text-gray-300 hover:text-white p-1"
        >
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* --- OVERLAY ESCURO (Fundo preto quando menu abre no mobile) --- */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)} // Fecha ao clicar fora
        />
      )}

      {/* --- SIDEBAR PRINCIPAL --- */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-gray-900 text-gray-100 flex flex-col border-r border-gray-800 transition-transform duration-300 ease-in-out
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} 
        md:translate-x-0 md:static md:h-screen
      `}>

        {/* Cabeçalho Desktop (Escondido no mobile pois já tem a barra superior) */}
        <div className="hidden md:flex h-20 flex-col justify-center px-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold tracking-tighter text-white">
            Nordic<span className="text-blue-600">Cred</span>
          </h1>
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mt-1">
            Gestão Inteligente
          </span>
        </div>

        {/* Navegação */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto mt-14 md:mt-0">
          <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 hidden md:block">
            Menu Principal
          </p>

          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsMobileOpen(false)} // Fecha menu ao clicar no link
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative font-medium
                  ${isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  }
                `}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Área do Usuário / Admin */}
        <div className="p-4 border-t border-gray-800 bg-gray-900">
          <div className="mb-4 bg-gray-800 rounded-lg p-3 flex items-center gap-3 border border-gray-700">
            <div className="bg-purple-100 p-2 rounded-full">
              <ShieldCheck size={16} className="text-purple-800" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Admin</p>
              <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                Super Admin
              </span>
            </div>
          </div>
          <button className="flex items-center gap-3 w-full px-4 py-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors text-sm font-medium">
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}