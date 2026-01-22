"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  Wallet, 
  Banknote, 
  LogOut,
  ShieldCheck 
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/" },
    { name: "Clientes", icon: Users, path: "/clientes" },
    { name: "PDV", icon: ShoppingCart, path: "/pdv" },
    { name: "Contas a Receber", icon: Wallet, path: "/contas-receber" },
    { name: "Contas a Pagar", icon: Banknote, path: "/contas-pagar" },
  ];

  return (
    // Usando gray-900 (#111827) para o fundo escuro corporativo
    <aside className="w-64 h-screen bg-gray-900 text-gray-100 flex flex-col fixed left-0 top-0 border-r border-gray-800 z-50">
      
      {/* Cabeçalho com Logo */}
      <div className="h-20 flex flex-col justify-center px-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold tracking-tighter text-white">
          Nordic<span className="text-blue-600">Cred</span>
        </h1>
        <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mt-1">
          Gestão Inteligente
        </span>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Menu Principal
        </p>
        
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          
          return (
            <Link
              key={item.path}
              href={item.path}
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
        {/* Badge do Super Admin (Roxo Pedido) */}
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
          <span>Sair do Sistema</span>
        </button>
      </div>
    </aside>
  );
}