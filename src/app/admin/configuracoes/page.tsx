"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/lib/supabase";
import { Settings, Save, Target, Award, Loader2, Calculator, ArrowRight, HelpCircle, AlertTriangle, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export default function ConfiguracoesPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Estados para zerar pontos
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Valores padrão seguros
  const [config, setConfig] = useState({
    id: 1,
    meta_diaria: 2000,
    comissao_percentual: 3,
    pontos_por_real: 1,      
    valor_do_ponto: 0.01     
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  async function fetchConfigs() {
    try {
        setLoading(true);
        const { data } = await supabase.from('configuracoes').select('*').limit(1).single();
        if (data) setConfig(data);
    } catch (err) {
        console.error("Erro crítico:", err);
    } finally {
        setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
        .from('configuracoes')
        .update({
            meta_diaria: config.meta_diaria,
            comissao_percentual: config.comissao_percentual,
            pontos_por_real: config.pontos_por_real,
            valor_do_ponto: config.valor_do_ponto
        })
        .eq('id', config.id);

    if (error) {
        toast.error("Erro ao salvar: " + error.message);
    } else {
        toast.success("Configurações salvas com sucesso!");
    }
    setSaving(false);
  }

  // Função para zerar pontos de todos os clientes
  async function handleZerarPontos() {
    setResetting(true);
    try {
        // Atualiza todos os clientes que têm pontos > 0
        const { error, count } = await supabase
            .from('clientes')
            .update({ pontos_acumulados: 0 })
            .gt('pontos_acumulados', 0) // Só zera quem tem pontos
            .select('*', { count: 'exact' });

        if (error) throw error;

        toast.success(`Pontos zerados com sucesso! ${count || 0} clientes atualizados.`);
        setShowResetModal(false);
    } catch (err: any) {
        toast.error("Erro ao zerar pontos: " + err.message);
    } finally {
        setResetting(false);
    }
  }

  // --- SIMULADOR CORRIGIDO ---
  const compraExemplo = 100; // Base de cálculo
  const pontosGerados = Math.floor(compraExemplo * config.pontos_por_real);
  const descontoGerado = pontosGerados * config.valor_do_ponto;
  const porcentagemCashback = (descontoGerado / compraExemplo) * 100;
  
  // Alerta de perigo se cashback > 20%
  const isDangerous = porcentagemCashback > 20;

  if (loading) return <div className="flex h-[50vh] items-center justify-center gap-2 text-blue-600"><Loader2 className="animate-spin" /> Carregando...</div>;

  return (
    <div className="max-w-4xl mx-auto pb-10 space-y-6 animate-in fade-in duration-500">
      
      <div className="flex items-center gap-3 mb-8 pt-4">
        <div className="bg-blue-100 p-3 rounded-xl shadow-sm">
            <Settings className="text-blue-600" size={28} />
        </div>
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
            <p className="text-gray-500 text-sm">Regras globais do sistema</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* METAS */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
                <Target className="text-red-500" size={20}/> Metas & Financeiro
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Meta Diária (R$)</label>
                    <input type="number" step="0.01" value={config.meta_diaria} onChange={(e) => setConfig({...config, meta_diaria: Number(e.target.value)})} className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none font-bold" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Comissão Padrão (%)</label>
                    <input type="number" step="0.1" value={config.comissao_percentual} onChange={(e) => setConfig({...config, comissao_percentual: Number(e.target.value)})} className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none font-bold" />
                </div>
            </div>
        </div>

        {/* SISTEMA DE PONTOS */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
                <Award className="text-purple-500" size={20}/> Sistema de Pontos
            </h3>
            
            {/* SIMULADOR VISUAL */}
            <div className={`border p-5 rounded-xl mb-6 transition-colors ${isDangerous ? 'bg-red-50 border-red-200' : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-100'}`}>
                <div className="flex items-center gap-2 mb-3 text-purple-800 font-bold text-sm uppercase tracking-wide">
                    <Calculator size={16} /> Simulador de Impacto
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-gray-700">
                    <div className="bg-white px-3 py-2 rounded-lg border shadow-sm">Compra de <b>R$ 100,00</b></div>
                    <ArrowRight size={16} className="text-gray-400 hidden md:block" />
                    <div className="bg-white px-3 py-2 rounded-lg border shadow-sm">Gera <b>{pontosGerados.toLocaleString('pt-BR')} Pontos</b></div>
                    <ArrowRight size={16} className="text-gray-400 hidden md:block" />
                    <div className="bg-white px-3 py-2 rounded-lg border shadow-sm">Vira Desconto de <b className={isDangerous ? "text-red-600" : "text-green-600"}>R$ {descontoGerado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-black/5 flex justify-between items-center">
                    <span className="text-xs text-gray-500">Porcentagem real de desconto:</span>
                    <div className={`flex items-center gap-2 text-sm font-bold px-3 py-1 rounded-full ${isDangerous ? 'bg-red-200 text-red-800' : 'bg-green-100 text-green-700'}`}>
                        {isDangerous && <AlertTriangle size={14} />}
                        {porcentagemCashback.toFixed(2)}% Cashback
                    </div>
                </div>
                {isDangerous && (
                    <p className="text-xs text-red-600 mt-2 font-medium">⚠️ Cuidado: Você está devolvendo mais de 20% do valor da venda. Verifique se é isso mesmo.</p>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pontos por Real (Fator)</label>
                    <input 
                        type="number" 
                        step="any" 
                        value={config.pontos_por_real} 
                        onChange={(e) => setConfig({...config, pontos_por_real: Number(e.target.value)})} 
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-lg" 
                    />
                    <p className="text-xs text-gray-400 mt-1">Ex: Coloque 1 para 1 ponto por real.</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex justify-between">
                        <span>Valor de 1 Ponto (Em Reais)</span>
                        <span className="text-xs text-purple-600 font-normal flex items-center gap-1"><HelpCircle size={12}/> Aceita frações (Ex: 0,01)</span>
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                        <input 
                            type="number" 
                            step="0.000001" 
                            value={config.valor_do_ponto} 
                            onChange={(e) => setConfig({...config, valor_do_ponto: Number(e.target.value)})} 
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-lg" 
                        />
                    </div>
                </div>
            </div>

            {/* ZONA DE PERIGO: ZERAR PONTOS */}
            <div className="border border-red-100 bg-red-50 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h4 className="text-red-800 font-bold flex items-center gap-2"><Trash2 size={18}/> Zerar Pontuação Geral</h4>
                    <p className="text-red-600 text-xs mt-1">Remove os pontos acumulados de <b>TODOS</b> os clientes. Esta ação é irreversível.</p>
                </div>
                <button 
                    type="button" 
                    onClick={() => setShowResetModal(true)}
                    className="px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white rounded-lg text-sm font-bold transition-colors whitespace-nowrap"
                >
                    Zerar Tudo
                </button>
            </div>
        </div>

        <div className="flex justify-end pt-4 pb-12">
            <button type="submit" disabled={saving} className="bg-gray-900 hover:bg-black text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-70">
                {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />} Salvar Configurações
            </button>
        </div>
      </form>

      {/* MODAL DE CONFIRMAÇÃO PARA ZERAR */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-start mb-4">
                    <div className="bg-red-100 p-3 rounded-full text-red-600">
                        <AlertTriangle size={32} />
                    </div>
                    <button onClick={() => setShowResetModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Tem certeza absoluta?</h3>
                <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                    Você está prestes a <b>remover todos os pontos de fidelidade</b> de todos os clientes cadastrados no sistema. 
                    <br/><br/>
                    Os clientes perderão o saldo acumulado e não poderão mais resgatá-lo. Essa ação não pode ser desfeita.
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowResetModal(false)} 
                        className="flex-1 py-3 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleZerarPontos} 
                        disabled={resetting}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-200"
                    >
                        {resetting ? <Loader2 className="animate-spin" /> : <Trash2 size={18} />}
                        Sim, Zerar Tudo
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}