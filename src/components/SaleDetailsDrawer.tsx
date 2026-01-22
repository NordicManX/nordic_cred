"use client";

import { useEffect, useState } from "react";
import { X, ShoppingBag, User, Calendar, Tag, Loader2 } from "lucide-react";
import { createClient } from "@/src/lib/supabase";
import { format, parseISO } from "date-fns";
import { Parcela } from "@/src/types";

interface SaleDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  parcela: Parcela | null;
}

export function SaleDetailsDrawer({ isOpen, onClose, parcela }: SaleDetailsDrawerProps) {
  const supabase = createClient();
  const [itens, setItens] = useState<any[]>([]);
  const [totalParcelas, setTotalParcelas] = useState(0); // <--- NOVO ESTADO
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchDetalhes() {
      if (!parcela?.venda_id) return;
      
      setLoading(true);

      // 1. Busca os Itens (Produtos)
      const { data: itensData } = await supabase
        .from("itens_venda")
        .select("*")
        .eq("venda_id", parcela.venda_id);

      if (itensData) setItens(itensData);

      // 2. Busca o Total de Parcelas dessa Venda (Para mostrar 1/10)
      const { count } = await supabase
        .from("parcelas")
        .select("*", { count: "exact", head: true }) // head: true conta sem baixar os dados
        .eq("venda_id", parcela.venda_id);
      
      if (count) setTotalParcelas(count);

      setLoading(false);
    }

    if (isOpen && parcela) {
      fetchDetalhes();
    } else {
      setItens([]);
      setTotalParcelas(0);
    }
  }, [isOpen, parcela]);

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 z-[70] bg-gray-900/20 backdrop-blur-[1px] transition-opacity duration-300
          ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className={`fixed top-0 right-0 z-[80] h-full w-full md:w-[450px] bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 ease-in-out flex flex-col
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Detalhes da Venda</h2>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
              ID: {parcela?.venda_id.slice(0, 8)}...
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo Rolável */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Cliente */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <User size={16} className="text-blue-600" />
              Dados do Cliente
            </h3>
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <p className="font-bold text-gray-900 text-lg">{parcela?.clientes?.nome}</p>
              <div className="flex gap-4 mt-2 text-sm text-gray-600">
                <span>CPF: <span className="font-mono text-gray-800">{parcela?.clientes?.cpf}</span></span>
              </div>
            </div>
          </div>

          {/* Resumo da Parcela */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Tag size={16} className="text-purple-600" />
              Sobre esta Parcela
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Vencimento</p>
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  <Calendar size={14} />
                  {parcela?.data_vencimento && format(parseISO(parcela.data_vencimento), "dd/MM/yyyy")}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Valor</p>
                <p className="font-bold text-gray-900">
                  {parcela?.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <div className="col-span-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Parcela Atual</p>
                
                {/* --- AQUI ESTÁ A MUDANÇA VISUAL --- */}
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-blue-600">{parcela?.numero_parcela}</span>
                  <span className="text-sm text-gray-400 font-medium">/ {totalParcelas}</span>
                  <span className="text-sm text-gray-600 font-medium ml-1">parcela do crediário</span>
                </div>
                
              </div>
            </div>
          </div>

          {/* Itens da Venda */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <ShoppingBag size={16} className="text-orange-600" />
              Itens Comprados (Origem)
            </h3>
            
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {loading ? (
                <div className="p-8 flex justify-center text-gray-400">
                  <Loader2 className="animate-spin" />
                </div>
              ) : itens.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm">
                  Nenhum item encontrado.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {itens.map((item) => (
                    <div key={item.id} className="p-3 flex justify-between items-center hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="bg-gray-100 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500">
                          {item.quantidade}x
                        </div>
                        <p className="text-sm font-medium text-gray-700">{item.produto_nome}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {(item.valor_unitario * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                  ))}
                  <div className="p-3 bg-gray-50 flex justify-between items-center border-t border-gray-200">
                    <span className="text-xs font-bold text-gray-500 uppercase">Total da Compra Original</span>
                    <span className="text-sm font-bold text-gray-900">
                      {itens.reduce((acc, i) => acc + (i.valor_unitario * i.quantidade), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}