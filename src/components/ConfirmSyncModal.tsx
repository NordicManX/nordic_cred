"use client";

import { X, Database, AlertTriangle, Loader2, DownloadCloud } from "lucide-react";

interface ConfirmSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export function ConfirmSyncModal({ isOpen, onClose, onConfirm, loading }: ConfirmSyncModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 scale-100">
        
        {/* Cabeçalho */}
        <div className="bg-gray-800 px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Database size={20} className="text-blue-300" />
            Sincronizar Base NCM
          </div>
          <button 
            onClick={onClose} 
            disabled={loading}
            className="text-gray-400 hover:text-white hover:bg-white/10 p-1 rounded-full transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-5">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
              <DownloadCloud size={32} />
            </div>
            <div>
              <h3 className="text-gray-900 font-bold text-lg">Atualizar Tabela IBPT/NCM?</h3>
              <p className="text-gray-500 text-sm mt-1">
                Isso irá baixar e atualizar cerca de <strong>13.000 registros</strong> fiscais no seu banco de dados.
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg flex gap-3 border border-yellow-100 text-left">
            <AlertTriangle size={18} className="text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800">
              O processo pode levar alguns segundos. Não feche a página durante a sincronização para evitar dados incompletos.
            </p>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Baixando...
              </>
            ) : (
              <>
                <Database size={18} />
                Confirmar e Baixar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}