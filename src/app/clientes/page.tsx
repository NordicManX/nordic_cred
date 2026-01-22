"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/lib/supabase";
import { Cliente } from "@/src/types";
import { NovoClienteModal } from "@/src/components/NovoClienteModal";
import { 
  Search, 
  Plus, 
  Edit, 
  Ban, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  Filter
} from "lucide-react";
import { toast } from "sonner";

export default function ClientesPage() {
  const supabase = createClient();
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchClientes();
  }, [page]);

  async function fetchClientes() {
    setLoading(true);
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .range(from, to)
      .order("nome", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar clientes.");
    } else {
      setClientes(data || []);
    }
    setLoading(false);
  }

  const verificarPendencia = (cliente: Cliente) => {
    if (cliente.nome === "Maria Oliveira") return true; 
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestão de Clientes</h1>
          <p className="text-gray-500 text-sm">Gerencie cadastros, limites e histórico financeiro.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-sm hover:shadow-md font-medium text-sm"
        >
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome, CPF ou telefone..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900 placeholder:text-gray-400 transition-all"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors text-sm font-medium">
          <Filter size={18} />
          Filtros
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">Cliente</th>
                <th className="px-6 py-4 font-semibold text-gray-700">CPF</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Pontos</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Carregando dados...
                  </td>
                </tr>
              ) : clientes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                clientes.map((cliente) => {
                  const temPendencia = verificarPendencia(cliente);
                  
                  return (
                    <tr key={cliente.id} className="hover:bg-blue-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 uppercase">{cliente.nome}</div>
                        <div className="text-gray-500 text-xs mt-0.5">{cliente.telefone || "Sem telefone"}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                        {cliente.cpf}
                      </td>
                      <td className="px-6 py-4">
                        {cliente.status === 'bloqueado' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                            Bloqueado
                          </span>
                        ) : temPendencia ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200 animate-pulse">
                            Pendência
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                            Em dia
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-blue-600">
                        {cliente.pontos_acumulados}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button title="Ver Ficha" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                            <FileText size={18} />
                          </button>
                          <button title="Editar" className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors">
                            <Edit size={18} />
                          </button>
                          <button title="Bloquear" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                            <Ban size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Paginação */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Página <span className="font-medium text-gray-900">{page}</span>
          </span>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="p-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={() => setPage(p => p + 1)}
              className="p-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-600 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <NovoClienteModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchClientes()}
      />
    </div>
  );
}