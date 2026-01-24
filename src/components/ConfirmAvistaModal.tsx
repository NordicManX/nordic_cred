"use client";

import { useEffect, useState } from "react";
import { Loader2, DollarSign, Trophy, ArrowRight } from "lucide-react";
import { Cliente } from "@/src/types"; // Certifique-se de importar o tipo correto ou usar 'any'

interface ConfirmAvistaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pontosUsados: number, valorFinal: number) => void;
  total: number;
  cliente: Cliente | null; // Recebendo o objeto completo do cliente
  loading?: boolean;
}

export function ConfirmAvistaModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  total, 
  cliente,
  loading = false
}: ConfirmAvistaModalProps) {
  
  const [usarPontos, setUsarPontos] = useState(false);
  const [pontosParaUsar, setPontosParaUsar] = useState(0);

  // Regras da Gamificação
  const VALOR_POR_PONTO = 1.00; // 1 Ponto vale R$ 1,00
  
  // Limites
  const maxPontosCliente = cliente?.pontos_acumulados || 0;
  // O máximo que ele pode usar é o que ele tem, limitado ao valor total da compra (não pode dar troco negativo)
  const maxPontosPermitidos = Math.min(maxPontosCliente, Math.floor(total / VALOR_POR_PONTO));

  const descontoPontos = pontosParaUsar * VALOR_POR_PONTO;
  const valorFinal = total - descontoPontos;
  const novosPontosGanhos = Math.floor(valorFinal / 10); // Ganha pontos sobre o que PAGOU em dinheiro

  // Reseta ao abrir
  useEffect(() => {
    if (isOpen) {
      setUsarPontos(false);
      setPontosParaUsar(0);
    }
  }, [isOpen, total]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        
        <div className="bg-gray-50 p-6 text-center border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800">Finalizar Venda à Vista</h3>
          <p className="text-sm text-gray-500 mt-1">Confirme os valores abaixo</p>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Valor Original */}
          <div className="flex justify-between items-center text-gray-600">
            <span>Subtotal</span>
            <span className="font-medium">
              {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>

          {/* Área de Gamificação */}
          {cliente && maxPontosCliente > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-700 font-bold">
                  <Trophy size={18} />
                  <span>Saldo de Pontos: {maxPontosCliente}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={usarPontos}
                    onChange={(e) => {
                      setUsarPontos(e.target.checked);
                      if (e.target.checked) {
                        setPontosParaUsar(maxPontosPermitidos); // Já sugere usar o máximo possível
                      } else {
                        setPontosParaUsar(0);
                      }
                    }}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {usarPontos && (
                <div className="animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-2">
                    <input 
                      type="range" 
                      min="1" 
                      max={maxPontosPermitidos} 
                      value={pontosParaUsar}
                      onChange={(e) => setPontosParaUsar(Number(e.target.value))}
                      className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-600">Usar {pontosParaUsar} pts</span>
                    <span className="font-bold text-green-600">- {descontoPontos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resumo Final */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-500 text-sm">A Pagar</span>
              <span className="text-3xl font-bold text-gray-900">
                {valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            
            {cliente && (
              <div className="flex items-center justify-end gap-1 text-xs text-green-600 font-medium">
                <span>Ganhará +{novosPontosGanhos} pontos</span>
                <Trophy size={12} />
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-50 flex gap-3">
          <button 
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onConfirm(pontosParaUsar, valorFinal)}
            disabled={loading}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200 transition-all"
          >
            {loading ? <Loader2 className="animate-spin" /> : <DollarSign size={20} />}
            Confirmar Pagamento
          </button>
        </div>
      </div>
    </div>
  );
}