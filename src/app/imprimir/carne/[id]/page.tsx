"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/lib/supabase";
import { useParams } from "next/navigation";
import { Loader2, Printer, Scissors } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function ImprimirCarnePage() {
  const params = useParams();
  const supabase = createClient();
  const [venda, setVenda] = useState<any>(null);
  const [parcelas, setParcelas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDados() {
      if (!params.id) return;

      const { data: vendaData } = await supabase
        .from("vendas")
        .select("*, clientes(nome, cpf, endereco)")
        .eq("id", params.id)
        .single();

      const { data: parcelasData } = await supabase
        .from("parcelas")
        .select("*")
        .eq("venda_id", params.id)
        .order("numero_parcela", { ascending: true });

      setVenda(vendaData);
      setParcelas(parcelasData || []);
      setLoading(false);

      setTimeout(() => {
        window.print();
      }, 1000);
    }
    fetchDados();
  }, [params.id]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!venda) return <div>Venda não encontrada.</div>;

  return (
    <div className="absolute inset-0 z-[9999] bg-white w-full min-h-screen top-0 left-0 p-8 text-black print:p-0 print:static">
      
      {/* Botão de Impressão */}
      <div className="print:hidden mb-8 max-w-4xl mx-auto flex justify-end">
        <button 
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg"
        >
          <Printer size={18} /> Imprimir Carnê
        </button>
      </div>

      {/* Container A4 */}
      <div className="max-w-[210mm] mx-auto flex flex-col gap-4"> 
        
        {parcelas.map((parcela) => {
          // Verifica se está pago (Entrada ou baixado)
          const isPago = parcela.status === 'pago';

          return (
            <div 
              key={parcela.id} 
              className="flex border border-black min-h-[120px] text-xs break-inside-avoid relative overflow-hidden"
            >
              
              {/* --- LÓGICA DA MARCA D'ÁGUA --- */}
              {isPago && (
                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                  <div className="border-[6px] border-gray-300 text-gray-300 font-black text-6xl uppercase -rotate-12 opacity-40 px-8 py-2 rounded-xl select-none print:border-gray-400 print:text-gray-400 print:opacity-30">
                    PAGO
                  </div>
                </div>
              )}

              {/* LADO ESQUERDO (CANHOTO) */}
              <div className="w-[35%] border-r border-dashed border-black p-3 flex flex-col justify-between relative bg-gray-50/30 print:bg-transparent z-10">
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 text-black bg-white z-10 p-0.5">
                  <Scissors size={14} className="rotate-90" />
                </div>
                
                <div className="space-y-1">
                  <p className="font-bold text-sm uppercase">NordicCred</p>
                  <p>Parcela: <span className="font-bold text-sm">{parcela.numero_parcela} / {parcelas.length}</span></p>
                  <p>Vencimento:</p>
                  <p className="font-bold text-sm bg-gray-100 print:bg-transparent inline-block px-1 border border-transparent print:border-black/20">
                      {format(parseISO(parcela.data_vencimento), "dd/MM/yyyy")}
                  </p>
                </div>
                <div className="border-t border-black pt-1 mt-2">
                   <p className="text-[10px] uppercase">Valor a Pagar</p>
                   <p className="font-bold text-base">R$ {parcela.valor.toFixed(2)}</p>
                </div>
              </div>

              {/* LADO DIREITO (RECIBO) */}
              <div className="w-[65%] p-3 flex flex-col justify-between z-10">
                
                {/* Cabeçalho */}
                <div className="flex justify-between items-start border-b border-black pb-2 mb-2">
                  <div>
                      <span className="font-bold text-lg block leading-none">NordicCred</span>
                      <span className="text-[10px] text-gray-500">Gestão Inteligente</span>
                  </div>
                  <div className="text-right bg-gray-100 print:bg-transparent px-2 py-1 rounded">
                      <span className="text-[10px] block text-gray-500 uppercase">Valor do Documento</span>
                      <span className="font-bold text-xl leading-none">
                      R$ {parcela.valor.toFixed(2)}
                      </span>
                  </div>
                </div>

                {/* Dados em Grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase font-bold">Vencimento</p>
                    <p className="font-bold text-sm border-b border-gray-300 print:border-black/30">
                      {format(parseISO(parcela.data_vencimento), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase font-bold">Nosso Número</p>
                    <p className="font-mono text-xs border-b border-gray-300 print:border-black/30">
                      {parcela.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[9px] text-gray-500 uppercase font-bold">Pagador</p>
                    <div className="border-b border-gray-300 print:border-black/30 pb-0.5">
                      <p className="uppercase font-bold text-xs truncate">{venda.clientes?.nome}</p>
                    </div>
                  </div>
                </div>

                {/* Rodapé */}
                <div className="mt-auto pt-2 text-[10px] text-gray-500 flex justify-between items-end">
                  <span>Recebemos o valor acima descrito.</span>
                  <span className="font-bold text-black">Parcela {parcela.numero_parcela}/{parcelas.length}</span>
                </div>

              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}