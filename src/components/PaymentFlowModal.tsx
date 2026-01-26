"use client";

import { useState, useEffect } from "react";
import { 
  X, CreditCard, Banknote, Calendar, CheckCircle, 
  ArrowLeft, ChevronRight, Wallet, QrCode, Loader2, Trophy, AlertCircle, Lock, Unlock, KeyRound 
} from "lucide-react";
import { Cliente } from "@/src/types";
import { createClient } from "@/src/lib/supabase";
import { toast } from "sonner";

interface PaymentFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dadosVenda: any) => void;
  total: number;
  cliente: Cliente | null;
  loading?: boolean;
}

type PaymentMethod = 'dinheiro' | 'pix' | 'debito' | 'credito' | 'crediario' | null;

export function PaymentFlowModal({ 
  isOpen, onClose, onConfirm, total, cliente, loading = false 
}: PaymentFlowModalProps) {
  const supabase = createClient();
  
  // LOGS DE DEBUG
  console.log("### RENDERIZANDO MODAL. isOpen:", isOpen, "Cliente ID:", cliente?.id);

  // ESTADO QUE SEGURA O CLIENTE "VERDADEIRO" DO BANCO
  const [clienteDoBanco, setClienteDoBanco] = useState<any>(null);

  // CONFIGURAÇÃO
  const [config, setConfig] = useState({ 
    valor_do_ponto: 0, 
    pontos_por_real: 1,
    senha_gerencial: '123456'
  }); 

  // ESTADOS GERAIS
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [method, setMethod] = useState<PaymentMethod>(null);
  const [usarPontos, setUsarPontos] = useState(false);
  const [descontoPontos, setDescontoPontos] = useState(0);

  // DETALHES
  const [creditInstallments, setCreditInstallments] = useState(1);
  const [cashReceived, setCashReceived] = useState(0);
  const [crediarioParcelas, setCrediarioParcelas] = useState(1);
  const [primeiroVencimento, setPrimeiroVencimento] = useState("");
  const [entryValue, setEntryValue] = useState(0);

  // AUTORIZAÇÃO
  const [showAuthInput, setShowAuthInput] = useState(false);
  const [managerPassword, setManagerPassword] = useState("");
  const [limitOverride, setLimitOverride] = useState(false);

  // CÁLCULOS
  const totalComDesconto = Math.max(0, total - descontoPontos);
  const valorFinanciado = Math.max(0, totalComDesconto - entryValue);

  // --- TRAVA DE LIMITE (CORRIGIDA: limite_credito) ---
  // Tenta pegar 'limite_credito' (do banco), se não tiver tenta 'limite' (do tipo local), se não 0
  const limiteDisponivel = clienteDoBanco?.limite_credito ?? clienteDoBanco?.limite ?? 0;
  
  // Lógica de bloqueio
  const limiteExcedido = method === 'crediario' && 
                         valorFinanciado > limiteDisponivel && 
                         !limitOverride;

  // --- BUSCA DADOS ASSIM QUE O MODAL ABRE ---
  useEffect(() => {
    if (isOpen) {
      // 1. Resetar estados
      setStep(1);
      setMethod(null);
      setCreditInstallments(1);
      setCashReceived(total); 
      setCrediarioParcelas(1);
      setEntryValue(0); 
      setUsarPontos(false);
      setDescontoPontos(0);
      setShowAuthInput(false);
      setManagerPassword("");
      setLimitOverride(false);
      
      const hoje = new Date();
      hoje.setDate(hoje.getDate() + 30);
      setPrimeiroVencimento(hoje.toISOString().split('T')[0]);

      // 2. Carregar Configs
      fetchConfig();

      // 3. CARREGAR CLIENTE DO BANCO
      if (cliente?.id) {
        fetchClienteReal(cliente.id);
      }
    }
  }, [isOpen, cliente?.id]);

  async function fetchConfig() {
    const { data } = await supabase.from('configuracoes').select('*').single();
    if (data) {
        let valPonto = typeof data.valor_do_ponto === 'string' ? parseFloat(data.valor_do_ponto.replace(',', '.')) : data.valor_do_ponto;
        let valFator = typeof data.pontos_por_real === 'string' ? parseFloat(data.pontos_por_real.replace(',', '.')) : data.pontos_por_real;
        setConfig({ 
            valor_do_ponto: Number(valPonto) || 0, 
            pontos_por_real: Number(valFator) || 1,
            senha_gerencial: data.senha_gerencial || '123456'
        });
    }
  }

  // --- FUNÇÃO BLINDADA DE BUSCA ---
  async function fetchClienteReal(id: string) {
    try {
        const { data, error } = await supabase
            .from('clientes')
            .select('*') // Pega todas as colunas (incluindo limite_credito)
            .eq('id', id)
            .single();

        if (data) {
            console.log("### CLIENTE DO BANCO:", data);
            // Verifica qual coluna veio preenchida
            const limiteEncontrado = data.limite_credito ?? data.limite; 
            console.log("### LIMITE CORRIGIDO:", limiteEncontrado);
            setClienteDoBanco(data);
        }
    } catch (e) {
        console.error("Erro fetch cliente:", e);
    }
  }

  useEffect(() => {
    if (method === 'dinheiro') setCashReceived(totalComDesconto);
  }, [totalComDesconto, method]);

  const handleAuthorize = () => {
    if (managerPassword === config.senha_gerencial) {
        setLimitOverride(true);
        setShowAuthInput(false);
        toast.success("Venda autorizada!");
    } else {
        toast.error("Senha incorreta!");
        setManagerPassword("");
    }
  };

  const saldoEmReais = (clienteDoBanco?.pontos_acumulados || 0) * config.valor_do_ponto;

  const togglePontos = () => {
    if (!usarPontos) {
      const desconto = Math.min(saldoEmReais, total);
      setDescontoPontos(desconto);
    } else {
      setDescontoPontos(0);
    }
    setUsarPontos(!usarPontos);
  };

  const handleMethodSelect = (m: PaymentMethod) => {
    setMethod(m);
    if (m === 'pix' || m === 'debito') setStep(3);
    else setStep(2);
  };

  const handleNextStep = () => setStep(3);
  const handleBack = () => {
    if (step === 3 && (method === 'pix' || method === 'debito')) setStep(1);
    else setStep(prev => (prev - 1) as 1 | 2 | 3);
  };

  const handleFinalize = () => {
    if (limiteExcedido) {
        toast.error("Limite excedido. Aumente a entrada ou libere com senha.");
        return;
    }

    const valorPagoReal = method === 'dinheiro' ? (cashReceived - (cashReceived - totalComDesconto)) : totalComDesconto;
    const pontosGanhosNaVenda = Math.floor(valorPagoReal * config.pontos_por_real);

    const dados = {
      forma_pagamento: method,
      detalhes: {
        parcelas: method === 'credito' ? creditInstallments : (method === 'crediario' ? crediarioParcelas : 1),
        valor_recebido: method === 'dinheiro' ? cashReceived : totalComDesconto,
        troco: method === 'dinheiro' ? (cashReceived - totalComDesconto) : 0,
        primeiro_vencimento: method === 'crediario' ? primeiroVencimento : null,
        entrada: entryValue,
        valor_financiado: valorFinanciado,
        pontos_usados: usarPontos && config.valor_do_ponto > 0 ? Math.ceil(descontoPontos / config.valor_do_ponto) : 0,
        desconto_aplicado: descontoPontos,
        pontos_ganhos_estimados: pontosGanhosNaVenda 
      }
    };
    onConfirm(dados);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button onClick={handleBack} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><ArrowLeft size={20} className="text-gray-600" /></button>
            )}
            <div>
              <h3 className="font-bold text-lg text-gray-900">
                {step === 1 && "Forma de Pagamento"}
                {step === 2 && "Detalhes"}
                {step === 3 && "Confirmar"}
              </h3>
              <div className="flex items-center gap-2 text-sm">
                 <span className="text-gray-500">Total:</span>
                 <strong className="text-green-600">{totalComDesconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto">
          
          {/* FIDELIDADE */}
          {step === 1 && clienteDoBanco && (clienteDoBanco.pontos_acumulados || 0) > 0 && (
              <div className="bg-purple-50 border border-purple-100 p-3 rounded-xl mb-6 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-full text-purple-600"><Trophy size={18} /></div>
                    <div>
                      <p className="text-xs font-bold text-purple-700 uppercase">Saldo Fidelidade</p>
                      <p className="text-xs text-purple-600">Cliente tem <strong>{clienteDoBanco.pontos_acumulados} pts</strong></p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Resgate</p>
                    <p className="text-lg font-bold text-purple-700">{saldoEmReais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                </div>
                <div className="text-[10px] text-purple-400 mt-1 text-center border-b border-purple-100 pb-1 mb-2">
                    Regra Atual: 1 Ponto = R$ {Number(config.valor_do_ponto).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 10 })}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <label className="text-sm text-gray-700 flex items-center gap-2 cursor-pointer font-medium hover:text-purple-700">
                    <input type="checkbox" checked={usarPontos} onChange={togglePontos} className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"/>
                    Usar saldo
                  </label>
                  {usarPontos && <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">- {descontoPontos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>}
                </div>
              </div>
          )}

          {/* STEP 1: SELEÇÃO */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              <MethodButton icon={<Banknote size={24}/>} label="Dinheiro" onClick={() => handleMethodSelect('dinheiro')} color="text-green-600"/>
              <MethodButton icon={<QrCode size={24}/>} label="PIX" onClick={() => handleMethodSelect('pix')} color="text-teal-600"/>
              <MethodButton icon={<CreditCard size={24}/>} label="Débito" onClick={() => handleMethodSelect('debito')} color="text-blue-600"/>
              <MethodButton icon={<CreditCard size={24}/>} label="Crédito" onClick={() => handleMethodSelect('credito')} color="text-purple-600"/>
              <MethodButton icon={<Wallet size={24}/>} label="Crediário (Loja)" onClick={() => handleMethodSelect('crediario')} color="text-orange-600" disabled={!clienteDoBanco}/>
            </div>
          )}

          {/* STEP 2: DETALHES */}
          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              
              {/* CREDIÁRIO */}
              {method === 'crediario' && (
                <div className="space-y-4">
                  
                  {/* Entrada */}
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                      <label className="block text-sm font-bold text-orange-800 mb-2">Valor de Entrada (Opcional)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500 font-bold">R$</span>
                        <input 
                            type="number" 
                            className="w-full pl-10 pr-4 py-2 border border-orange-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                            placeholder="0,00"
                            value={entryValue || ''}
                            onChange={e => setEntryValue(Number(e.target.value))}
                        />
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-orange-700">
                          <span>Total: {totalComDesconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                          <span>Financiar: <b>{valorFinanciado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b></span>
                      </div>
                  </div>

                  {/* ALERTA DE LIMITE */}
                  {limiteExcedido && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-in fade-in">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="text-red-600 shrink-0" size={24} />
                            <div className="flex-1">
                                <h4 className="font-bold text-red-700 text-sm">Limite Excedido</h4>
                                <p className="text-red-600 text-xs mt-1">
                                    Limite Disponível: <b>{limiteDisponivel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b><br/>
                                    Valor a Financiar: <b>{valorFinanciado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b>
                                </p>
                                <p className="text-xs text-gray-500 mt-2 italic">
                                    Dica: Aumente a entrada para <b>R$ {Math.max(0, valorFinanciado - limiteDisponivel).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b> para liberar.
                                </p>
                                
                                {!showAuthInput ? (
                                    <button onClick={() => setShowAuthInput(true)} className="mt-3 flex items-center gap-2 text-xs font-bold bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg transition-colors">
                                        <KeyRound size={14} /> Liberar com Senha
                                    </button>
                                ) : (
                                    <div className="mt-3 flex gap-2">
                                        <input type="password" placeholder="Senha" className="w-full p-2 text-sm border border-red-300 rounded focus:ring-2 focus:ring-red-500 outline-none" value={managerPassword} onChange={e => setManagerPassword(e.target.value)} autoFocus />
                                        <button onClick={handleAuthorize} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-xs font-bold">OK</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                  )}

                  {limitOverride && <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-green-700 text-xs font-bold flex gap-2"><Unlock size={16}/> Venda Liberada pelo Gerente</div>}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Número de Parcelas</label>
                    <select value={crediarioParcelas} onChange={e => setCrediarioParcelas(Number(e.target.value))} className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 outline-none">
                      {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}x de {(valorFinanciado / n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vencimento da 1ª Parcela</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input type="date" value={primeiroVencimento} onChange={e => setPrimeiroVencimento(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg outline-none" />
                    </div>
                  </div>
                </div>
              )}

              {/* Dinheiro/Crédito seguem o padrão... */}
              {method === 'dinheiro' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Valor Recebido</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                    <input type="number" autoFocus className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-lg font-bold outline-none" value={cashReceived} onChange={e => setCashReceived(Number(e.target.value))}/>
                  </div>
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                    <span className="text-gray-600">Troco:</span>
                    <span className={`text-xl font-bold ${cashReceived >= totalComDesconto ? 'text-green-600' : 'text-red-500'}`}>{(cashReceived - totalComDesconto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                </div>
              )}

              {method === 'credito' && (
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Parcelamento</label>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {[1,2,3,4,5,6,10,12].map(p => (
                      <label key={p} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer ${creditInstallments === p ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                          <input type="radio" checked={creditInstallments === p} onChange={() => setCreditInstallments(p)} className="text-purple-600"/>
                          <span className="font-medium text-gray-800">{p}x de {(totalComDesconto / p).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: RESUMO */}
          {step === 3 && (
            <div className="space-y-6 text-center animate-in zoom-in-95">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-600">
                {limiteExcedido ? <Lock size={32} className="text-red-500" /> : <Wallet size={32} />}
              </div>
              
              <div>
                <p className="text-gray-500 uppercase text-xs font-bold tracking-wider">Valor Final</p>
                <h2 className={`text-3xl font-bold mt-1 ${limiteExcedido ? 'text-red-600' : 'text-gray-900'}`}>
                  {totalComDesconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h2>
                {entryValue > 0 && <p className="text-xs text-orange-600 mt-1 font-bold">Entrada de {entryValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} abatida</p>}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2 text-left">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-bold">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                {usarPontos && <div className="flex justify-between text-green-600"><span>Desconto Pontos</span><span>- {descontoPontos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>}
                
                {entryValue > 0 && <div className="flex justify-between text-orange-600 border-t border-gray-200 pt-2 mt-2"><span>Entrada</span><span className="font-bold">- {entryValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>}

                <div className="border-t border-gray-200 my-2 pt-2 flex justify-between">
                  <span className="text-gray-500">A Financiar</span>
                  <span className="font-bold text-blue-600">{valorFinanciado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          {step === 2 ? (
             <button onClick={handleNextStep} disabled={(method === 'dinheiro' && cashReceived < totalComDesconto)} className={`w-full py-3 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${limiteExcedido ? 'bg-red-500' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {limiteExcedido ? "Ver Detalhes do Limite" : <>Continuar <ChevronRight size={18}/></>}
             </button>
          ) : step === 3 ? (
             <button onClick={handleFinalize} disabled={loading || limiteExcedido} className={`w-full py-3 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${limiteExcedido ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>
                {loading ? <Loader2 className="animate-spin"/> : (limiteExcedido ? <Lock size={20}/> : <CheckCircle size={20}/>)}
                {limiteExcedido ? "Venda Bloqueada" : "Confirmar Venda"}
             </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MethodButton({ icon, label, onClick, color, disabled = false }: any) {
  return (
    <button onClick={onClick} disabled={disabled} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${disabled ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed' : 'border-gray-100 bg-white hover:border-blue-200'}`}>
      <div className={disabled ? "text-gray-300" : color}>{icon}</div>
      <span className="font-bold text-sm text-gray-700">{label}</span>
      {disabled && <span className="text-[10px] text-red-400 font-normal">Requer Cliente</span>}
    </button>
  );
}