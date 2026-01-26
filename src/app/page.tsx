"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/src/lib/supabase";
import { 
  TrendingUp, Users, AlertTriangle, DollarSign, 
  Calendar as CalendarIcon, Clock, ArrowUpRight, Package, ChevronRight, AlertCircle,
  ChevronLeft
} from "lucide-react";
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  getDay, isSameDay, addMonths, subMonths, isToday 
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis 
} from 'recharts';
import Link from "next/link";

export default function Dashboard() {
  const supabase = createClient();
  
  // Dados do Dashboard
  const [kpis, setKpis] = useState({
    vendasHoje: 0,
    faturamentoHoje: 0,
    clientesNovos: 0,
    produtosBaixoEstoque: 0
  });
  
  const [listaBaixoEstoque, setListaBaixoEstoque] = useState<any[]>([]);
  const [config, setConfig] = useState({ meta_diaria: 2000, comissao_percentual: 3 });
  const [graficoVendas, setGraficoVendas] = useState<any[]>([]);
  
  // --- RELÓGIO & DATA ---
  const [dataAtual, setDataAtual] = useState(new Date());
  
  // --- ESTADO DO CALENDÁRIO SUSPENSO ---
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date()); // Data que está sendo visualizada no calendário
  const calendarRef = useRef<HTMLDivElement>(null);

  // Fecha o calendário se clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setDataAtual(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hora = dataAtual.getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const dataExtenso = format(dataAtual, "EEEE, d 'de' MMMM", { locale: ptBR });
  const horaFormatada = dataAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // --- LÓGICA DO CALENDÁRIO ---
  const diasDoMes = eachDayOfInterval({
    start: startOfMonth(viewDate),
    end: endOfMonth(viewDate)
  });
  const diaDaSemanaInicio = getDay(startOfMonth(viewDate)); // 0 = Domingo
  // Array de dias vazios para alinhar o calendário
  const diasVazios = Array.from({ length: diaDaSemanaInicio });

  const proximoMes = (e: any) => { e.stopPropagation(); setViewDate(addMonths(viewDate, 1)); };
  const mesAnterior = (e: any) => { e.stopPropagation(); setViewDate(subMonths(viewDate, 1)); };
  const voltarParaHoje = (e: any) => { e.stopPropagation(); setViewDate(new Date()); };

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const hojeInicio = new Date(new Date().setHours(0,0,0,0)).toISOString();
      const hojeFim = new Date(new Date().setHours(23,59,59,999)).toISOString();

      // 1. CONFIGURAÇÕES
      const { data: configData } = await supabase.from('configuracoes').select('meta_diaria, comissao_percentual').single();
      if (configData) {
        setConfig({
            meta_diaria: Number(configData.meta_diaria),
            comissao_percentual: Number(configData.comissao_percentual)
        });
      }

      // 2. VENDAS
      const { data: vendasHoje } = await supabase
        .from("vendas")
        .select("*")
        .gte("data_venda", hojeInicio)
        .lte("data_venda", hojeFim);

      const totalFaturamento = vendasHoje?.reduce((acc, v) => acc + v.valor_total, 0) || 0;
      const qtdVendas = vendasHoje?.length || 0;

      // 3. CLIENTES
      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count: clientesCount } = await supabase
        .from("clientes")
        .select("*", { count: 'exact', head: true })
        .gte("created_at", inicioMes);

      // 4. ESTOQUE BAIXO
      const { data: produtosLow } = await supabase
        .from("produtos")
        .select("*", { count: 'exact' }) 
        .lt("estoque", 5)
        .order('estoque', { ascending: true });

      setKpis({
        vendasHoje: qtdVendas,
        faturamentoHoje: totalFaturamento,
        clientesNovos: clientesCount || 0,
        produtosBaixoEstoque: produtosLow?.length || 0
      });

      if (produtosLow) {
        setListaBaixoEstoque(produtosLow);
      }

      // 5. GRÁFICO (Simulado)
      setGraficoVendas([
        { name: 'Seg', vendas: 4000 }, { name: 'Ter', vendas: 3000 },
        { name: 'Qua', vendas: 2000 }, { name: 'Qui', vendas: 2780 },
        { name: 'Sex', vendas: 1890 }, { name: 'Sáb', vendas: 2390 },
        { name: 'Dom', vendas: 3490 },
      ]);

    } catch (error) {
      console.error("Erro dashboard:", error);
    }
  }

  const porcentagemMeta = Math.min(100, (kpis.faturamentoHoje / config.meta_diaria) * 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4 relative z-20">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{saudacao}, Nelson! 👋</h1>
          <p className="text-gray-500 mt-1 text-sm">Resumo geral da sua loja hoje.</p>
        </div>
        
        {/* WIDGET DE TEMPO E DATA */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            
            {/* Bloco Data (Agora é um botão relativo para o dropdown) */}
            <div ref={calendarRef} className="relative">
                <button 
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                    className={`flex items-center gap-3 bg-purple-50 px-4 py-2 rounded-xl border transition-all min-w-[180px] text-left hover:bg-purple-100 ${isCalendarOpen ? 'border-purple-300 ring-2 ring-purple-100' : 'border-purple-100'}`}
                >
                    <div className="bg-white p-2 rounded-lg text-purple-600 shadow-sm">
                        <CalendarIcon size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wide">Data de Hoje</p>
                        <p className="text-sm font-bold text-purple-900 capitalize whitespace-nowrap">
                            {dataExtenso}
                        </p>
                    </div>
                </button>

                {/* DROPDOWN DO CALENDÁRIO */}
                {isCalendarOpen && (
                    <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-purple-100 p-4 w-[300px] z-50 animate-in fade-in zoom-in-95">
                        {/* Navegação */}
                        <div className="flex justify-between items-center mb-4">
                            <button onClick={mesAnterior} className="p-1 hover:bg-gray-100 rounded-full"><ChevronLeft size={18} className="text-gray-600"/></button>
                            <span className="font-bold text-gray-800 capitalize cursor-pointer hover:text-purple-600" onClick={voltarParaHoje}>
                                {format(viewDate, "MMMM yyyy", { locale: ptBR })}
                            </span>
                            <button onClick={proximoMes} className="p-1 hover:bg-gray-100 rounded-full"><ChevronRight size={18} className="text-gray-600"/></button>
                        </div>

                        {/* Dias da Semana */}
                        <div className="grid grid-cols-7 text-center mb-2">
                            {['D','S','T','Q','Q','S','S'].map((d, i) => (
                                <span key={i} className="text-[10px] font-bold text-gray-400">{d}</span>
                            ))}
                        </div>

                        {/* Dias */}
                        <div className="grid grid-cols-7 gap-1 text-center">
                            {diasVazios.map((_, i) => <div key={`empty-${i}`} />)}
                            {diasDoMes.map((dia) => {
                                const isTodayDay = isToday(dia);
                                const isSelectedDay = isSameDay(dia, dataAtual);
                                
                                return (
                                    <div 
                                        key={dia.toISOString()} 
                                        className={`
                                            text-xs p-1.5 rounded-lg flex items-center justify-center font-medium select-none
                                            ${isTodayDay ? 'bg-purple-600 text-white font-bold shadow-md' : 'text-gray-700 hover:bg-purple-50'}
                                        `}
                                    >
                                        {format(dia, 'd')}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100 text-center">
                            <button onClick={voltarParaHoje} className="text-xs text-purple-600 font-bold hover:underline">
                                Voltar para Hoje
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bloco Hora */}
            <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 min-w-[140px]">
                <div className="bg-white p-2 rounded-lg text-blue-600 shadow-sm">
                    <Clock size={20} />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wide">Hora Atual</p>
                    <p className="text-xl font-bold text-blue-900 font-mono leading-none">
                        {horaFormatada}
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* RESTO DO DASHBOARD (Sem alterações) */}
      <div className="bg-gray-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10"><TrendingUp size={120} /></div>
        <div className="relative z-10">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <h2 className="text-lg font-bold flex items-center gap-2"><TargetIcon className="text-yellow-400" /> Meta do Dia</h2>
                    <p className="text-gray-400 text-sm">Objetivo: {config.meta_diaria.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="text-right">
                    <span className="text-3xl font-bold text-yellow-400">{kpis.faturamentoHoje.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    <p className="text-xs text-gray-400">{porcentagemMeta.toFixed(1)}% atingido</p>
                </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-4 mt-2 overflow-hidden border border-gray-600">
                <div className="bg-gradient-to-r from-blue-500 to-teal-400 h-4 rounded-full transition-all duration-1000 ease-out" style={{ width: `${porcentagemMeta}%` }}></div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Vendas Hoje" value={kpis.vendasHoje.toString()} icon={DollarSign} color="bg-green-100 text-green-700" trend="+12% vs ontem"/>
        <KpiCard title="Novos Clientes" value={kpis.clientesNovos.toString()} icon={Users} color="bg-blue-100 text-blue-700" trend="+5 este mês"/>
        <KpiCard title="Ticket Médio" value={(kpis.vendasHoje > 0 ? kpis.faturamentoHoje / kpis.vendasHoje : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={TrendingUp} color="bg-purple-100 text-purple-700" trend="Estável"/>
        <KpiCard title="Baixo Estoque" value={kpis.produtosBaixoEstoque.toString()} icon={AlertTriangle} color="bg-red-100 text-red-700" trend="Atenção" alert/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-blue-600"/> Performance de Vendas</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={graficoVendas}>
                        <defs>
                            <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} tickFormatter={(value) => `R$${value}`} />
                        <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Vendas']}/>
                        <Area type="monotone" dataKey="vendas" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVendas)" />
                    </AreaChart>
                </ResponsiveContainer>
              </div>
          </div>

          <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4">Ações Rápidas</h3>
                  <div className="space-y-3">
                      <Link href="/pdv" className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-50 rounded-xl transition-colors group border border-gray-100">
                          <div className="flex items-center gap-3">
                              <div className="bg-blue-100 p-2 rounded-lg text-blue-600 group-hover:bg-blue-200"><DollarSign size={20} /></div>
                              <span className="font-semibold text-gray-700 group-hover:text-blue-700">Abrir PDV</span>
                          </div>
                          <ArrowUpRight size={18} className="text-gray-400 group-hover:text-blue-500" />
                      </Link>
                      <Link href="/clientes" className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-green-50 rounded-xl transition-colors group border border-gray-100">
                          <div className="flex items-center gap-3">
                              <div className="bg-green-100 p-2 rounded-lg text-green-600 group-hover:bg-green-200"><Users size={20} /></div>
                              <span className="font-semibold text-gray-700 group-hover:text-green-700">Novo Cliente</span>
                          </div>
                          <ArrowUpRight size={18} className="text-gray-400 group-hover:text-green-500" />
                      </Link>
                  </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col max-h-[500px]">
                  <div className="flex justify-between items-center mb-4 shrink-0">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          <AlertCircle size={20} className="text-red-500"/> Repor Estoque
                      </h3>
                      <Link href="/produtos" className="text-xs text-blue-600 hover:underline font-medium">Ver todos</Link>
                  </div>

                  {listaBaixoEstoque.length > 0 ? (
                      <div className="overflow-y-auto pr-1 space-y-3 custom-scrollbar flex-1">
                          {listaBaixoEstoque.map((prod) => (
                              <div key={prod.id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100 hover:bg-red-100 transition-colors">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                      <div className="bg-white p-2 rounded-lg text-red-500 shadow-sm border border-red-100 shrink-0">
                                          <Package size={16} />
                                      </div>
                                      <div className="truncate">
                                          <p className="text-sm font-bold text-gray-800 truncate" title={prod.nome}>{prod.nome || "Produto"}</p>
                                          <p className="text-xs text-red-600 font-medium">Resta apenas: {prod.estoque}</p>
                                      </div>
                                  </div>
                                  <Link href={`/produtos?editar=${prod.id}`}>
                                    <ChevronRight size={16} className="text-red-300 hover:text-red-500 cursor-pointer" />
                                  </Link>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          <Package size={32} className="mx-auto mb-2 text-green-400" />
                          <p className="text-sm">Tudo certo!</p>
                          <p className="text-xs">Nenhum produto crítico.</p>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, color, trend, alert }: any) {
    return (
        <div className={`bg-white p-5 rounded-2xl border ${alert ? 'border-red-200 bg-red-50/50' : 'border-gray-100'} shadow-sm hover:shadow-md transition-all`}>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${color}`}><Icon size={22} /></div>
                {trend && <span className={`text-xs font-bold px-2 py-1 rounded-full ${alert ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{trend}</span>}
            </div>
            <div>
                <p className="text-gray-500 text-sm font-medium">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
            </div>
        </div>
    )
}

function TargetIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="6"></circle>
            <circle cx="12" cy="12" r="2"></circle>
        </svg>
    )
}