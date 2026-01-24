"use client";

import { X, MapPin, Phone, CreditCard, User } from "lucide-react";

interface ClientDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: any | null;
}

export function ClientDetailsModal({ isOpen, onClose, cliente }: ClientDetailsModalProps) {
  if (!isOpen || !cliente) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        
        <div className="bg-blue-600 px-6 py-6 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white">
            <X size={24} />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold backdrop-blur-md">
              {cliente.nome.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-xl">{cliente.nome}</h3>
              <p className="text-blue-100 text-sm">Cliente desde {new Date(cliente.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3">
             <div className="p-2 bg-gray-100 rounded-lg text-gray-500"><CreditCard size={20}/></div>
             <div>
                <p className="text-xs text-gray-400 uppercase font-bold">CPF</p>
                <p className="text-gray-900 font-medium">{cliente.cpf}</p>
             </div>
          </div>

          <div className="flex items-start gap-3">
             <div className="p-2 bg-gray-100 rounded-lg text-gray-500"><Phone size={20}/></div>
             <div>
                <p className="text-xs text-gray-400 uppercase font-bold">Telefone</p>
                <p className="text-gray-900 font-medium">{cliente.telefone || "Não informado"}</p>
             </div>
          </div>

          <div className="flex items-start gap-3">
             <div className="p-2 bg-gray-100 rounded-lg text-gray-500"><MapPin size={20}/></div>
             <div>
                <p className="text-xs text-gray-400 uppercase font-bold">Endereço</p>
                <p className="text-gray-900 font-medium">{cliente.endereco || "Não informado"}</p>
             </div>
          </div>

          <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
             <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400">Pontos</p>
                <p className="text-xl font-bold text-blue-600">{cliente.pontos_acumulados || 0}</p>
             </div>
             <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400">Status</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold ${cliente.status === 'bloqueado' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {cliente.status === 'bloqueado' ? 'BLOQUEADO' : 'EM DIA'}
                </span>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}