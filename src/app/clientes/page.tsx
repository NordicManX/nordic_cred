"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/lib/supabase";
import {
  Search, Filter, Plus, FileText, Edit, Ban, Loader2, RotateCcw
} from "lucide-react";
import { ClientFormModal } from "@/src/components/ClientFormModal";
import { ClientDetailsModal } from "@/src/components/ClientDetailsModal";
import { ConfirmModal } from "@/src/components/ConfirmModal";
import { Pagination } from "@/src/components/Pagination";
import { toast } from "sonner";
import { GamificationBadge } from "@/src/components/GamificationBadge"; // Componente da Gamificação

export default function ClientesPage() {
  const supabase = createClient();
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  // Estados de Modais
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<any | null>(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [clienteVisualizando, setClienteVisualizando] = useState<any | null>(null);

  // Modal de Bloqueio
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [clienteParaBloquear, setClienteParaBloquear] = useState<any | null>(null);
  const [loadingBloqueio, setLoadingBloqueio] = useState(false);

  // Estados da Paginação
  const [pagina, setPagina] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Voltamos para 10 itens (pois agora vamos rolar a tela)
  const ITENS_POR_PAGINA = 10; 

  useEffect(() => {
    fetchClientes();
  }, [pagina, busca]);

  async function fetchClientes() {
    setLoading(true);

    const from = (pagina - 1) * ITENS_POR_PAGINA;
    const to = from + ITENS_POR_PAGINA - 1;

    let query = supabase
      .from("clientes")
      .select("*", { count: "exact" })
      .order("nome", { ascending: true })
      .range(from, to);

    if (busca) {
      query = query.or(`nome.ilike.%${busca}%,cpf.ilike.%${busca}%,telefone.ilike.%${busca}%`);
    }

    const { data, count, error } = await query;

    if (error) {
      toast.error("Erro ao carregar clientes.");
    } else {
      setClientes(data || []);
      setTotalItems(count || 0);
    }
    setLoading(false);
  }

  const handleBusca = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusca(e.target.value);
    setPagina(1);
  };

  const handleNovoCliente = () => {
    setClienteEditando(null);
    setIsFormOpen(true);
  };

  const handleEditar = (cliente: any) => {
    setClienteEditando(cliente);
    setIsFormOpen(true);
  };

  const handleVisualizar = (cliente: any) => {
    setClienteVisualizando(cliente);
    setIsDetailsOpen(true);
  };

  const abrirModalBloqueio = (cliente: any) => {
    setClienteParaBloquear(cliente);
    setIsBlockModalOpen(true);
  };

  const executarBloqueio = async () => {
    if (!clienteParaBloquear) return;
    setLoadingBloqueio(true);

    const novoStatus = clienteParaBloquear.status === 'bloqueado' ? 'ativo' : 'bloqueado';
    const acao = novoStatus === 'ativo' ? 'desbloqueado' : 'bloqueado';

    const { error } = await supabase
      .from("clientes")
      .update({ status: novoStatus })
      .eq("id", clienteParaBloquear.id);

    if (error) {
      toast.error("Erro ao alterar status.");
    } else {
      toast.success(`Cliente ${acao} com sucesso!`);
      fetchClientes();
      setIsBlockModalOpen(false);
      setClienteParaBloquear(null);
    }
    setLoadingBloqueio(false);
  };

  const totalPaginas = Math.ceil(totalItems / ITENS_POR_PAGINA);

  return (
    <div className="w-full space-y-6">

      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Clientes</h1>
          <p className="text-gray-500 text-sm">Gerencie cadastros, limites e histórico financeiro.</p>
        </div>
        <button
          onClick={handleNovoCliente}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
        >
          <Plus size={20} />
          Novo Cliente
        </button>
      </div>

      {/* Filtros */}
      <div className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou telefone..."
            value={busca}
            onChange={handleBusca}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 whitespace-nowrap">
          <Filter size={18} /> Filtros
        </button>
      </div>

      {/* Tabela */}
      <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Cliente</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">CPF</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Status</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Nível (Pontos)</th>
                <th className="px-6 py-4 font-medium text-right whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600"/></td></tr>
              ) : clientes.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum cliente encontrado.</td></tr>
              ) : (
                clientes.map((cliente) => (
                  <tr key={cliente.id} className={`hover:bg-gray-50 transition-colors ${cliente.status === 'bloqueado' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{cliente.nome}</p>
                      <p className="text-xs text-gray-500">{cliente.telefone}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{cliente.cpf}</td>
                    <td className="px-6 py-4">
                      {cliente.status === 'bloqueado' ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold border border-red-200">BLOQUEADO</span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">Em dia</span>
                      )}
                    </td>
                    
                    {/* COLUNA DE PONTOS ATUALIZADA */}
                    <td className="px-6 py-4">
                      <GamificationBadge pontos={cliente.pontos_acumulados || 0} />
                    </td>

                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <button onClick={() => handleVisualizar(cliente)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver Ficha">
                        <FileText size={18} />
                      </button>
                      <button onClick={() => handleEditar(cliente)} className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Editar Dados">
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => abrirModalBloqueio(cliente)}
                        className={`p-2 rounded-lg transition-colors ${cliente.status === 'bloqueado' ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                        title={cliente.status === 'bloqueado' ? "Desbloquear" : "Bloquear"}
                      >
                        {cliente.status === 'bloqueado' ? <RotateCcw size={18} /> : <Ban size={18} />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="w-full">
            <Pagination
                currentPage={pagina}
                totalPages={totalPaginas}
                onPageChange={setPagina}
                totalItems={totalItems}
                itemsPerPage={ITENS_POR_PAGINA}
            />
        </div>
      </div>

      {/* --- MODAIS --- */}
      <ClientFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchClientes}
        clienteParaEditar={clienteEditando}
      />

      <ClientDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        cliente={clienteVisualizando}
      />

      <ConfirmModal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        onConfirm={executarBloqueio}
        title={clienteParaBloquear?.status === 'bloqueado' ? "Desbloquear Cliente" : "Bloquear Cliente"}
        description={clienteParaBloquear?.status === 'bloqueado'
            ? `Deseja realmente remover o bloqueio de ${clienteParaBloquear?.nome}?`
            : `Tem certeza que deseja bloquear ${clienteParaBloquear?.nome}?`}
        confirmText={clienteParaBloquear?.status === 'bloqueado' ? "Desbloquear" : "Bloquear Acesso"}
        variant={clienteParaBloquear?.status === 'bloqueado' ? "primary" : "danger"}
        loading={loadingBloqueio}
      />

    </div>
  );
}