"use client";

import { useState, useEffect } from "react";
import { 
  X, CreditCard, Banknote, Calendar, CheckCircle, 
  ArrowLeft, ChevronRight, Wallet, QrCode, Loader2, Trophy 
} from "lucide-react";
import { Cliente } from "@/src/types";

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
  
  // --- ESTADOS DO FLUXO ---
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [method, setMethod] = useState<PaymentMethod>(null);
  
  // --- GAMIFICAÇÃO (PONTOS) ---
  const [usarPontos, setUsarPontos] = useState(false);
  const [descontoPontos, setDescontoPontos] = useState(0);

  // --- DETALHES DE CADA MÉTODO ---
  const [creditInstallments, setCreditInstallments] = useState(1);
  const [cashReceived, setCashReceived] = useState(0);
  const [crediarioParcelas, setCrediarioParcelas] = useState(1);
  const [primeiroVencimento, setPrimeiroVencimento] = useState("");

  // Valor final considerando o desconto de pontos
  const totalComDesconto = Math.max(0, total - descontoPontos);

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setMethod(null);
      setCreditInstallments(1);
      setCashReceived(total); 
      setCrediarioParcelas(1);
      
      // Reset gamificação
      setUsarPontos(false);
      setDescontoPontos(0);

      const hoje = new Date();
      hoje.setDate(hoje.getDate() + 30);
      setPrimeiroVencimento(hoje.toISOString().split('T')[0]);
    }
  }, [isOpen, total]);

  // Atualiza cashReceived se o total mudar (por causa do desconto)
  useEffect(() => {
    if (method === 'dinheiro') {
        setCashReceived(totalComDesconto);
    }
  }, [totalComDesconto, method]);

  if (!isOpen) return null;

  // --- LÓGICA DE PONTOS ---
  // 100 Pontos = R$ 1,00
  const TAXA_CONVERSAO = 100;
  const saldoEmReais = cliente ? Math.floor((cliente.pontos_acumulados || 0) / TAXA_CONVERSAO) : 0;

  const togglePontos = () => {
    if (!usarPontos) {
      // Ativar: Usa o máximo possível até zerar a conta
      const desconto = Math.min(saldoEmReais, total);
      setDescontoPontos(desconto);
    } else {
      // Desativar
      setDescontoPontos(0);
    }
    setUsarPontos(!usarPontos);
  };

  // --- NAVEGAÇÃO ---
  const handleMethodSelect = (m: PaymentMethod) => {
    setMethod(m);
    if (m === 'pix' || m === 'debito') {
      setStep(3);
    } else {
      setStep(2);
    }
  };

  const handleNextStep = () => setStep(3);
  const handleBack = () => {
    if (step === 3 && (method === 'pix' || method === 'debito')) {
        setStep(1);
    } else {
        setStep(prev => (prev - 1) as 1 | 2 | 3);
    }
  };

  const handleFinalize = () => {
    const dados = {
      forma_pagamento: method,
      detalhes: {
        parcelas: method === 'credito' ? creditInstallments : (method === 'crediario' ? crediarioParcelas : 1),
        valor_recebido: method === 'dinheiro' ? cashReceived : totalComDesconto,
        troco: method === 'dinheiro' ? (cashReceived - totalComDesconto) : 0,
        primeiro_vencimento: method === 'crediario' ? primeiroVencimento : null,
        // Envia dados do resgate de pontos
        pontos_usados: usarPontos ? (descontoPontos * TAXA_CONVERSAO) : 0,
        desconto_aplicado: descontoPontos
      }
    };
    onConfirm(dados);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* CABEÇALHO */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button onClick={handleBack} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
            )}
            <div>
              <h3 className="font-bold text-lg text-gray-900">
                {step === 1 && "Forma de Pagamento"}
                {step === 2 && "Detalhes do Pagamento"}
                {step === 3 && "Confirmar Venda"}
              </h3>
              <div className="flex items-center gap-2">
                 <p className="text-xs text-gray-500">Total:</p>
                 {usarPontos ? (
                    <div className="flex items-center gap-1 text-sm">
                        <span className="line-through text-gray-400">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        <span className="font-bold text-green-600">{totalComDesconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                 ) : (
                    <strong className="text-green-600 text-sm">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                 )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
        </div>

        {/* CORPO */}
        <div className="p-6 overflow-y-auto">
          
          {/* ÁREA DE GAMIFICAÇÃO (Sempre visível no Step 1 se tiver pontos) */}
          {step === 1 && cliente && (cliente.pontos_acumulados || 0) >= 100 && (
              <div className="bg-purple-50 border border-purple-100 p-3 rounded-xl mb-6 shadow-sm">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-full text-purple-600">
                      <Trophy size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">Saldo Fidelidade</p>
                      <p className="text-xs text-purple-600">
                        Cliente tem <strong>{cliente.pontos_acumulados} pts</strong>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Pode resgatar</p>
                    <p className="text-sm font-bold text-purple-700">R$ {saldoEmReais.toFixed(2)}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-purple-200 pt-2">
                  <label className="text-sm text-gray-700 flex items-center gap-2 cursor-pointer select-none font-medium hover:text-purple-700 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={usarPontos} 
                      onChange={togglePontos}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                    />
                    Usar saldo como desconto
                  </label>
                  {usarPontos && (
                    <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">- R$ {descontoPontos.toFixed(2)}</span>
                  )}
                </div>
              </div>
          )}

          {/* STEP 1: SELEÇÃO */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              <MethodButton 
                icon={<Banknote size={24}/>} label="Dinheiro" onClick={() => handleMethodSelect('dinheiro')} color="text-green-600"
              />
              <MethodButton 
                icon={<QrCode size={24}/>} label="PIX" onClick={() => handleMethodSelect('pix')} color="text-teal-600"
              />
              <MethodButton 
                icon={<CreditCard size={24}/>} label="Débito" onClick={() => handleMethodSelect('debito')} color="text-blue-600"
              />
              <MethodButton 
                icon={<CreditCard size={24}/>} label="Crédito" onClick={() => handleMethodSelect('credito')} color="text-purple-600"
              />
              <MethodButton 
                icon={<Wallet size={24}/>} label="Crediário (Loja)" onClick={() => handleMethodSelect('crediario')} color="text-orange-600" disabled={!cliente}
              />
            </div>
          )}

          {/* STEP 2: DETALHES */}
          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              
              {/* Dinheiro */}
              {method === 'dinheiro' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Valor Recebido</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                    <input 
                      type="number" autoFocus
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-lg font-bold outline-none focus:ring-2 focus:ring-green-500"
                      value={cashReceived}
                      onChange={e => setCashReceived(Number(e.target.value))}
                    />
                  </div>
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                    <span className="text-gray-600">Troco:</span>
                    <span className={`text-xl font-bold ${cashReceived >= totalComDesconto ? 'text-green-600' : 'text-red-500'}`}>
                      {(cashReceived - totalComDesconto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
              )}

              {/* Crédito */}
              {method === 'credito' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Parcelamento (Cartão)</label>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {[1,2,3,4,5,6,10,12].map(p => (
                      <label key={p} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${creditInstallments === p ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <div className="flex items-center gap-3">
                          <input type="radio" name="installments" checked={creditInstallments === p} onChange={() => setCreditInstallments(p)} className="text-purple-600 focus:ring-purple-500"/>
                          <span className="font-medium text-gray-800">{p}x de {(totalComDesconto / p).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                        {p === 1 && <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded">À Vista</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Crediário */}
              {method === 'crediario' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Número de Parcelas</label>
                    <select value={crediarioParcelas} onChange={e => setCrediarioParcelas(Number(e.target.value))} className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 outline-none">
                      {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}x Parcelas</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vencimento da 1ª Parcela</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input type="date" value={primeiroVencimento} onChange={e => setPrimeiroVencimento(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: RESUMO FINAL */}
          {step === 3 && (
            <div className="space-y-6 text-center animate-in zoom-in-95">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-600">
                {method === 'dinheiro' && <Banknote size={32} />}
                {method === 'pix' && <QrCode size={32} />}
                {method === 'debito' && <CreditCard size={32} />}
                {method === 'credito' && <CreditCard size={32} />}
                {method === 'crediario' && <Wallet size={32} />}
              </div>
              
              <div>
                <p className="text-gray-500 uppercase text-xs font-bold tracking-wider">Valor Final</p>
                <h2 className="text-3xl font-bold text-gray-900 mt-1">
                  {totalComDesconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h2>
                {usarPontos && <p className="text-xs text-green-600 mt-1 font-medium">Desconto de Fidelidade Aplicado</p>}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-bold text-gray-800">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                
                {usarPontos && (
                    <div className="flex justify-between text-green-600">
                        <span className="flex items-center gap-1"><Trophy size={12}/> Desconto (Pontos)</span>
                        <span className="font-bold">- {descontoPontos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                )}
                
                <div className="border-t border-gray-200 my-2 pt-2 flex justify-between">
                  <span className="text-gray-500">A Pagar</span>
                  <span className="font-bold text-blue-600">{totalComDesconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>

                {method === 'dinheiro' && (
                  <div className="flex justify-between text-green-600 pt-2 border-t border-gray-200">
                    <span>Troco</span>
                    <span className="font-bold">{(Math.max(0, cashReceived - totalComDesconto)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                )}
                
                {cliente && (
                    <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                      <span className="text-gray-500">Cliente</span>
                      <span className="font-bold text-gray-800">{cliente.nome}</span>
                    </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          {step === 2 ? (
             <button 
                onClick={handleNextStep}
                disabled={method === 'dinheiro' && cashReceived < totalComDesconto}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
             >
                Continuar <ChevronRight size={18}/>
             </button>
          ) : step === 3 ? (
             <button 
                onClick={handleFinalize}
                disabled={loading}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200 transition-all"
             >
                {loading ? <Loader2 className="animate-spin"/> : <CheckCircle size={20}/>}
                Confirmar Venda
             </button>
          ) : null}
        </div>

      </div>
    </div>
  );
}

function MethodButton({ icon, label, onClick, color, disabled = false }: any) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${disabled ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed' : 'border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50 cursor-pointer shadow-sm hover:shadow-md'}`}
    >
      <div className={disabled ? "text-gray-300" : color}>{icon}</div>
      <span className="font-bold text-sm text-gray-700">{label}</span>
      {disabled && <span className="text-[10px] text-red-400 font-normal">Requer Cliente</span>}
    </button>
  );
}