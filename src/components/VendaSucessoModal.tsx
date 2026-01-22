"use client";

import { Printer, FileText, CheckCircle, X, Receipt } from "lucide-react";

interface VendaSucessoModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendaId: string | null;
  tipoVenda: 'avista' | 'crediario';
}

export function VendaSucessoModal({ isOpen, onClose, vendaId, tipoVenda }: VendaSucessoModalProps) {
  if (!isOpen) return null;

  // Função Simples de Impressão (Abre uma janela em branco para simular)
  const handleImprimir = (tipo: 'cupom' | 'carne') => {
    // Aqui no futuro você criará uma página /imprimir/cupom/[id]
    // Por enquanto vamos simular o alerta ou abrir uma janela
    if (tipo === 'cupom') {
      window.open(`/imprimir/comprovante/${vendaId}`, '_blank', 'width=300,height=600');
    } else {
      window.open(`/imprimir/carne/${vendaId}`, '_blank', 'width=800,height=600');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm text-center overflow-hidden animate-in fade-in zoom-in duration-300">
        
        <div className="p-8 pb-6">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={48} />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900">Venda Finalizada!</h2>
          <p className="text-gray-500 mt-2">
            A venda foi registrada com sucesso no sistema. O que deseja fazer?
          </p>
        </div>

        <div className="bg-gray-50 p-6 space-y-3 border-t border-gray-100">
          
          {/* Botão Principal: Imprimir Comprovante (Sempre aparece) */}
          <button
            onClick={() => handleImprimir('cupom')}
            className="w-full py-3 bg-white border-2 border-blue-100 hover:border-blue-600 hover:text-blue-700 text-gray-700 rounded-xl font-bold transition-all flex items-center justify-center gap-3 group"
          >
            <Printer size={20} className="text-gray-400 group-hover:text-blue-600" />
            Imprimir Comprovante
          </button>

          {/* Botão Carnê (Só aparece se for Crediário) */}
          {tipoVenda === 'crediario' && (
            <button
              onClick={() => handleImprimir('carne')}
              className="w-full py-3 bg-white border-2 border-purple-100 hover:border-purple-600 hover:text-purple-700 text-gray-700 rounded-xl font-bold transition-all flex items-center justify-center gap-3 group"
            >
              <Receipt size={20} className="text-gray-400 group-hover:text-purple-600" />
              Imprimir Carnê
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 text-gray-400 hover:text-gray-600 font-medium text-sm mt-2"
          >
            Fechar e Nova Venda
          </button>
        </div>
      </div>
    </div>
  );
}