"use client";

import { useState, useEffect } from "react";
import { 
  X, CreditCard, Banknote, Calendar, CheckCircle, 
  ArrowLeft, ChevronRight, Wallet, QrCode, Loader2 
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
  
  // --- DETALHES DE CADA MÉTODO ---
  // Crédito
  const [creditInstallments, setCreditInstallments] = useState(1);
  // Dinheiro
  const [cashReceived, setCashReceived] = useState(0);
  // Crediário
  const [crediarioParcelas, setCrediarioParcelas] = useState(1);
  const [primeiroVencimento, setPrimeiroVencimento] = useState("");

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setMethod(null);
      setCreditInstallments(1);
      setCashReceived(total); // Sugere o valor exato
      setCrediarioParcelas(1);
      
      // Data padrão crediário (30 dias)
      const hoje = new Date();
      hoje.setDate(hoje.getDate() + 30);
      setPrimeiroVencimento(hoje.toISOString().split('T')[0]);
    }
  }, [isOpen, total]);

  if (!isOpen) return null;

  // --- NAVEGAÇÃO ---
  const handleMethodSelect = (m: PaymentMethod) => {
    setMethod(m);
    // Se for PIX ou Débito, pula direto pro resumo (Step 3)
    if (m === 'pix' || m === 'debito') {
      setStep(3);
    } else {
      setStep(2);
    }
  };

  const handleNextStep = () => setStep(3);
  const handleBack = () => {
    if (step === 3 && (method === 'pix' || method === 'debito')) {
        setStep(1); // Volta pro início
    } else {
        setStep(prev => (prev - 1) as 1 | 2 | 3);
    }
  };

  const handleFinalize = () => {
    // Monta o objeto final da venda
    const dados = {
      forma_pagamento: method,
      detalhes: {
        parcelas: method === 'credito' ? creditInstallments : (method === 'crediario' ? crediarioParcelas : 1),
        valor_recebido: method === 'dinheiro' ? cashReceived : total,
        troco: method === 'dinheiro' ? (cashReceived - total) : 0,
        primeiro_vencimento: method === 'crediario' ? primeiroVencimento : null
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
              <p className="text-xs text-gray-500">Total: <strong className="text-green-600 text-sm">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
        </div>

        {/* CORPO (CONTEÚDO VARIÁVEL) */}
        <div className="p-6 overflow-y-auto">
          
          {/* STEP 1: SELEÇÃO */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              <MethodButton 
                icon={<Banknote size={24}/>} 
                label="Dinheiro" 
                onClick={() => handleMethodSelect('dinheiro')} 
                color="text-green-600"
              />
              <MethodButton 
                icon={<QrCode size={24}/>} 
                label="PIX" 
                onClick={() => handleMethodSelect('pix')} 
                color="text-teal-600"
              />
              <MethodButton 
                icon={<CreditCard size={24}/>} 
                label="Débito" 
                onClick={() => handleMethodSelect('debito')} 
                color="text-blue-600"
              />
              <MethodButton 
                icon={<CreditCard size={24}/>} 
                label="Crédito" 
                onClick={() => handleMethodSelect('credito')} 
                color="text-purple-600"
              />
              <MethodButton 
                icon={<Wallet size={24}/>} 
                label="Crediário (Loja)" 
                onClick={() => handleMethodSelect('crediario')} 
                color="text-orange-600"
                disabled={!cliente} // Só libera se tiver cliente
              />
            </div>
          )}

          {/* STEP 2: DETALHES */}
          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              
              {/* Dinheiro: Troco */}
              {method === 'dinheiro' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Valor Recebido do Cliente</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                    <input 
                      type="number" 
                      autoFocus
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-lg font-bold outline-none focus:ring-2 focus:ring-green-500"
                      value={cashReceived}
                      onChange={e => setCashReceived(Number(e.target.value))}
                    />
                  </div>
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                    <span className="text-gray-600">Troco:</span>
                    <span className={`text-xl font-bold ${cashReceived >= total ? 'text-green-600' : 'text-red-500'}`}>
                      {(cashReceived - total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
              )}

              {/* Crédito: Parcelas */}
              {method === 'credito' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Opções de Parcelamento</label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {[1,2,3,4,5,6,10,12].map(p => (
                      <label key={p} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${creditInstallments === p ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <div className="flex items-center gap-3">
                          <input 
                            type="radio" 
                            name="installments" 
                            checked={creditInstallments === p} 
                            onChange={() => setCreditInstallments(p)}
                            className="text-purple-600 focus:ring-purple-500"
                          />
                          <span className="font-medium text-gray-800">{p}x de {(total / p).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                        {p === 1 && <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded">À Vista</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Crediário: Parcelas e Vencimento */}
              {method === 'crediario' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Número de Parcelas</label>
                    <select 
                      value={crediarioParcelas}
                      onChange={e => setCrediarioParcelas(Number(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                    >
                      {[1,2,3,4,5,6].map(n => (
                        <option key={n} value={n}>{n}x Parcelas</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vencimento da 1ª Parcela</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                        type="date"
                        value={primeiroVencimento}
                        onChange={e => setPrimeiroVencimento(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                        />
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
                <p className="text-gray-500 uppercase text-xs font-bold tracking-wider">Valor Total</p>
                <h2 className="text-3xl font-bold text-gray-900 mt-1">
                  {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h2>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Forma de Pagamento</span>
                  <span className="font-bold text-gray-800 capitalize">{method}</span>
                </div>
                
                {method === 'dinheiro' && (
                  <div className="flex justify-between text-green-600">
                    <span>Troco Estimado</span>
                    <span className="font-bold">{(Math.max(0, cashReceived - total)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                )}
                
                {method === 'credito' && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Parcelamento</span>
                    <span className="font-bold text-gray-800">{creditInstallments}x (Cartão)</span>
                  </div>
                )}

                {method === 'crediario' && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Condição</span>
                    <span className="font-bold text-gray-800">{crediarioParcelas}x no Boleto/Carnê</span>
                  </div>
                )}
                
                {cliente && (
                   <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                     <span className="text-gray-500">Cliente</span>
                     <span className="font-bold text-blue-600">{cliente.nome}</span>
                   </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ (BOTÕES) */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          {step === 2 ? (
             <button 
                onClick={handleNextStep}
                disabled={method === 'dinheiro' && cashReceived < total}
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

// Componente auxiliar de botão
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