"use client";

import { X, Banknote, AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmAvistaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  total: number;
  clienteNome: string | null; // Se null, mostraremos "Consumidor Final"
  loading: boolean;
}

export function ConfirmAvistaModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  total, 
  clienteNome, 
  loading 
}: ConfirmAvistaModalProps) {
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100">
        
        {/* Cabeçalho */}
        <div className="bg-green-600 px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2 font-bold">
            <Banknote size={24} className="text-green-100" />
            Confirmar Venda à Vista
          </div>
          <button onClick={onClose} className="hover:bg-green-700 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 text-center space-y-5">
          
          <div>
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Valor Total</p>
            <p className="text-4xl font-bold text-gray-900 mt-1">
              {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-left">
            <p className="text-xs text-gray-500 mb-1">Cliente Vinculado</p>
            <p className="font-bold text-gray-800 flex items-center gap-2">
              {clienteNome ? (
                 <span className="text-blue-600">{clienteNome}</span>
              ) : (
                 <span className="text-gray-500 italic">Consumidor Final (Sem cadastro)</span>
              )}
            </p>
          </div>

          {!clienteNome && (
            <div className="flex items-start gap-2 bg-yellow-50 p-3 rounded-lg text-left">
              <AlertTriangle size={16} className="text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-xs text-yellow-700">
                Esta venda será registrada como anônima. Pontos de fidelidade não serão computados para um cliente específico.
              </p>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-900/10"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Finalizar Venda"}
          </button>
        </div>

      </div>
    </div>
  );
}