"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/lib/supabase";
import { Parcela } from "@/src/types";
import { ConfirmPaymentModal } from "@/src/components/ConfirmPaymentModal";
import { SaleDetailsDrawer } from "@/src/components/SaleDetailsDrawer";
import { 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Calendar,
  DollarSign,
  Loader2,
  Eye,
  ChevronLeft,  // <--- Ícone Novo
  ChevronRight  // <--- Ícone Novo
} from "lucide-react";
import { toast } from "sonner";
import { format, isBefore, parseISO } from "date-fns";

export default function ContasReceberPage() {
  const supabase = createClient();
  
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'pago' | 'atrasado'>('todos');
  const [buscaCliente, setBuscaCliente] = useState("");

  // --- PAGINAÇÃO (Novos Estados) ---
  const [paginaAtual, setPaginaAtual] = useState(1);
  const ITENS_POR_PAGINA = 7;

  // Estados dos Modais
  const [parcelaSelecionadaBaixa, setParcelaSelecionadaBaixa] = useState<{id: string, valor: number} | null>(null);
  const [loadingBaixa, setLoadingBaixa] = useState(false);
  const [parcelaPreview, setParcelaPreview] = useState<Parcela | null>(null);

  useEffect(() => {
    fetchParcelas();
  }, [filtroStatus]);

  // Sempre que mudar o filtro ou a busca, volta para a página 1
  useEffect(() => {
    setPaginaAtual(1);
  }, [buscaCliente, filtroStatus]);

  async function fetchParcelas() {
    setLoading(true);
    
    let query = supabase
      .from("parcelas")
      .select(`
        *,
        clientes ( nome, cpf )
      `)
      .order("data_vencimento", { ascending: true });

    if (filtroStatus !== 'todos') {
      if (filtroStatus === 'atrasado') {
        const hoje = new Date().toISOString().split('T')[0];
        query = query.eq('status', 'pendente').lt('data_vencimento', hoje);
      } else {
        query = query.eq('status', filtroStatus);
      }
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Erro ao carregar contas.");
    } else {
      const dadosTratados = (data as any[]).map(p => {
        const venceu = isBefore(parseISO(p.data_vencimento), new Date()) && p.status === 'pendente';
        return {
          ...p,
          status_real: p.status === 'pago' ? 'pago' : (venceu ? 'atrasado' : 'pendente')
        };
      });
      setParcelas(dadosTratados);
    }
    setLoading(false);
  }

  const abrirModalRecebimento = (e: React.MouseEvent, id: string, valor: number) => {
    e.stopPropagation();
    setParcelaSelecionadaBaixa({ id, valor });
  };

  const abrirPreview = (parcela: Parcela) => {
    setParcelaPreview(parcela);
  };

  const confirmarBaixa = async () => {
    if (!parcelaSelecionadaBaixa) return;
    setLoadingBaixa(true);
    
    const { error } = await supabase
      .from("parcelas")
      .update({
        status: "pago",
        data_pagamento: new Date().toISOString()
      })
      .eq("id", parcelaSelecionadaBaixa.id);

    if (error) {
      toast.error("Erro ao receber parcela.");
    } else {
      toast.success("Pagamento registrado com sucesso! 💰");
      fetchParcelas();
      setParcelaSelecionadaBaixa(null);
    }
    setLoadingBaixa(false);
  };

  // 1. Primeiro filtramos a lista completa
  const parcelasFiltradas = parcelas.filter(p => 
    p.clientes?.nome.toLowerCase().includes(buscaCliente.toLowerCase())
  );

  // 2. Calculamos os totais financeiros (baseado no filtro)
  const totalReceber = parcelasFiltradas
    .filter(p => p.status_real !== 'pago')
    .reduce((acc, p) => acc + p.valor, 0);

  const totalAtrasado = parcelasFiltradas
    .filter(p => p.status_real === 'atrasado')
    .reduce((acc, p) => acc + p.valor, 0);

  // 3. Lógica de Paginação (Fatiar o Array)
  const totalPaginas = Math.ceil(parcelasFiltradas.length / ITENS_POR_PAGINA);
  const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const fim = inicio + ITENS_POR_PAGINA;
  const parcelasPaginadas = parcelasFiltradas.slice(inicio, fim);

  // Funções de navegação
  const proximaPagina = () => {
    if (paginaAtual < totalPaginas) setPaginaAtual(prev => prev + 1);
  };

  const paginaAnterior = () => {
    if (paginaAtual > 1) setPaginaAtual(prev => prev - 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Contas a Receber</h1>
          <p className="text-gray-500 text-sm">Controle de crediário e inadimplência.</p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total a Receber</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {totalReceber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-red-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-500">Em Atraso (Crítico)</p>
            <h3 className="text-2xl font-bold text-red-600">
              {totalAtrasado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <AlertCircle size={24} />
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome do cliente..." 
            value={buscaCliente}
            onChange={(e) => setBuscaCliente(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {['todos', 'pendente', 'atrasado', 'pago'].map((status) => (
            <button 
              key={status}
              onClick={() => setFiltroStatus(status as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap border transition-colors capitalize
                ${filtroStatus === status 
                  ? 'bg-gray-900 text-white border-gray-900' 
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }
              `}
            >
              {status === 'pendente' ? 'A Vencer' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Parcelas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">Vencimento</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Cliente</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Parcela</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Valor</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="animate-spin text-blue-600" size={24} />
                      <p>Carregando financeiro...</p>
                    </div>
                  </td>
                </tr>
              ) : parcelasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Nenhuma parcela encontrada.
                  </td>
                </tr>
              ) : (
                // AQUI USAMOS A LISTA PAGINADA
                parcelasPaginadas.map((parcela: any) => {
                  const status = parcela.status_real;
                  
                  return (
                    <tr 
                      key={parcela.id} 
                      onClick={() => abrirPreview(parcela)}
                      className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-900 font-medium">
                          <Calendar size={16} className="text-gray-400" />
                          {format(parseISO(parcela.data_vencimento), "dd/MM/yyyy")}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{parcela.clientes?.nome}</div>
                        <div className="text-xs text-gray-500">CPF: {parcela.clientes?.cpf}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {parcela.numero_parcela}ª Parcela
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">
                        {parcela.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-6 py-4">
                        {status === 'pago' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                            <CheckCircle size={12} /> Pago
                          </span>
                        )}
                        {status === 'atrasado' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200 animate-pulse">
                            <AlertCircle size={12} /> Atrasado
                          </span>
                        )}
                        {status === 'pendente' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                            <Clock size={12} /> A vencer
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                         <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                abrirPreview(parcela);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver Detalhes"
                         >
                            <Eye size={18} />
                         </button>

                        {status !== 'pago' && (
                          <button 
                            onClick={(e) => abrirModalRecebimento(e, parcela.id, parcela.valor)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-1"
                          >
                            <DollarSign size={14} />
                            Receber
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* --- RODAPÉ COM PAGINAÇÃO --- */}
        {parcelasFiltradas.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Mostrando <span className="font-medium text-gray-900">{inicio + 1}</span> a <span className="font-medium text-gray-900">{Math.min(fim, parcelasFiltradas.length)}</span> de <span className="font-medium text-gray-900">{parcelasFiltradas.length}</span> resultados
            </p>
            
            <div className="flex items-center gap-2">
              <button
                onClick={paginaAnterior}
                disabled={paginaAtual === 1}
                className="p-2 border border-gray-300 bg-white rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-600"
                title="Página Anterior"
              >
                <ChevronLeft size={16} />
              </button>
              
              <span className="text-sm font-medium text-gray-700 px-2">
                Página {paginaAtual} de {totalPaginas}
              </span>

              <button
                onClick={proximaPagina}
                disabled={paginaAtual === totalPaginas}
                className="p-2 border border-gray-300 bg-white rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-600"
                title="Próxima Página"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAIS E DRAWERS --- */}
      <ConfirmPaymentModal
        isOpen={!!parcelaSelecionadaBaixa}
        onClose={() => setParcelaSelecionadaBaixa(null)}
        onConfirm={confirmarBaixa}
        valor={parcelaSelecionadaBaixa?.valor || 0}
        loading={loadingBaixa}
      />

      <SaleDetailsDrawer 
        isOpen={!!parcelaPreview}
        onClose={() => setParcelaPreview(null)}
        parcela={parcelaPreview}
      />
    </div>
  );
}