"use client";

import { X, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  valor: number;
  loading: boolean;
}

export function ConfirmPaymentModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  valor, 
  loading 
}: ConfirmPaymentModalProps) {
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100">
        
        {/* Cabeçalho */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-2 text-gray-800 font-bold">
            <div className="bg-green-100 p-1.5 rounded-lg text-green-700">
              <CheckCircle size={18} />
            </div>
            Confirmar Recebimento
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 text-center space-y-4">
          <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-green-600 mb-2">
            <span className="text-2xl font-bold">$</span>
          </div>
          
          <div>
            <p className="text-gray-600">Você está prestes a dar baixa no valor de:</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg flex items-start gap-3 text-left">
            <AlertTriangle size={18} className="text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-800">
              Essa ação irá registrar a entrada no caixa e não poderá ser desfeita automaticamente.
            </p>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-sm shadow-green-900/10"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Receber Valor"}
          </button>
        </div>

      </div>
    </div>
  );
}