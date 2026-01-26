"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/lib/supabase";
import { 
  DollarSign, Users, TrendingUp, AlertCircle, 
  Wallet, ArrowUpRight, ShoppingBag, Loader2, Target
} from "lucide-react";
import { startOfMonth, endOfMonth, isBefore, parseISO, eachDayOfInterval, getDate, getMonth, getYear, format } from "date-fns";
import Link from "next/link";
import confetti from "canvas-confetti";
import { DashboardHeader } from "@/src/components/DashboardHeader"; // <--- Importando o cabeçalho novo

export default function DashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  
  // META DIÁRIA
  const META_DIARIA = 2000.00;
  const [vendasHoje, setVendasHoje] = useState(0);

  // KPIs
  const [kpis, setKpis] = useState({
    vendasMes: 0,
    recebidoMes: 0,
    totalAReceber: 0,
    totalAtrasado: 0,
    novosClientes: 0
  });

  // Gráfico e Listas
  const [dadosGrafico, setDadosGrafico] = useState<{dia: number, valor: number}[]>([]);
  const [ultimasVendas, setUltimasVendas] = useState<any[]>([]);

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (!loading && vendasHoje >= META_DIARIA) {
        dispararConfetes();
    }
  }, [vendasHoje, loading]);

  const dispararConfetes = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  async function carregarDados() {
    setLoading(true);
    const hoje = new Date();
    const inicioMes = startOfMonth(hoje).toISOString();
    const fimMes = endOfMonth(hoje).toISOString();

    try {
      // 1. BUSCAR VENDAS
      const { data: vendasMes, error: errVendas } = await supabase
        .from("vendas")
        .select("data_venda, valor_total") 
        .gte("data_venda", inicioMes)      
        .lte("data_venda", fimMes);        

      if (errVendas) throw errVendas;

      // 2. BUSCAR OUTROS DADOS
      const { data: parcelas } = await supabase.from("parcelas").select("valor, status, data_pagamento, data_vencimento");
      const { count: countClientes } = await supabase.from("clientes").select("*", { count: 'exact', head: true }).gte("created_at", inicioMes).neq("nome", "Consumidor Final");
      const { data: ultimas } = await supabase.from("vendas").select("id, valor_total, data_venda, clientes(nome)").order("data_venda", { ascending: false }).limit(5);

      // --- PROCESSAMENTO ---
      const totalVendasMes = vendasMes?.reduce((acc, v) => acc + v.valor_total, 0) || 0;
      
      const diaHoje = getDate(hoje);
      const mesHoje = getMonth(hoje);
      const anoHoje = getYear(hoje);

      const totalHoje = vendasMes?.filter(v => {
          const d = parseISO(v.data_venda);
          return getDate(d) === diaHoje && getMonth(d) === mesHoje && getYear(d) === anoHoje;
      }).reduce((acc, v) => acc + v.valor_total, 0) || 0;
      
      setVendasHoje(totalHoje);

      const totalRecebidoMes = parcelas?.filter(p => p.status === 'pago' && p.data_pagamento >= inicioMes && p.data_pagamento <= fimMes).reduce((acc, p) => acc + p.valor, 0) || 0;
      const totalPendencia = parcelas?.filter(p => p.status === 'pendente').reduce((acc, p) => acc + p.valor, 0) || 0;
      const totalAtraso = parcelas?.filter(p => p.status === 'pendente' && isBefore(parseISO(p.data_vencimento), hoje)).reduce((acc, p) => acc + p.valor, 0) || 0;

      setKpis({
        vendasMes: totalVendasMes,
        recebidoMes: totalRecebidoMes,
        totalAReceber: totalPendencia,
        totalAtrasado: totalAtraso,
        novosClientes: countClientes || 0
      });
      
      if (ultimas) setUltimasVendas(ultimas);

      // C. MONTAR GRÁFICO
      const diasDoMes = eachDayOfInterval({ start: startOfMonth(hoje), end: hoje }); 
      
      const grafico = diasDoMes.map(diaRef => {
        const diaNum = getDate(diaRef);
        const mesNum = getMonth(diaRef);
        
        const vendasDoDia = vendasMes?.filter(v => {
            const d = parseISO(v.data_venda);
            return getDate(d) === diaNum && getMonth(d) === mesNum;
        }) || [];

        const totalDia = vendasDoDia.reduce((acc, v) => acc + v.valor_total, 0);
        return { dia: diaNum, valor: totalDia };
      });
      
      setDadosGrafico(grafico);

    } catch (error: any) {
      console.error("Erro dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center text-blue-600 gap-2 min-h-[500px]">
        <Loader2 className="animate-spin" /> Carregando Dashboard...
      </div>
    );
  }

  const porcentagemMeta = Math.min(100, (vendasHoje / META_DIARIA) * 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* 1. NOVO CABEÇALHO */}
      <DashboardHeader />

      {/* Botãozinho discreto de atualizar */}
      <div className="flex justify-end -mt-4 mb-2">
         <button 
           onClick={carregarDados} 
           className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
         >
           <Loader2 size={10} /> Atualizar dados
         </button>
      </div>

      {/* 2. META DO DIA */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="flex justify-between items-center relative z-10">
          <div>
             <h2 className="text-lg font-bold flex items-center gap-2">
                <Target className="text-yellow-400" /> Meta do Dia
             </h2>
             <p className="text-gray-400 text-sm">
                Objetivo: {META_DIARIA.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
             </p>
          </div>
          <div className="text-right">
             <p className="text-3xl font-bold text-yellow-400">
                {vendasHoje.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
             </p>
             <p className="text-xs text-gray-400">{porcentagemMeta.toFixed(1)}% atingido</p>
          </div>
        </div>
        <div className="mt-4 h-3 bg-gray-700 rounded-full overflow-hidden relative z-10">
           <div 
             className="h-full bg-gradient-to-r from-blue-500 to-green-400 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(74,222,128,0.5)]" 
             style={{ width: `${porcentagemMeta}%` }}
           />
        </div>
        <Target size={150} className="absolute -bottom-10 -right-10 opacity-5 text-white" />
      </div>

      {/* 3. CARDS DE KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Vendas (Mês)" value={kpis.vendasMes} icon={<ShoppingBag size={20}/>} sub="Volume Bruto" color="blue" />
        <KPICard title="Caixa (Recebido)" value={kpis.recebidoMes} icon={<Wallet size={20}/>} sub="Entradas Reais" color="green" />
        <KPICard title="A Receber" value={kpis.totalAReceber} icon={<DollarSign size={20}/>} sub="Carteira Futura" color="gray" />
        <KPICard title="Em Atraso" value={kpis.totalAtrasado} icon={<AlertCircle size={20}/>} sub="Inadimplência" color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 4. GRÁFICO */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-6">Desempenho Diário</h3>
          
          <div className="h-64 flex items-end gap-2 justify-between">
            {dadosGrafico.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-gray-400">Sem vendas este mês</div>
            ) : (
                dadosGrafico.map((d) => {
                    const maxVal = Math.max(...dadosGrafico.map(i => i.valor), 100); 
                    let altura = (d.valor / maxVal) * 100;
                    if (d.valor > 0 && altura < 5) altura = 5;

                    return (
                        <div key={d.dia} className="flex-1 flex flex-col items-center gap-2 group cursor-default h-full justify-end">
                            <div className="relative w-full flex items-end justify-center h-full">
                                <div 
                                    style={{ height: `${altura}%` }} 
                                    className={`w-full max-w-[30px] rounded-t-sm transition-all duration-500 ${d.valor > 0 ? 'bg-blue-500 group-hover:bg-blue-600' : 'bg-gray-100 h-1'}`}
                                ></div>
                                {d.valor > 0 && (
                                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none shadow-lg">
                                        Dia {d.dia}: R$ {d.valor.toLocaleString('pt-BR')}
                                    </div>
                                )}
                            </div>
                            <span className="text-[10px] text-gray-400 font-bold">{d.dia}</span>
                        </div>
                    )
                })
            )}
          </div>
        </div>

        {/* 5. LISTAS LATERAIS */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4">Acesso Rápido</h3>
                <div className="space-y-3">
                    <QuickLink href="/pdv" icon={<ShoppingBag size={18} />} title="Novo Pedido" sub="Abrir PDV" color="blue" />
                    <QuickLink href="/contas-receber" icon={<DollarSign size={18} />} title="Receber Conta" sub="Baixar parcelas" color="green" />
                    <QuickLink href="/clientes" icon={<Users size={18} />} title="Novo Cliente" sub="Cadastrar" color="purple" />
                </div>
            </div>

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
                                        {format(parseISO(v.data_venda), "dd/MM HH:mm")}
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

// Componentes Auxiliares (Cards)
function KPICard({ title, value, icon, sub, color }: any) {
    const colors: any = { 
        blue: "bg-blue-100 text-blue-600", green: "bg-green-100 text-green-600", 
        red: "bg-red-100 text-red-600", gray: "bg-gray-100 text-gray-600" 
    };
    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-xs font-bold text-gray-500 uppercase">{title}</p>
                 <h3 className={`text-2xl font-bold mt-2 ${color === 'red' ? 'text-red-600' : 'text-gray-900'}`}>{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
              </div>
              <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
           </div>
           <div className="mt-4 flex items-center text-xs text-gray-400">
             <span className={`font-bold flex items-center gap-1 ${color === 'red' ? 'text-red-600' : 'text-' + color + '-600'}`}>
               <TrendingUp size={12}/> Info
             </span>
             <span className="ml-2">{sub}</span>
           </div>
        </div>
    )
}

function QuickLink({ href, icon, title, sub, color }: any) {
    const colors: any = { 
        blue: "bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white", 
        green: "bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white", 
        purple: "bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white" 
    };
    return (
        <Link href={href} className={`flex items-center justify-between p-3 bg-gray-50 hover:bg-${color}-50 hover:border-${color}-200 border border-transparent rounded-lg transition-all group`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full transition-colors ${colors[color]}`}>
                    {icon}
                </div>
                <div>
                    <p className="font-bold text-sm text-gray-800">{title}</p>
                    <p className="text-xs text-gray-500">{sub}</p>
                </div>
            </div>
            <ArrowUpRight size={16} className={`text-gray-400 group-hover:text-${color}-600`}/>
        </Link>
    )
}