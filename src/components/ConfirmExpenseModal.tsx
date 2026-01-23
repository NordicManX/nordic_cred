"use client";

import { X, CheckCircle, AlertTriangle, Loader2, DollarSign } from "lucide-react";

interface ConfirmExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  valor: number;
  descricao: string;
  loading: boolean;
}

export function ConfirmExpenseModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  valor, 
  descricao,
  loading 
}: ConfirmExpenseModalProps) {
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100">
        
        {/* Cabeçalho */}
        <div className="bg-red-600 px-6 py-4 border-b border-red-700 flex justify-between items-center">
          <div className="flex items-center gap-2 text-white font-bold">
            <DollarSign size={20} className="text-red-200" />
            Confirmar Pagamento
          </div>
          <button onClick={onClose} className="text-red-100 hover:text-white hover:bg-white/20 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 text-center space-y-4">
          
          <div>
            <p className="text-gray-500 text-sm">Você está prestes a pagar:</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-sm font-medium text-gray-600 mt-2 bg-gray-100 py-1 px-3 rounded-full inline-block">
              Referente a: {descricao}
            </p>
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg flex items-start gap-3 text-left border border-yellow-100">
            <AlertTriangle size={18} className="text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-800">
              Esta ação registrará a saída no caixa e mudará o status para <b>PAGO</b>.
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
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-sm shadow-red-900/10"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Confirmar Pagamento"}
          </button>
        </div>

      </div>
    </div>
  );
}