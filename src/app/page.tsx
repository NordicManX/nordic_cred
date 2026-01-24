"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/lib/supabase";
import { 
  DollarSign, Users, TrendingUp, AlertCircle, 
  Wallet, ArrowUpRight, ArrowDownRight, ShoppingBag, Loader2
} from "lucide-react";
import { startOfMonth, endOfMonth, format, isBefore, parseISO, eachDayOfInterval, getDate, isSameDay } from "date-fns";
import Link from "next/link";

export default function DashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  
  // KPIs (Indicadores)
  const [kpis, setKpis] = useState({
    vendasMes: 0,
    recebidoMes: 0,
    totalAReceber: 0,
    totalAtrasado: 0,
    novosClientes: 0
  });

  // Gráfico
  const [dadosGrafico, setDadosGrafico] = useState<{dia: number, valor: number}[]>([]);
  
  // Lista Recente
  const [ultimasVendas, setUltimasVendas] = useState<any[]>([]);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    const hoje = new Date();
    const inicioMes = startOfMonth(hoje).toISOString();
    const fimMes = endOfMonth(hoje).toISOString();

    try {
      // 1. BUSCAR VENDAS DO MÊS (Para Faturamento e Gráfico)
      const { data: vendasMes, error: errVendas } = await supabase
        .from("vendas")
        .select("created_at, valor_total")
        .gte("created_at", inicioMes)
        .lte("created_at", fimMes);

      if (errVendas) throw errVendas;

      // 2. BUSCAR PARCELAS (Para Recebimento, A Receber e Atraso)
      // Buscamos parcelas pagas este mês OU pendentes gerais
      const { data: parcelas, error: errParcelas } = await supabase
        .from("parcelas")
        .select("valor, status, data_pagamento, data_vencimento");

      if (errParcelas) throw errParcelas;

      // 3. BUSCAR NOVOS CLIENTES
      const { count: countClientes } = await supabase
        .from("clientes")
        .select("*", { count: 'exact', head: true })
        .gte("created_at", inicioMes)
        .neq("nome", "Consumidor Final"); // Ignora o consumidor padrão

      // 4. BUSCAR ÚLTIMAS VENDAS (Para tabela rápida)
      const { data: ultimas } = await supabase
        .from("vendas")
        .select("id, valor_total, created_at, clientes(nome)")
        .order("created_at", { ascending: false })
        .limit(5);

      // --- PROCESSAMENTO DOS DADOS ---

      // A. Faturamento (Soma das vendas do mês)
      const totalVendasMes = vendasMes?.reduce((acc, v) => acc + v.valor_total, 0) || 0;

      // B. Recebido Real (Parcelas pagas dentro deste mês)
      const totalRecebidoMes = parcelas
        ?.filter(p => p.status === 'pago' && p.data_pagamento >= inicioMes && p.data_pagamento <= fimMes)
        .reduce((acc, p) => acc + p.valor, 0) || 0;

      // C. A Receber (Tudo que está pendente no sistema)
      const totalPendencia = parcelas
        ?.filter(p => p.status === 'pendente')
        .reduce((acc, p) => acc + p.valor, 0) || 0;

      // D. Em Atraso (Pendente e vencido antes de hoje)
      const totalAtraso = parcelas
        ?.filter(p => p.status === 'pendente' && isBefore(parseISO(p.data_vencimento), hoje))
        .reduce((acc, p) => acc + p.valor, 0) || 0;

      setKpis({
        vendasMes: totalVendasMes,
        recebidoMes: totalRecebidoMes,
        totalAReceber: totalPendencia,
        totalAtrasado: totalAtraso,
        novosClientes: countClientes || 0
      });
      
      if (ultimas) setUltimasVendas(ultimas);

      // E. Montar Gráfico (Dia a Dia do Mês Atual)
      const diasDoMes = eachDayOfInterval({ start: startOfMonth(hoje), end: hoje }); // Até hoje
      const grafico = diasDoMes.map(dia => {
        const vendasDoDia = vendasMes?.filter(v => isSameDay(parseISO(v.created_at), dia)) || [];
        const totalDia = vendasDoDia.reduce((acc, v) => acc + v.valor_total, 0);
        return { dia: getDate(dia), valor: totalDia };
      });
      setDadosGrafico(grafico);

    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-blue-600 gap-2">
        <Loader2 className="animate-spin" /> Atualizando indicadores...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Visão geral de {format(new Date(), 'MMMM/yyyy')}</p>
        </div>
        <button 
          onClick={carregarDados} 
          className="text-sm text-blue-600 hover:underline cursor-pointer"
        >
          Atualizar dados
        </button>
      </div>

      {/* --- CARDS DE KPI --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Vendas (Volume) */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Vendas (Mês)</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">
                {kpis.vendasMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h3>
            </div>
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-gray-400">
            <span className="text-blue-600 font-bold flex items-center gap-1">
              <TrendingUp size={12}/> Volume
            </span>
            <span className="ml-2">Faturamento bruto</span>
          </div>
        </div>

        {/* 2. Recebimento (Caixa Real) */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Caixa (Recebido)</p>
              <h3 className="text-2xl font-bold text-green-600 mt-2">
                {kpis.recebidoMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h3>
            </div>
            <div className="bg-green-100 p-2 rounded-lg text-green-600">
              <Wallet size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-gray-400">
            <span className="text-green-600 font-bold flex items-center gap-1">
              <ArrowUpRight size={12}/> Entradas
            </span>
            <span className="ml-2">Efetivamente pago</span>
          </div>
        </div>

        {/* 3. A Receber (Carteira) */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">A Receber (Geral)</p>
              <h3 className="text-2xl font-bold text-blue-900 mt-2">
                {kpis.totalAReceber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h3>
            </div>
            <div className="bg-gray-100 p-2 rounded-lg text-gray-600">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-gray-400">
            <span className="text-gray-600 font-bold flex items-center gap-1">
              Futuro
            </span>
            <span className="ml-2">Crediário pendente</span>
          </div>
        </div>

        {/* 4. Inadimplência (Atrasados) */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Em Atraso</p>
              <h3 className="text-2xl font-bold text-red-600 mt-2">
                {kpis.totalAtrasado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h3>
            </div>
            <div className="bg-red-100 p-2 rounded-lg text-red-600">
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-gray-400">
            <span className="text-red-600 font-bold flex items-center gap-1">
              <ArrowDownRight size={12}/> Atenção
            </span>
            <span className="ml-2">Parcelas vencidas</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- GRÁFICO SIMPLIFICADO --- */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-6">Desempenho de Vendas (Diário)</h3>
          
          <div className="h-64 flex items-end gap-2 justify-between">
            {dadosGrafico.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-gray-400">Sem vendas este mês</div>
            ) : (
                dadosGrafico.map((d) => {
                    // Calcula altura relativa (max 100%)
                    const maxVal = Math.max(...dadosGrafico.map(i => i.valor), 100); 
                    const altura = (d.valor / maxVal) * 100;
                    
                    return (
                        <div key={d.dia} className="flex-1 flex flex-col items-center gap-2 group cursor-default">
                            <div className="relative w-full flex items-end justify-center h-full">
                                <div 
                                    style={{ height: `${altura}%` }} 
                                    className={`w-full max-w-[30px] rounded-t-sm transition-all duration-500 ${d.valor > 0 ? 'bg-blue-500 group-hover:bg-blue-600' : 'bg-gray-100'}`}
                                ></div>
                                {/* Tooltip simples */}
                                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                                    R$ {d.valor.toLocaleString('pt-BR')}
                                </div>
                            </div>
                            <span className="text-[10px] text-gray-400 font-bold">{d.dia}</span>
                        </div>
                    )
                })
            )}
          </div>
        </div>

        {/* --- ACESSO RÁPIDO & RECENTES --- */}
        <div className="space-y-6">
            
            {/* Atalhos */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4">Acesso Rápido</h3>
                <div className="space-y-3">
                    <Link href="/pdv" className="flex items-center justify-between p-3 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 border border-transparent rounded-lg transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 text-blue-600 p-2 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <ShoppingBag size={18} />
                            </div>
                            <div>
                                <p className="font-bold text-sm text-gray-800">Novo Pedido</p>
                                <p className="text-xs text-gray-500">Abrir PDV</p>
                            </div>
                        </div>
                        <ArrowUpRight size={16} className="text-gray-400 group-hover:text-blue-600"/>
                    </Link>

                    <Link href="/contas-receber" className="flex items-center justify-between p-3 bg-gray-50 hover:bg-green-50 hover:border-green-200 border border-transparent rounded-lg transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-100 text-green-600 p-2 rounded-full group-hover:bg-green-600 group-hover:text-white transition-colors">
                                <DollarSign size={18} />
                            </div>
                            <div>
                                <p className="font-bold text-sm text-gray-800">Receber Conta</p>
                                <p className="text-xs text-gray-500">Baixar parcelas</p>
                            </div>
                        </div>
                        <ArrowUpRight size={16} className="text-gray-400 group-hover:text-green-600"/>
                    </Link>

                    <Link href="/clientes" className="flex items-center justify-between p-3 bg-gray-50 hover:bg-purple-50 hover:border-purple-200 border border-transparent rounded-lg transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-100 text-purple-600 p-2 rounded-full group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                <Users size={18} />
                            </div>
                            <div>
                                <p className="font-bold text-sm text-gray-800">Novo Cliente</p>
                                <p className="text-xs text-gray-500">Cadastrar</p>
                            </div>
                        </div>
                        <ArrowUpRight size={16} className="text-gray-400 group-hover:text-purple-600"/>
                    </Link>
                </div>
            </div>

            {/* Últimas Vendas */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800">Últimas Vendas</h3>
                    <Link href="/vendas" className="text-xs text-blue-600 hover:underline">Ver todas</Link>
                </div>
                <div className="space-y-3">
                    {ultimasVendas.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">Nenhuma venda recente.</p>
                    ) : (
                        ultimasVendas.map(v => (
                            <div key={v.id} className="flex justify-between items-center border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                                <div>
                                    <p className="text-sm font-bold text-gray-700 truncate max-w-[120px]">
                                        {v.clientes?.nome || "Consumidor Final"}
                                    </p>
                                    <p className="text-[10px] text-gray-400">
                                        {format(parseISO(v.created_at), "dd/MM HH:mm")}
                                    </p>
                                </div>
                                <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                                    R$ {v.valor_total.toFixed(2)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}