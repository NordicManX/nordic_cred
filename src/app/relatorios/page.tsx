"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/src/lib/supabase";
import { 
  FileText, Download, TrendingUp, AlertTriangle, ChevronDown, FileSpreadsheet, File, Loader2, Filter, Printer, RefreshCw, Trophy 
} from "lucide-react";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function RelatoriosPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  
  // Filtros
  const [periodo, setPeriodo] = useState("mes");
  const [filtroPagamento, setFiltroPagamento] = useState("todos"); 
  const [tabAtiva, setTabAtiva] = useState("vendas");
  
  // Configuração de Pontos
  const [config, setConfig] = useState<any>(null);

  // Controle Menu Exportar
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  
  // Dados
  const [listaVendas, setListaVendas] = useState<any[]>([]);
  const [dadosPagamento, setDadosPagamento] = useState<any[]>([]);
  const [inadimplencia, setInadimplencia] = useState<any[]>([]);
  
  // Resumo com PONTOS
  const [resumo, setResumo] = useState({ 
      total: 0, 
      qtd: 0, 
      ticketMedio: 0, 
      totalPontos: 0 // <--- NOVO CAMPO
  });

  // Cores do Gráfico
  const CORES_PAGAMENTO: Record<string, string> = {
    'pix': '#10b981',      
    'dinheiro': '#84cc16', 
    'credito': '#3b82f6',  
    'debito': '#f59e0b',   
    'crediario': '#ef4444',
    'outros': '#6b7280'    
  };

  const getCorPagamento = (nome: string) => {
     const key = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
     if (key.includes('pix')) return CORES_PAGAMENTO['pix'];
     if (key.includes('dinheiro')) return CORES_PAGAMENTO['dinheiro'];
     if (key.includes('credito')) return CORES_PAGAMENTO['credito'];
     if (key.includes('debito')) return CORES_PAGAMENTO['debito'];
     if (key.includes('crediario')) return CORES_PAGAMENTO['crediario'];
     return CORES_PAGAMENTO['outros'];
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    
    // Carregar configuração de pontos ao iniciar
    fetchConfig();

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchConfig() {
      const { data } = await supabase.from('configuracoes').select('*').single();
      setConfig(data);
  }

  // Atualiza quando muda período, aba ou filtro
  useEffect(() => {
    carregarRelatorio();
  }, [periodo, tabAtiva, filtroPagamento]); 

  async function carregarRelatorio() {
    setLoading(true);
    
    const hoje = new Date();
    let dataInicio = startOfDay(hoje);
    let dataFim = endOfDay(hoje);

    if (periodo === "7dias") dataInicio = subDays(hoje, 7);
    if (periodo === "30dias") dataInicio = subDays(hoje, 30);
    if (periodo === "mes") dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    const inicioISO = dataInicio.toISOString();
    const fimISO = dataFim.toISOString();

    try {
        const { data: vendasBrutas } = await supabase
            .from("vendas")
            .select("*, clientes(nome)")
            .gte("data_venda", inicioISO)
            .lte("data_venda", fimISO)
            .order("data_venda", { ascending: false });

        if (vendasBrutas) {
            
            // --- FILTRAGEM NO FRONTEND ---
            const vendasFiltradas = vendasBrutas.filter(v => {
                if (filtroPagamento === 'todos') return true;
                let formaBanco = (v.forma_pagamento || "").toUpperCase().trim();
                if (formaBanco === 'AVISTA' || formaBanco === 'À VISTA') formaBanco = 'DINHEIRO';
                return formaBanco === filtroPagamento.toUpperCase();
            });

            // Adiciona cálculo de pontos em cada venda
            const vendasComPontos = vendasFiltradas.map(v => {
                const fator = config?.pontos_por_real || 1;
                const pontos = Math.floor(v.valor_total * fator);
                return { ...v, pontos_gerados: pontos };
            });

            setListaVendas(vendasComPontos);

            // Recalcula Resumo com PONTOS
            const total = vendasComPontos.reduce((acc, v) => acc + v.valor_total, 0);
            const totalPontos = vendasComPontos.reduce((acc, v) => acc + (v.pontos_gerados || 0), 0);
            const qtd = vendasComPontos.length;
            
            setResumo({ 
                total, 
                qtd, 
                ticketMedio: qtd > 0 ? total / qtd : 0,
                totalPontos // <--- Salva no estado
            });

            // Processamento Gráfico
            const porPagamento = vendasComPontos.reduce((acc: any, curr) => {
                let forma = (curr.forma_pagamento || "Outros").toUpperCase().trim();
                if (forma === 'AVISTA' || forma === 'À VISTA') forma = 'DINHEIRO';
                acc[forma] = (acc[forma] || 0) + curr.valor_total;
                return acc;
            }, {});
            
            const arrayPagamento = Object.keys(porPagamento).map(key => ({
                name: key,
                value: porPagamento[key]
            }));
            
            arrayPagamento.sort((a, b) => b.value - a.value);
            setDadosPagamento(arrayPagamento);

        } else {
            setListaVendas([]);
            setDadosPagamento([]);
            setResumo({ total: 0, qtd: 0, ticketMedio: 0, totalPontos: 0 });
        }

        if (tabAtiva === 'financeiro') {
            const { data: parcelas } = await supabase
                .from("parcelas")
                .select("*, vendas(clientes(nome, telefone))")
                .eq("status", "pendente")
                .lt("data_vencimento", new Date().toISOString())
                .order("data_vencimento", { ascending: true });
            
            setInadimplencia(parcelas || []);
        }

    } catch (error) {
        console.error("Erro relatórios:", error);
    } finally {
        setLoading(false);
    }
  }

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // --- FUNÇÕES DE REIMPRESSÃO ---
  const reimprimirCupom = (id: string) => {
      // O terceiro argumento 'width=...' força o navegador a abrir como POPUP
      window.open(`/imprimir/recibo/${id}`, 'Recibo', 'width=400,height=600,scrollbars=yes');
  }

  const exportToExcel = () => {
    const dadosFormatados = listaVendas.map(v => ({
        ID: v.id.slice(0, 8),
        Data: new Date(v.data_venda).toLocaleDateString('pt-BR'),
        Cliente: v.clientes?.nome || "Consumidor Final",
        Valor: v.valor_total,
        Pontos: v.pontos_gerados, // <--- Inclui no Excel
        Pagamento: v.forma_pagamento?.toUpperCase() === 'AVISTA' ? 'DINHEIRO' : v.forma_pagamento?.toUpperCase()
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendas");
    XLSX.writeFile(workbook, `Relatorio_${periodo}_${filtroPagamento}.xlsx`);
    setShowExportMenu(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Relatório Gerencial - NordicCred", 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: ${periodo} | Pontos Gerados: ${resumo.totalPontos}`, 14, 28);

    const tableData = listaVendas.map(v => [
        new Date(v.data_venda).toLocaleDateString('pt-BR'),
        v.clientes?.nome || "Consumidor",
        formatCurrency(v.valor_total),
        v.pontos_gerados + " pts"
    ]);

    autoTable(doc, {
        startY: 35,
        head: [['Data', 'Cliente', 'Valor', 'Pontos']],
        body: tableData,
    });

    doc.save(`Relatorio_${periodo}.pdf`);
    setShowExportMenu(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Header e Filtros */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="text-blue-600" /> Relatórios
            </h1>
            <p className="text-sm text-gray-500">
               Visualize métricas e pontos de fidelidade
            </p>
        </div>

        <div className="flex flex-wrap gap-2 relative items-center">
            
            <button 
                onClick={carregarRelatorio} 
                className="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium rounded-lg text-sm px-4 h-10 transition-colors"
                title="Montar relatório na hora"
            >
                {loading ? <Loader2 className="animate-spin" size={16}/> : <RefreshCw size={16}/>}
                Atualizar
            </button>

            <select 
                value={periodo} 
                onChange={(e) => setPeriodo(e.target.value)}
                disabled={loading}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg p-2.5 h-10 cursor-pointer"
            >
                <option value="hoje">Hoje</option>
                <option value="7dias">7 Dias</option>
                <option value="30dias">30 Dias</option>
                <option value="mes">Este Mês</option>
            </select>

            <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none text-gray-500">
                    <Filter size={14} />
                </div>
                <select 
                    value={filtroPagamento} 
                    onChange={(e) => setFiltroPagamento(e.target.value)}
                    disabled={loading}
                    className="pl-8 bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg p-2.5 h-10 uppercase cursor-pointer"
                >
                    <option value="todos">Todos</option>
                    <option value="crediario">Crediário</option>
                    <option value="credito">Crédito</option>
                    <option value="debito">Débito</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">Pix</option>
                </select>
            </div>

            <div ref={exportMenuRef} className="relative">
                <button 
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white font-medium rounded-lg text-sm px-4 h-10 transition-colors shadow-md"
                >
                    <Download size={16} /> Exportar
                    <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                </button>

                {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
                        <button onClick={exportToExcel} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 border-b border-gray-100">
                            <FileSpreadsheet size={16} className="text-green-600" /> Excel
                        </button>
                        <button onClick={exportToPDF} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700">
                            <File size={16} className="text-red-600" /> PDF
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <ul className="flex flex-wrap -mb-px text-sm font-medium text-center text-gray-500">
            {[
                { id: 'vendas', label: 'Vendas & Fidelidade', icon: TrendingUp },
                { id: 'financeiro', label: 'Inadimplência', icon: AlertTriangle },
            ].map((tab) => (
                <li key={tab.id} className="mr-2">
                    <button
                        onClick={() => setTabAtiva(tab.id)}
                        className={`inline-flex items-center gap-2 p-4 border-b-2 rounded-t-lg group transition-colors ${
                            tabAtiva === tab.id ? 'text-blue-600 border-blue-600 active' : 'border-transparent hover:text-gray-600'
                        }`}
                    >
                        <tab.icon size={18} /> {tab.label}
                    </button>
                </li>
            ))}
        </ul>
      </div>

      {loading && <div className="w-full h-32 flex items-center justify-center text-blue-600 gap-2"><Loader2 className="animate-spin" /> Gerando relatório...</div>}

      {!loading && tabAtiva === 'vendas' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
              
              {/* CARDS DE RESUMO (Incluindo Fidelidade) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase">Faturamento</p>
                      <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(resumo.total)}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase">Vendas</p>
                      <h3 className="text-2xl font-bold text-gray-900 mt-1">{resumo.qtd}</h3>
                  </div>
                  <div className="bg-purple-50 p-6 rounded-xl border border-purple-200 shadow-sm relative overflow-hidden">
                      <p className="text-xs font-bold text-purple-700 uppercase flex items-center gap-1"><Trophy size={14}/> Pontos Gerados</p>
                      <h3 className="text-2xl font-bold text-purple-900 mt-1">{resumo.totalPontos.toLocaleString('pt-BR')} pts</h3>
                      <Trophy className="absolute -bottom-4 -right-4 text-purple-200 opacity-50" size={64} />
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase">Ticket Médio</p>
                      <h3 className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(resumo.ticketMedio)}</h3>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico */}
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm min-h-[350px] flex flex-col">
                      <h3 className="font-bold text-gray-800 mb-6">Meios de Pagamento</h3>
                      {dadosPagamento.length > 0 ? (
                        <div className="flex-1 w-full min-h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={dadosPagamento} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                                        {dadosPagamento.map((entry, index) => <Cell key={`cell-${index}`} fill={getCorPagamento(entry.name)} />)}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                      ) : <div className="flex-1 flex items-center justify-center text-gray-400">Sem dados</div>}
                  </div>

                  {/* Tabela Detalhada com PONTOS */}
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-6">Detalhamento</h3>
                      <div className="overflow-x-auto max-h-[350px] custom-scrollbar">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Data</th>
                                    <th className="px-4 py-3 font-semibold">Cliente</th>
                                    <th className="px-4 py-3 text-right font-semibold">Valor</th>
                                    <th className="px-4 py-3 text-right font-semibold text-purple-700">Pontos</th>
                                    <th className="px-4 py-3 text-center">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {listaVendas.map((v) => (
                                    <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-gray-600 text-xs">{new Date(v.data_venda).toLocaleDateString('pt-BR')}</td>
                                        <td className="px-4 py-3 font-medium text-gray-800 truncate max-w-[120px]">{v.clientes?.nome || "Consumidor"}</td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(v.valor_total)}</td>
                                        <td className="px-4 py-3 text-right font-bold text-purple-600">{v.pontos_gerados}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button onClick={() => reimprimirCupom(v.id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Reimprimir Cupom">
                                                <Printer size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {listaVendas.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Sem dados</td></tr>}
                            </tbody>
                        </table>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* CONTEÚDO: INADIMPLÊNCIA */}
      {!loading && tabAtiva === 'financeiro' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-4">
                  <div className="bg-red-100 p-3 rounded-full"><AlertTriangle className="text-red-600" size={24} /></div>
                  <div>
                    <h3 className="text-lg font-bold text-red-700">Relatório de Inadimplência</h3>
                    <p className="text-red-600 text-sm mt-1">Listagem de todas as parcelas vencidas até hoje.</p>
                    <div className="mt-4 text-3xl font-bold text-red-800">{formatCurrency(inadimplencia.reduce((acc, p) => acc + p.valor, 0))}</div>
                  </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                          <tr><th className="px-6 py-3">Cliente</th><th className="px-6 py-3">Vencimento</th><th className="px-6 py-3">Contato</th><th className="px-6 py-3 text-right">Valor</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {inadimplencia.map((p) => (
                              <tr key={p.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 font-bold text-gray-900">{p.vendas?.clientes?.nome || "Consumidor"}</td>
                                  <td className="px-6 py-4 text-red-600 font-medium">{new Date(p.data_vencimento).toLocaleDateString('pt-BR')}</td>
                                  <td className="px-6 py-4 text-gray-500">{p.vendas?.clientes?.telefone || "-"}</td>
                                  <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(p.valor)}</td>
                              </tr>
                          ))}
                          {inadimplencia.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-green-600 font-medium">Nenhuma pendência vencida! 🎉</td></tr>}
                      </tbody>
                  </table>
              </div>
          </div>
      )}
    </div>
  );
}