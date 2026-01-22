"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/lib/supabase";
import { useParams } from "next/navigation";
import { Loader2, Printer } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function ImprimirComprovantePage() {
  const params = useParams();
  const supabase = createClient();
  const [venda, setVenda] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDados() {
      if (!params.id) return;

      // 1. Busca Venda e Cliente
      const { data: vendaData } = await supabase
        .from("vendas")
        .select("*, clientes(nome, cpf)")
        .eq("id", params.id)
        .single();

      // 2. Busca Itens
      const { data: itensData } = await supabase
        .from("itens_venda")
        .select("*")
        .eq("venda_id", params.id);

      setVenda(vendaData);
      setItens(itensData || []);
      setLoading(false);

      // Auto-imprimir com delay para carregar estilos
      setTimeout(() => {
        window.print();
      }, 800);
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
    <div className="fixed inset-0 z-[9999] bg-white flex justify-center overflow-y-auto">
      
      {/* --- CSS ESPECÍFICO PARA IMPRESSORAS TÉRMICAS 80mm --- 
         Isso remove cabeçalhos do navegador e zera as margens.
      */}
      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto; /* Largura 80mm, Altura automática */
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
          /* Esconde botões na impressão */
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Container Principal: 
          - Na tela: centralizado com sombra e fundo cinza atrás.
          - Na impressão: largura exata de 80mm, fundo branco.
      */}
      <div className="w-[80mm] bg-white p-2 text-black font-mono text-[11px] leading-tight print:w-[80mm] print:shadow-none shadow-xl min-h-screen">
        
        {/* Cabeçalho */}
        <div className="text-center mb-2 pb-2 border-b border-black border-dashed">
          <h1 className="font-bold text-sm uppercase">NordicCred</h1>
          <p>Rua da Tecnologia, 123</p>
          <p>CNPJ: 00.000.000/0001-00</p>
          <p className="mt-1 font-bold">
            {format(parseISO(venda.data_venda), "dd/MM/yyyy HH:mm")}
          </p>
          <p className="mt-1">
             Venda: #{venda.id.slice(0,8).toUpperCase()}
          </p>
        </div>

        {/* Cliente */}
        <div className="mb-2 pb-2 border-b border-black border-dashed">
          <p className="font-bold">CONSUMIDOR:</p>
          <p>{venda.clientes?.nome}</p>
          <p>CPF: {venda.clientes?.cpf}</p>
        </div>

        {/* Itens */}
        <div className="mb-2 pb-2 border-b border-black border-dashed">
          <table className="w-full text-left">
            <thead>
              <tr className="font-bold">
                <th className="w-[50%]">ITEM</th>
                <th className="text-right w-[20%]">QTD</th>
                <th className="text-right w-[30%]">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id}>
                  <td className="py-0.5 pr-1 truncate max-w-[100px]">{item.produto_nome}</td>
                  <td className="text-right align-top">{item.quantidade}</td>
                  <td className="text-right align-top">
                    {(item.valor_unitario * item.quantidade).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totais */}
        <div className="text-right mb-4">
          <p className="text-sm font-bold">TOTAL: R$ {venda.valor_total.toFixed(2)}</p>
          <p className="text-[10px] mt-1">Forma: {venda.forma_pagamento === 'avista' ? 'À VISTA' : 'CREDIÁRIO'}</p>
        </div>

        {/* Rodapé Fiscal Falso */}
        <div className="text-center text-[10px] mt-4 mb-8">
          <p className="font-bold">*** NÃO É DOCUMENTO FISCAL ***</p>
          <p className="mt-1">Controle Interno - Sem valor fiscal</p>
          <p className="mt-2 font-bold">Volte Sempre!</p>
          <p>www.nordictech.com.br</p>
        </div>

        {/* Botão para Reimprimir (Aparece na tela, some no papel) */}
        <button 
          onClick={() => window.print()}
          className="no-print w-full mt-4 bg-black text-white py-2 rounded font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
        >
          <Printer size={16} /> Imprimir (80mm)
        </button>

      </div>
    </div>
  );
}