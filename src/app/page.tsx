"use client";

import { toast } from "sonner";

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-zinc-800">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card de Exemplo */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200">
          <h2 className="text-zinc-500 font-medium">Total a Receber</h2>
          <p className="text-2xl font-bold text-green-600 mt-2">R$ 12.450,00</p>
        </div>
      </div>

      {/* Botão para testar o Toast */}
      <button 
        onClick={() => toast.success("Sistema NordicCred iniciado com sucesso!")}
        className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors"
      >
        Testar Notificação
      </button>
    </div>
  );
}