"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/lib/supabase";
import { 
  Search, Calendar, ShoppingBag, Eye, Printer, Filter, X, Loader2, ArrowRight
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { VendaSucessoModal } from "@/src/components/VendaSucessoModal";

export default function HistoricoVendasPage() {
  const supabase = createClient();
  
  // Estados
  const [vendas, setVendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [busca, setBusca] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // Modais
  const [vendaSelecionada, setVendaSelecionada] = useState<any | null>(null);
  
  // Estado para Reimpressão (Usa o mesmo modal de sucesso)
  const [modalImpressaoOpen, setModalImpressaoOpen] = useState(false);
  const [idParaImpressao, setIdParaImpressao] = useState<string | null>(null);

  useEffect(() => {
    fetchVendas();
  }, [dataInicio, dataFim]);

  async function fetchVendas() {
    setLoading(true);
    
    // Query poderosa: Traz a Venda + Dados do Cliente + Itens da Venda
    let query = supabase
      .from("vendas")
      .select(`
        *,
        clientes (id, nome),
        itens_venda (
          produto_nome,
          quantidade,
          valor_unitario
        )
      `)
      .order("created_at", { ascending: false }); // Mais recentes primeiro

    // Aplica filtros de data se selecionados no banco
    if (dataInicio) query = query.gte('created_at', `${dataInicio}T00:00:00`);
    if (dataFim) query = query.lte('created_at', `${dataFim}T23:59:59`);

    const { data, error } = await query;

    if (error) {
      console.error(error);
      toast.error("Erro ao carregar histórico.");
    } else {
      setVendas(data || []);
    }
    setLoading(false);
  }

  // Filtro de Busca (Nome do Cliente) no Front-end
  const vendasFiltradas = vendas.filter(v => {
    const nomeCliente = v.clientes?.nome || "Consumidor Final";
    return nomeCliente.toLowerCase().includes(busca.toLowerCase());
  });

  // Cálculo de totais
  const totalPeriodo = vendasFiltradas.reduce((acc, v) => acc + v.valor_total, 0);

  // Ações
  const handleImprimir = (id: string) => {
    setIdParaImpressao(id);
    setModalImpressaoOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Histórico de Vendas</h1>
          <p className="text-gray-500 text-sm">Visualize vendas de balcão e crediário.</p>
        </div>
        
        <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-full text-blue-600"><ShoppingBag size={18} /></div>
          <div>
             <p className="text-xs text-gray-500 uppercase font-bold">Total Listado</p>
             <p className="text-lg font-bold text-gray-900">
               {totalPeriodo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
             </p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="text-xs font-bold text-gray-500 mb-1 block">Buscar Cliente</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Ex: Maria, João ou Consumidor..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">De</label>
            <input 
              type="date" 
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">Até</label>
            <input 
              type="date" 
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <button 
            onClick={fetchVendas}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors h-[40px]"
        >
            <Filter size={16} /> Atualizar
        </button>
      </div>

      {/* Tabela de Vendas */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">Data</th>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Pagamento</th>
                <th className="px-6 py-4 font-medium">Valor</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-500"/></td></tr>
              ) : vendasFiltradas.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-400">Nenhuma venda encontrada no período.</td></tr>
              ) : (
                  vendasFiltradas.map((venda) => (
                      <tr key={venda.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-gray-600">
                              <div className="flex items-center gap-2">
                                  <Calendar size={14} className="text-gray-400"/>
                                  {format(parseISO(venda.created_at), "dd/MM/yyyy HH:mm")}
                              </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-900">
                              {venda.clientes?.nome || "Consumidor Final"}
                          </td>
                          <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                                  venda.forma_pagamento === 'crediario' 
                                  ? 'bg-orange-50 text-orange-600 border-orange-100' 
                                  : 'bg-green-50 text-green-600 border-green-100'
                              }`}>
                                  {venda.forma_pagamento}
                              </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-900">
                              {venda.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="px-6 py-4 text-right flex justify-end gap-2">
                              <button 
                                  onClick={() => setVendaSelecionada(venda)}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Ver Itens"
                              >
                                  <Eye size={18} />
                              </button>
                              <button 
                                  onClick={() => handleImprimir(venda.id)}
                                  className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Recibo"
                              >
                                  <Printer size={18} />
                              </button>
                          </td>
                      </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Detalhes da Venda (Visualização Rápida) */}
      {vendaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Detalhes da Venda</h3>
                    <button onClick={() => setVendaSelecionada(null)}><X size={20} className="text-gray-400 hover:text-red-500"/></button>
                </div>
                <div className="p-6">
                    <div className="space-y-1 mb-4 text-sm">
                        <p className="text-gray-500">Cliente: <strong className="text-gray-900">{vendaSelecionada.clientes?.nome || "Consumidor Final"}</strong></p>
                        <p className="text-gray-500">Data: <strong className="text-gray-900">{format(parseISO(vendaSelecionada.created_at), "dd/MM/yyyy HH:mm")}</strong></p>
                    </div>
                    
                    <div className="border rounded-lg overflow-hidden mb-4">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 border-b">
                                <tr>
                                    <th className="text-left py-2 px-3">Item</th>
                                    <th className="text-center py-2 px-3">Qtd</th>
                                    <th className="text-right py-2 px-3">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {vendaSelecionada.itens_venda?.map((item: any, idx: number) => (
                                    <tr key={idx}>
                                        <td className="py-2 px-3 text-gray-700">{item.produto_nome}</td>
                                        <td className="py-2 px-3 text-center text-gray-500">{item.quantidade}</td>
                                        <td className="py-2 px-3 text-right font-medium text-gray-900">
                                            {(item.quantidade * item.valor_unitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t">
                        <span className="font-bold text-gray-500">TOTAL PAGO</span>
                        <span className="font-bold text-xl text-green-600">
                            {vendaSelecionada.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* MODAL: Reimpressão (Usa o componente de sucesso oculto para gerar a impressão) */}
      <VendaSucessoModal 
        isOpen={modalImpressaoOpen}
        onClose={() => setModalImpressaoOpen(false)}
        vendaId={idParaImpressao}
        // Passamos 'avista' fixo apenas para o componente não quebrar, 
        // já que o foco aqui é abrir a janela de impressão
        tipoVenda="avista" 
      />

    </div>
  );
}