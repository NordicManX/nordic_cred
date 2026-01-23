"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/lib/supabase";
import { Despesa } from "@/src/types";
import { NovaDespesaModal } from "@/src/components/NovaDespesaModal";
import { ConfirmExpenseModal } from "@/src/components/ConfirmExpenseModal"; // <--- IMPORT NOVO
import { 
  Search, 
  Plus, 
  Calendar, 
  DollarSign, 
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { format, isBefore, parseISO } from "date-fns";

export default function ContasPagarPage() {
  const supabase = createClient();
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  
  // Controle de Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [despesaEditando, setDespesaEditando] = useState<Despesa | null>(null);
  
  // Controle do Pagamento
  const [despesaParaPagar, setDespesaParaPagar] = useState<{id: string, valor: number, descricao: string} | null>(null);
  const [loadingPagamento, setLoadingPagamento] = useState(false);
  
  const [paginaAtual, setPaginaAtual] = useState(1);
  const ITENS_POR_PAGINA = 7;

  useEffect(() => {
    fetchDespesas();
  }, []);

  async function fetchDespesas() {
    setLoading(true);
    const { data, error } = await supabase
      .from("despesas")
      .select("*")
      .order("data_vencimento", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar despesas.");
    } else {
      setDespesas(data || []);
    }
    setLoading(false);
  }

  // 1. Botão Pagar: Apenas abre o modal
  const handleBotaoPagar = (id: string, valor: number, descricao: string) => {
    setDespesaParaPagar({ id, valor, descricao });
  };

  // 2. Executar Pagamento (Chamado pelo Modal)
  const executarPagamento = async () => {
    if (!despesaParaPagar) return;
    setLoadingPagamento(true);

    const { error } = await supabase
      .from("despesas")
      .update({
        status: "pago",
        data_pagamento: new Date().toISOString()
      })
      .eq("id", despesaParaPagar.id);

    if (error) {
      toast.error("Erro ao pagar conta.");
    } else {
      toast.success("Conta paga com sucesso! 💸");
      fetchDespesas();
      setDespesaParaPagar(null); // Fecha o modal
    }
    setLoadingPagamento(false);
  };

  const handleEditar = (despesa: Despesa) => {
    setDespesaEditando(despesa);
    setIsModalOpen(true);
  };

  const handleNovo = () => {
    setDespesaEditando(null);
    setIsModalOpen(true);
  };

  const despesasFiltradas = despesas.filter(d => 
    d.descricao.toLowerCase().includes(busca.toLowerCase())
  );

  const totalPendente = despesasFiltradas
    .filter(d => d.status === 'pendente')
    .reduce((acc, d) => acc + d.valor, 0);

  const totalPaginas = Math.ceil(despesasFiltradas.length / ITENS_POR_PAGINA);
  const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const fim = inicio + ITENS_POR_PAGINA;
  const listaPaginada = despesasFiltradas.slice(inicio, fim);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Contas a Pagar</h1>
          <p className="text-gray-500 text-sm">Controle de despesas fixas e fornecedores.</p>
        </div>
        
        <button 
          onClick={handleNovo}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm hover:shadow-md"
        >
          <Plus size={20} />
          Lançar Despesa
        </button>
      </div>

      <div className="bg-white p-5 rounded-xl border border-red-100 shadow-sm flex items-center justify-between max-w-sm">
        <div>
          <p className="text-sm font-medium text-red-500">Total a Pagar (Pendente)</p>
          <h3 className="text-2xl font-bold text-red-600">
            {totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h3>
        </div>
        <div className="p-3 bg-red-50 text-red-600 rounded-lg">
          <DollarSign size={24} />
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar despesa..." 
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPaginaAtual(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">Vencimento</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Descrição</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Categoria</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Valor</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="animate-spin inline mr-2" /> Carregando...
                  </td>
                </tr>
              ) : listaPaginada.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Nenhuma despesa encontrada.
                  </td>
                </tr>
              ) : (
                listaPaginada.map((conta) => {
                  const hoje = new Date();
                  const dataVenc = parseISO(conta.data_vencimento);
                  const isAtrasado = isBefore(dataVenc, hoje) && conta.status === 'pendente';

                  return (
                    <tr key={conta.id} className="hover:bg-red-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-medium text-gray-900">
                          <Calendar size={16} className="text-gray-400" />
                          {format(dataVenc, "dd/MM/yyyy")}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800">
                        {conta.descricao}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs uppercase font-bold tracking-wide">
                          {conta.categoria}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">
                        {conta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-6 py-4">
                        {conta.status === 'pago' ? (
                          <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-xs font-medium border border-green-200">
                            <CheckCircle size={12} /> Pago
                          </span>
                        ) : isAtrasado ? (
                          <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-0.5 rounded-full text-xs font-medium border border-red-200 animate-pulse">
                            <AlertCircle size={12} /> Atrasado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full text-xs font-medium border border-blue-200">
                            <Clock size={12} /> Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        
                        <button 
                          onClick={() => handleEditar(conta)}
                          title="Editar Conta"
                          className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        >
                          <Edit size={18} />
                        </button>

                        {conta.status === 'pendente' && (
                          <button 
                            onClick={() => handleBotaoPagar(conta.id, conta.valor, conta.descricao)} // <--- USA A NOVA FUNÇÃO
                            className="text-red-600 hover:text-white border border-red-200 hover:bg-red-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ml-2"
                          >
                            Pagar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {despesasFiltradas.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Página {paginaAtual} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              <button 
                disabled={paginaAtual === 1}
                onClick={() => setPaginaAtual(p => p - 1)}
                className="p-2 border border-gray-300 bg-white rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                disabled={paginaAtual === totalPaginas}
                onClick={() => setPaginaAtual(p => p + 1)}
                className="p-2 border border-gray-300 bg-white rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Criar/Editar */}
      <NovaDespesaModal 
        key={despesaEditando ? despesaEditando.id : 'novo'}
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchDespesas}
        despesaParaEditar={despesaEditando} 
      />

      {/* NOVO: Modal de Confirmar Pagamento */}
      <ConfirmExpenseModal
        isOpen={!!despesaParaPagar}
        onClose={() => setDespesaParaPagar(null)}
        onConfirm={executarPagamento}
        valor={despesaParaPagar?.valor || 0}
        descricao={despesaParaPagar?.descricao || ""}
        loading={loadingPagamento}
      />
    </div>
  );
}