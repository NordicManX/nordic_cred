"use client";

import { AlertTriangle, Loader2, Info } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary" | "warning"; // Adicionei 'warning'
  loading?: boolean;
  showCancel?: boolean; // <--- NOVO: Permite esconder o botão cancelar
}

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  confirmText = "Confirmar", 
  cancelText = "Cancelar",
  variant = "primary",
  loading = false,
  showCancel = true // Padrão é mostrar
}: ConfirmModalProps) {
  if (!isOpen) return null;

  // Define cores baseadas na variante
  const colors = {
    danger: { bg: 'bg-red-100', text: 'text-red-600', button: 'bg-red-600 hover:bg-red-700 shadow-red-200' },
    primary: { bg: 'bg-blue-100', text: 'text-blue-600', button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' },
    warning: { bg: 'bg-orange-100', text: 'text-orange-600', button: 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' }
  };

  const style = colors[variant];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden transform transition-all scale-100">
        
        <div className="p-6 text-center">
          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${style.bg} ${style.text}`}>
            {variant === 'warning' ? <Info size={24} /> : <AlertTriangle size={24} />}
          </div>
          
          <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex gap-3">
          {showCancel && (
            <button 
              onClick={onClose} 
              disabled={loading}
              className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
          )}
          
          <button 
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-70 ${style.button} shadow-lg`}
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  );
}