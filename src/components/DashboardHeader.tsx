"use client";

import { useEffect, useState, useRef } from "react";
import { Shield, Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/src/lib/supabase";
import { 
  format, addMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay 
} from "date-fns";
import { ptBR } from "date-fns/locale";

export function DashboardHeader() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados do Relógio e Data
  const [dataAtual, setDataAtual] = useState(new Date());
  
  // Estados do Calendário
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewDate, setViewDate] = useState(new Date()); 
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setDataAtual(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function getUserData() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();
        setUser(profile);
      }
      setLoading(false);
    }
    getUserData();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
        setTimeout(() => setViewDate(new Date()), 300); 
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const generateCalendarDays = () => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  const changeMonth = (amount: number) => {
    setViewDate(prev => addMonths(prev, amount));
  };

  const hora = dataAtual.getHours();
  let saudacao = "Bom dia";
  if (hora >= 12 && hora < 18) saudacao = "Boa tarde";
  else if (hora >= 18) saudacao = "Boa noite";

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'superadmin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'gerente': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) return <div className="h-24 w-full bg-gray-100 animate-pulse rounded-xl"></div>;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-visible">
      
      {/* Decoração de Fundo */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

      {/* LADO ESQUERDO: Saudação e Infos */}
      <div className="z-10">
        
        {/* --- MUDANÇA AQUI: SAUDAÇÃO AZUL E GRANDE --- */}
        <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-3 mb-2">
           <h1 className="text-3xl md:text-4xl font-extrabold text-blue-600 tracking-tighter">
             {saudacao},
           </h1>
           
           <div className="flex items-center gap-2">
              <span className="text-xl md:text-2xl font-bold text-gray-700">
                {user?.nome?.split(' ')[0] || "Usuário"}!
              </span>
              <span className="text-2xl animate-pulse">👋</span>
           </div>
        </div>
        {/* ------------------------------------------- */}

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span>Guaratuba, PR</span>
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md border uppercase tracking-wider ${getRoleStyle(user?.cargo)}`}>
            <Shield size={10} />
            {user?.cargo || "Vendedor"}
          </div>
        </div>
      </div>

      {/* LADO DIREITO: Data e Hora */}
      <div className="flex items-center gap-4 bg-gray-50/50 p-3 rounded-xl border border-gray-100 backdrop-blur-sm z-20 w-full md:w-auto justify-between md:justify-end">
        
        {/* DATA COM CALENDÁRIO */}
        <div 
            ref={calendarRef}
            className="text-right border-r border-gray-200 pr-4 mr-1 relative cursor-pointer group"
        >
          <div onClick={() => setShowCalendar(!showCalendar)}>
            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider group-hover:text-blue-500 transition-colors">Data de Hoje</p>
            <div className="flex items-center gap-2 text-gray-700 font-medium group-hover:text-blue-600 transition-colors">
                <CalendarIcon size={16} className="text-blue-500" />
                <span>{format(dataAtual, "dd 'de' MMMM", { locale: ptBR })}</span>
            </div>
          </div>

          {showCalendar && (
            <div className="absolute top-full right-0 mt-4 bg-white border border-gray-200 shadow-2xl rounded-xl p-4 w-72 z-50 animate-in fade-in zoom-in-95 origin-top-right">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
                        <ChevronLeft size={18} />
                    </button>
                    <span className="font-bold text-gray-800 capitalize">
                        {format(viewDate, "MMMM yyyy", { locale: ptBR })}
                    </span>
                    <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
                        <ChevronRight size={18} />
                    </button>
                </div>
                <div className="grid grid-cols-7 mb-2 text-center">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                        <span key={i} className="text-[10px] font-bold text-gray-400">{day}</span>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                    {generateCalendarDays().map((day, idx) => {
                        const isToday = isSameDay(day, new Date());
                        const isCurrentMonth = isSameMonth(day, viewDate);
                        return (
                            <div 
                                key={idx} 
                                className={`
                                    text-xs h-8 w-8 flex items-center justify-center rounded-full
                                    ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                                    ${isToday ? 'bg-blue-600 text-white font-bold shadow-md' : 'hover:bg-gray-100'}
                                `}
                            >
                                {format(day, 'd')}
                            </div>
                        )
                    })}
                </div>
                <div className="absolute -top-2 right-6 w-4 h-4 bg-white border-t border-l border-gray-200 transform rotate-45"></div>
            </div>
          )}
        </div>

        {/* Hora */}
        <div className="text-right pl-1">
          <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Hora Atual</p>
          <div className="flex items-center gap-2 text-gray-900 font-bold text-lg tabular-nums">
             <Clock size={18} className="text-blue-600" />
             {format(dataAtual, "HH:mm:ss")}
          </div>
        </div>

      </div>
    </div>
  );
}