"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/src/lib/supabase";
import { 
  FileText, Download, TrendingUp, AlertTriangle, ChevronDown, FileSpreadsheet, File, Loader2, Filter 
} from "lucide-react";
import { startOfDay, endOfDay, subDays, format } from "date-fns";
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
  const [filtroPagamento, setFiltroPagamento] = useState("todos"); // <--- NOVO FILTRO
  const [tabAtiva, setTabAtiva] = useState("vendas");
  
  // Controle Menu Exportar
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  
  // Dados
  const [listaVendas, setListaVendas] = useState<any[]>([]);
  const [dadosPagamento, setDadosPagamento] = useState<any[]>([]);
  const [inadimplencia, setInadimplencia] = useState<any[]>([]);
  const [resumo, setResumo] = useState({ total: 0, qtd: 0, ticketMedio: 0 });

  // Cores
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Atualiza quando muda período, aba ou TIPO DE PAGAMENTO
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
            .lte("data_venda", fimISO);

        if (vendasBrutas) {
            
            // --- FILTRAGEM NO FRONTEND ---
            const vendasFiltradas = vendasBrutas.filter(v => {
                // Se for "todos", passa tudo
                if (filtroPagamento === 'todos') return true;

                // Normaliza o que veio do banco
                let formaBanco = (v.forma_pagamento || "").toUpperCase().trim();
                
                // Normaliza "AVISTA" para "DINHEIRO"
                if (formaBanco === 'AVISTA' || formaBanco === 'À VISTA') formaBanco = 'DINHEIRO';

                // Compara com o filtro selecionado
                return formaBanco === filtroPagamento.toUpperCase();
            });

            setListaVendas(vendasFiltradas);

            // Recalcula Resumo com base no FILTRO
            const total = vendasFiltradas.reduce((acc, v) => acc + v.valor_total, 0);
            const qtd = vendasFiltradas.length;
            setResumo({ 
                total, 
                qtd, 
                ticketMedio: qtd > 0 ? total / qtd : 0 
            });

            // Processamento Gráfico
            const porPagamento = vendasFiltradas.reduce((acc: any, curr) => {
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
            setResumo({ total: 0, qtd: 0, ticketMedio: 0 });
        }

        if (tabAtiva === 'financeiro') {
            const { data: parcelas } = await supabase
                .from("parcelas")
                .select("*, vendas(clientes(nome, telefone))")
                .eq("status", "pendente")
                .lt("data_vencimento", hoje.toISOString());
            
            setInadimplencia(parcelas || []);
        }

    } catch (error) {
        console.error("Erro relatórios:", error);
    } finally {
        setLoading(false);
    }
  }

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const exportToExcel = () => {
    const dadosFormatados = listaVendas.map(v => ({
        ID: v.id.slice(0, 8),
        Data: new Date(v.data_venda).toLocaleDateString('pt-BR'),
        Cliente: v.clientes?.nome || "Consumidor Final",
        Valor: v.valor_total,
        Pagamento: v.forma_pagamento?.toUpperCase() === 'AVISTA' ? 'DINHEIRO' : v.forma_pagamento?.toUpperCase(),
        Desconto: v.desconto || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendas");
    XLSX.writeFile(workbook, `Relatorio_Vendas_${periodo}_${filtroPagamento}.xlsx`);
    setShowExportMenu(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório Gerencial - NordicCred", 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: ${periodo} | Filtro: ${filtroPagamento.toUpperCase()}`, 14, 28);

    doc.setFillColor(240, 240, 240);
    doc.rect(14, 35, 60, 20, 'F');
    doc.setFontSize(8); doc.text("FATURAMENTO", 16, 40);
    doc.setFontSize(14); doc.text(formatCurrency(resumo.total), 16, 50);

    doc.rect(80, 35, 60, 20, 'F');
    doc.setFontSize(8); doc.text("VENDAS", 82, 40);
    doc.setFontSize(14); doc.text(resumo.qtd.toString(), 82, 50);

    const tableData = dadosPagamento.map(d => [
        d.name,
        formatCurrency(d.value),
        `${((d.value / resumo.total) * 100).toFixed(1)}%`
    ]);

    autoTable(doc, {
        startY: 75,
        head: [['Método', 'Valor Total', '%']],
        body: tableData,
    });

    doc.save(`Relatorio_PDF_${periodo}.pdf`);
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
               Dados filtrados por período e método
            </p>
        </div>

        <div className="flex flex-wrap gap-2 relative items-center">
            
            {/* 1. SELEÇÃO DE PERÍODO */}
            <select 
                value={periodo} 
                onChange={(e) => setPeriodo(e.target.value)}
                disabled={loading}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 outline-none cursor-pointer hover:bg-gray-100 transition-colors h-10"
            >
                <option value="hoje">Hoje</option>
                <option value="7dias">Últimos 7 Dias</option>
                <option value="30dias">Últimos 30 Dias</option>
                <option value="mes">Este Mês</option>
            </select>

            {/* 2. NOVO FILTRO DE PAGAMENTO */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none text-gray-500">
                    <Filter size={14} />
                </div>
                <select 
                    value={filtroPagamento} 
                    onChange={(e) => setFiltroPagamento(e.target.value)}
                    disabled={loading}
                    className="pl-8 bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 outline-none cursor-pointer hover:bg-gray-100 transition-colors h-10 uppercase"
                >
                    <option value="todos">Todos Métodos</option>
                    <option value="crediario">Crediário</option>
                    <option value="credito">Crédito</option>
                    <option value="debito">Débito</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">Pix</option>
                </select>
            </div>

            {/* 3. BOTÃO EXPORTAR */}
            <div ref={exportMenuRef} className="relative">
                <button 
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white font-medium rounded-lg text-sm px-4 h-10 transition-colors shadow-md"
                >
                    <Download size={16} /> Exportar
                    <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                </button>

                {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50 animate-in fade-in zoom-in-95 overflow-hidden">
                        <button 
                            onClick={exportToExcel}
                            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors border-b border-gray-100 text-left"
                        >
                            <FileSpreadsheet size={16} className="text-green-600" />
                            Exportar Excel
                        </button>
                        <button 
                            onClick={exportToPDF}
                            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors text-left"
                        >
                            <File size={16} className="text-red-600" />
                            Exportar PDF
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Navegação de Abas */}
      <div className="border-b border-gray-200">
        <ul className="flex flex-wrap -mb-px text-sm font-medium text-center text-gray-500">
            {[
                { id: 'vendas', label: 'Vendas & Pagamentos', icon: TrendingUp },
                { id: 'financeiro', label: 'Inadimplência', icon: AlertTriangle },
            ].map((tab) => (
                <li key={tab.id} className="mr-2">
                    <button
                        onClick={() => setTabAtiva(tab.id)}
                        className={`inline-flex items-center gap-2 p-4 border-b-2 rounded-t-lg group transition-colors ${
                            tabAtiva === tab.id 
                            ? 'text-blue-600 border-blue-600 active' 
                            : 'border-transparent hover:text-gray-600 hover:border-gray-300'
                        }`}
                    >
                        <tab.icon size={18} /> {tab.label}
                    </button>
                </li>
            ))}
        </ul>
      </div>

      {loading && (
          <div className="w-full h-32 flex items-center justify-center text-blue-600 gap-2">
              <Loader2 className="animate-spin" /> Atualizando gráficos...
          </div>
      )}

      {/* CONTEÚDO: VENDAS */}
      {!loading && tabAtiva === 'vendas' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Faturamento ({filtroPagamento})</p>
                      <h3 className="text-3xl font-bold text-gray-900 mt-2 tracking-tight">{formatCurrency(resumo.total)}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Qtd. Vendas</p>
                      <h3 className="text-3xl font-bold text-gray-900 mt-2 tracking-tight">{resumo.qtd}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Ticket Médio</p>
                      <h3 className="text-3xl font-bold text-blue-600 mt-2 tracking-tight">{formatCurrency(resumo.ticketMedio)}</h3>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Gráfico */}
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm min-h-[350px] flex flex-col">
                      <h3 className="font-bold text-gray-800 mb-6">Divisão por Meio de Pagamento</h3>
                      
                      {dadosPagamento.length > 0 ? (
                        <div className="flex-1 w-full min-h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={dadosPagamento}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {dadosPagamento.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={getCorPagamento(entry.name)} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400">
                            Nenhum dado para o filtro "{filtroPagamento.toUpperCase()}"
                        </div>
                      )}
                  </div>

                  {/* Tabela Detalhada */}
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-6">Detalhamento</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Método</th>
                                    <th className="px-4 py-3 text-right font-semibold">Valor Total</th>
                                    <th className="px-4 py-3 text-right font-semibold">%</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {dadosPagamento.map((d, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-4 font-medium flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCorPagamento(d.name) }}></div>
                                            {d.name}
                                        </td>
                                        <td className="px-4 py-4 text-right font-bold text-gray-900">{formatCurrency(d.value)}</td>
                                        <td className="px-4 py-4 text-right text-gray-500 font-medium">
                                            {((d.value / resumo.total) * 100).toFixed(1)}%
                                        </td>
                                    </tr>
                                ))}
                                {dadosPagamento.length === 0 && (
                                    <tr><td colSpan={3} className="text-center py-8 text-gray-400">Sem dados para exibir</td></tr>
                                )}
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
                  <div className="bg-red-100 p-3 rounded-full">
                    <AlertTriangle className="text-red-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-red-700">Relatório de Inadimplência</h3>
                    <p className="text-red-600 text-sm mt-1">
                        Listagem de todas as parcelas vencidas até hoje.
                    </p>
                    <div className="mt-4 text-3xl font-bold text-red-800">
                        {formatCurrency(inadimplencia.reduce((acc, p) => acc + p.valor, 0))}
                        <span className="text-sm font-normal text-red-600 ml-2">a receber (atrasado)</span>
                    </div>
                  </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                          <tr>
                              <th className="px-6 py-3">Cliente</th>
                              <th className="px-6 py-3">Vencimento</th>
                              <th className="px-6 py-3">Contato</th>
                              <th className="px-6 py-3 text-right">Valor Aberto</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {inadimplencia.map((p) => (
                              <tr key={p.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 font-bold text-gray-900">
                                      {p.vendas?.clientes?.nome || "Consumidor"}
                                  </td>
                                  <td className="px-6 py-4 text-red-600 font-medium">
                                      {new Date(p.data_vencimento).toLocaleDateString('pt-BR')}
                                  </td>
                                  <td className="px-6 py-4 text-gray-500">
                                      {p.vendas?.clientes?.telefone || "-"}
                                  </td>
                                  <td className="px-6 py-4 text-right font-bold text-gray-900">
                                      {formatCurrency(p.valor)}
                                  </td>
                              </tr>
                          ))}
                          {inadimplencia.length === 0 && (
                              <tr><td colSpan={4} className="text-center py-8 text-green-600 font-medium">Nenhuma pendência vencida! 🎉</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}
    </div>
  );
}