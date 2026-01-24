"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/lib/supabase";
import { Parcela } from "@/src/types";
import { ConfirmPaymentModal } from "@/src/components/ConfirmPaymentModal";
import { SaleDetailsDrawer } from "@/src/components/SaleDetailsDrawer";
import { PaymentSuccessModal } from "@/src/components/PaymentSuccessModal";
import { Pagination } from "@/src/components/Pagination";
import {
  Search, CheckCircle, Calendar, DollarSign, Loader2,
  ChevronDown, Wallet, ShoppingBag, Package, Eye, Printer, FileText
} from "lucide-react";
import { toast } from "sonner";
import { format, isBefore, parseISO } from "date-fns";

// --- INTERFACES ---
interface VendaAgrupada {
  vendaId: string;
  dataVenda: string;
  resumoProdutos: string;
  totalVenda: number;
  totalRestante: number;
  parcelas: any[];
}

interface ClienteGroup {
  clienteId: string;
  nome: string;
  cpf: string;
  telefone?: string;
  vendas: VendaAgrupada[];
  totalDevendoGeral: number;
}

export default function ContasReceberPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);

  const [clientesAgrupados, setClientesAgrupados] = useState<ClienteGroup[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'pago'>('todos');
  const [clienteExpandido, setClienteExpandido] = useState<string | null>(null);
  const [vendasExpandidas, setVendasExpandidas] = useState<string[]>([]);

  // PAGINAÇÃO
  const [pagina, setPagina] = useState(1);
  const ITENS_POR_PAGINA = 5;

  const [parcelaSelecionadaBaixa, setParcelaSelecionadaBaixa] = useState<any | null>(null);
  const [loadingBaixa, setLoadingBaixa] = useState(false);
  const [parcelaPreview, setParcelaPreview] = useState<Parcela | null>(null);
  const [dadosSucesso, setDadosSucesso] = useState<any | null>(null);
  const [modalSucessoOpen, setModalSucessoOpen] = useState(false);

  useEffect(() => {
    fetchContas();
  }, []);

  useEffect(() => {
    setPagina(1);
  }, [busca, filtroStatus]);

  async function fetchContas() {
    setLoading(true);
    const { data, error } = await supabase
      .from("parcelas")
      .select(`
        *,
        clientes:clientes!fk_parcelas_clientes_oficial (id, nome, cpf, telefone),
        vendas:vendas!fk_parcelas_vendas_oficial (
          id, 
          data_venda,
          itens_venda:itens_venda!fk_venda_item_oficial (
            produto_nome,
            produtos (nome)
          )
        )
      `)
      .order("data_vencimento", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar dados");
    } else {
      agruparDados(data || []);
    }
    setLoading(false);
  }

  function agruparDados(listaParcelas: any[]) {
    const gruposClientes: Record<string, ClienteGroup> = {};

    listaParcelas.forEach((p) => {
      if (!p.clientes) return;
      const cliId = p.clientes.id;
      const vendaId = p.vendas?.id || 'avulso';

      if (!gruposClientes[cliId]) {
        gruposClientes[cliId] = {
          clienteId: cliId,
          nome: p.clientes.nome,
          cpf: p.clientes.cpf || "---",
          telefone: p.clientes.telefone,
          vendas: [],
          totalDevendoGeral: 0
        };
      }
      if (p.status === 'pendente') gruposClientes[cliId].totalDevendoGeral += p.valor;

      let grupoVenda = gruposClientes[cliId].vendas.find(v => v.vendaId === vendaId);
      if (!grupoVenda) {
        const itens = p.vendas?.itens_venda || [];
        const nomesProds = itens.map((item: any) => item.produto_nome || item.produtos?.nome || "Item").filter(Boolean).join(", ") || "Venda Avulsa";
        grupoVenda = {
          vendaId: vendaId,
          dataVenda: p.vendas?.data_venda || p.created_at,
          resumoProdutos: nomesProds,
          totalVenda: 0, totalRestante: 0, parcelas: []
        };
        gruposClientes[cliId].vendas.push(grupoVenda);
      }
      grupoVenda.parcelas.push(p);
      grupoVenda.totalVenda += p.valor;
      if (p.status === 'pendente') grupoVenda.totalRestante += p.valor;
    });

    const arrayFinal = Object.values(gruposClientes)
      .sort((a, b) => b.totalDevendoGeral - a.totalDevendoGeral)
      .map(cli => {
        cli.vendas.sort((a, b) => new Date(b.dataVenda).getTime() - new Date(a.dataVenda).getTime());
        return cli;
      });

    setClientesAgrupados(arrayFinal);
  }

  const imprimirCarne = (e: React.MouseEvent, vendaId: string) => {
    e.stopPropagation();
    const w = 900, h = 800;
    window.open(`/imprimir/carne/${vendaId}`, '', `width=${w},height=${h},top=100,left=100`);
  };

  const imprimirRecibo = (e: React.MouseEvent, pid: string) => {
    e.stopPropagation();
    const w = 800, h = 600;
    window.open(`/imprimir/recibo/${pid}`, '', `width=${w},height=${h},top=100,left=100`);
  };

  const toggleCliente = (id: string) => setClienteExpandido(prev => prev === id ? null : id);
  const toggleVenda = (vid: string) => setVendasExpandidas(prev => prev.includes(vid) ? prev.filter(i => i !== vid) : [...prev, vid]);
  const abrirModalRecebimento = (e: any, p: any) => { e.stopPropagation(); setParcelaSelecionadaBaixa(p); };

  const confirmarBaixa = async () => {
    if (!parcelaSelecionadaBaixa) return;
    setLoadingBaixa(true);
    const { error } = await supabase.from("parcelas").update({ status: "pago", data_pagamento: new Date().toISOString() }).eq("id", parcelaSelecionadaBaixa.id);
    if (error) toast.error("Erro ao processar baixa");
    else {
      toast.success("Pagamento recebido!");
      fetchContas();
      setParcelaSelecionadaBaixa(null);
      setModalSucessoOpen(true);
    }
    setLoadingBaixa(false);
  };

  const listaFiltradaCompleta = clientesAgrupados.filter(cli => {
    if (cli.nome === 'Consumidor Final' && cli.totalDevendoGeral === 0) return false;
    const matchNome = cli.nome.toLowerCase().includes(busca.toLowerCase());
    let matchStatus = true;
    if (filtroStatus === 'pendente') matchStatus = cli.totalDevendoGeral > 0;
    if (filtroStatus === 'pago') matchStatus = cli.totalDevendoGeral === 0;
    return matchNome && matchStatus;
  });

  const totalGeralReceber = clientesAgrupados.reduce((acc, c) => acc + c.totalDevendoGeral, 0);

  const totalItems = listaFiltradaCompleta.length;
  const totalPaginas = Math.ceil(totalItems / ITENS_POR_PAGINA);
  const startIndex = (pagina - 1) * ITENS_POR_PAGINA;
  const listaPaginada = listaFiltradaCompleta.slice(startIndex, startIndex + ITENS_POR_PAGINA);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h1 className="text-2xl font-bold">Carteira de Clientes</h1><p className="text-gray-500 text-sm">Visão agrupada por vendas.</p></div>
        <div className="bg-white px-4 py-2 rounded-lg border shadow-sm flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-full text-blue-600"><Wallet size={18} /></div>
          <div><p className="text-xs text-gray-500 font-bold uppercase">Total a Receber</p><p className="text-lg font-bold">{totalGeralReceber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Buscar cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFiltroStatus('todos')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filtroStatus === 'todos' ? 'bg-gray-800 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>Todos</button>
          <button onClick={() => setFiltroStatus('pendente')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filtroStatus === 'pendente' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>Com Débito</button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400"><Loader2 className="animate-spin inline mr-2" /> Carregando carteira...</div>
        ) : totalItems === 0 ? (
          <div className="text-center py-12 text-gray-400 border border-dashed rounded-xl bg-gray-50">Nenhum registro encontrado.</div>
        ) : (
          <>
            {listaPaginada.map((cli) => {
              const isClientExpanded = clienteExpandido === cli.clienteId;
              return (
                <div key={cli.clienteId} className={`bg-white rounded-xl border transition-all duration-200 ${isClientExpanded ? 'border-blue-400 shadow-md ring-1 ring-blue-50' : 'border-gray-200 shadow-sm hover:border-gray-300'}`}>
                  <div onClick={() => toggleCliente(cli.clienteId)} className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${cli.totalDevendoGeral > 0 ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>{cli.nome.charAt(0)}</div>
                      <div><h3 className="font-bold text-gray-900 text-lg">{cli.nome}</h3><p className="text-xs text-gray-500">{cli.vendas.length} compras registradas</p></div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block"><p className="text-[10px] text-gray-400 uppercase font-bold">Saldo Devedor</p><p className={`text-lg font-bold ${cli.totalDevendoGeral > 0 ? 'text-gray-900' : 'text-green-600'}`}>{cli.totalDevendoGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                      <div className={`transition-transform duration-200 ${isClientExpanded ? 'rotate-180' : ''}`}><ChevronDown className="text-gray-400" /></div>
                    </div>
                  </div>

                  {isClientExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3 animate-in slide-in-from-top-2">
                      {cli.vendas.map(venda => {
                        const isSaleExpanded = vendasExpandidas.includes(venda.vendaId);
                        return (
                          <div key={venda.vendaId} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                            <div onClick={() => toggleVenda(venda.vendaId)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0"><ShoppingBag size={18} /></div>
                                <div className="min-w-0">
                                  <span className="font-bold text-sm text-gray-800">Venda #{venda.vendaId.slice(0, 6).toUpperCase()}</span>
                                  <p className="text-xs text-gray-500 truncate mt-0.5"><Package size={12} className="inline mr-1 mb-0.5" />{venda.resumoProdutos}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                {/* Botão Imprimir Carnê Ajustado */}
                                <button
                                  onClick={(e) => imprimirCarne(e, venda.vendaId)}
                                  className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                >
                                  <Printer size={14} />
                                  <span>CARNÊ</span>
                                </button>

                                <div className="text-right border-l pl-4 hidden xs:block">
                                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Total</span>
                                  <span className="font-bold text-sm text-gray-700">{venda.totalVenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isSaleExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </div>

                            {isSaleExpanded && (
                              <div className="border-t border-gray-100 bg-gray-50/50">
                                <table className="w-full text-left text-sm">
                                  <thead className="text-gray-400 text-[10px] uppercase bg-gray-50 border-b">
                                    <tr>
                                      <th className="px-4 py-2 font-semibold">Vencimento</th>
                                      <th className="px-4 py-2 font-semibold">Parcela</th>
                                      <th className="px-4 py-2 font-semibold">Valor</th>
                                      <th className="px-4 py-2 font-semibold text-right">Ação</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {venda.parcelas.sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()).map(p => {
                                      const atrasada = p.status === 'pendente' && isBefore(parseISO(p.data_vencimento), new Date());
                                      return (
                                        <tr key={p.id} className="bg-white hover:bg-gray-50/80 transition-colors">
                                          <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 text-gray-600">
                                              <Calendar size={14} className="text-gray-400" />
                                              {format(parseISO(p.data_vencimento), "dd/MM/yyyy")}
                                              {atrasada && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold border border-red-200 uppercase">Atrasado</span>}
                                            </div>
                                          </td>
                                          <td className="px-4 py-3 text-gray-500">{p.numero_parcela}ª Parc.</td>
                                          <td className="px-4 py-3 font-bold text-gray-900">{p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                          <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                              {/* Ícone de Recibo pequeno para parcelas pagas */}
                                              {p.status === 'pago' && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Abre em uma janela popup específica de 400px para não zoar o layout
                                                    window.open(`/imprimir/recibo/${p.id}`, 'Recibo', 'width=400,height=600');
                                                  }}
                                                  className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                                  title="Imprimir Recibo"
                                                >
                                                  <FileText size={16} />
                                                </button>
                                              )}

                                              {/* Botão de Receber ou Status Pago */}
                                              {p.status === 'pendente' ? (
                                                <button
                                                  onClick={(e) => abrirModalRecebimento(e, p)}
                                                  className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold"
                                                >
                                                  $ Receber
                                                </button>
                                              ) : (
                                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">
                                                  PAGO
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-4">
              <Pagination
                currentPage={pagina}
                totalPages={totalPaginas}
                onPageChange={setPagina}
                totalItems={totalItems}
                itemsPerPage={ITENS_POR_PAGINA}
              />
            </div>
          </>
        )}
      </div>

      <ConfirmPaymentModal isOpen={!!parcelaSelecionadaBaixa} onClose={() => setParcelaSelecionadaBaixa(null)} onConfirm={confirmarBaixa} valor={parcelaSelecionadaBaixa?.valor || 0} loading={loadingBaixa} />
      <SaleDetailsDrawer isOpen={!!parcelaPreview} onClose={() => setParcelaPreview(null)} parcela={parcelaPreview} />
      <PaymentSuccessModal isOpen={modalSucessoOpen} onClose={() => setModalSucessoOpen(false)} dados={dadosSucesso} />
    </div>
  );
}