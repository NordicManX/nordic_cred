"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/src/lib/supabase";
import { Loader2, CheckCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function ImprimirReciboPage() {
  const params = useParams();
  const id = params?.id as string;
  const supabase = createClient();
  const [parcela, setParcela] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchDados();
  }, [id]);

  async function fetchDados() {
    const { data } = await supabase
      .from("parcelas")
      .select(`*, clientes:clientes!fk_parcelas_clientes_oficial (nome, cpf), vendas:vendas!fk_parcelas_vendas_oficial (id)`)
      .eq("id", id)
      .single();
    setParcela(data);
    setLoading(false);
    
    if (data) {
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <Loader2 className="animate-spin text-blue-600" />
    </div>
  );

  if (!parcela) return <div className="p-10 text-center">Recibo não encontrado.</div>;

  return (
    <div className="print-screen-wrapper">
      <style jsx global>{`
        /* 1. RESET TOTAL DE TELA */
        html, body { 
          margin: 0 !important; 
          padding: 0 !important;
          background-color: #f3f4f6 !important; /* Cor de fundo da tela (cinza) */
        }

        /* 2. CENTRALIZAÇÃO NA TELA (PC) */
        .print-screen-wrapper {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          min-height: 100vh;
          padding: 40px 0;
        }

        .recibo-papel {
          width: 80mm;
          background: white;
          padding: 10mm 5mm;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          font-family: 'Courier New', Courier, monospace;
          color: black;
        }

        .divider { 
          border-top: 1px dashed black; 
          margin: 10px 0;
          width: 100%;
        }

        /* 3. A MÁGICA DA IMPRESSÃO (O TIRO DE CANHÃO) */
        @media print {
          /* Esconde TUDO o que estiver no body */
          body * {
            visibility: hidden;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Força o wrapper e o papel a ficarem visíveis e resetados */
          .print-screen-wrapper, 
          .print-screen-wrapper *,
          .recibo-papel, 
          .recibo-papel * {
            visibility: visible !important;
          }

          /* Posiciona o papel exatamente no canto superior esquerdo da folha */
          .print-screen-wrapper {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 80mm !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            display: block !important;
          }

          .recibo-papel {
            width: 80mm !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 5mm !important;
            border: none !important;
          }

          @page { 
            margin: 0; 
            size: 80mm auto; 
          }
        }
      `}</style>

      {/* ELEMENTO QUE SERÁ IMPRESSO */}
      <div className="recibo-papel">
        
        {/* Cabeçalho */}
        <div className="text-center">
          <h1 className="text-xl font-bold">NORDICCRED</h1>
          <p className="text-[11px]">Gestão Inteligente de Crediário</p>
          <div className="divider" />
          <p className="font-bold text-sm">COMPROVANTE DE PAGAMENTO</p>
          <div className="divider" />
        </div>

        {/* Dados */}
        <div className="w-full text-[12px] space-y-1.5 mt-2">
          <div className="flex justify-between">
            <span>DATA PAGO:</span>
            <span className="font-bold">
              {parcela.data_pagamento ? format(parseISO(parcela.data_pagamento), "dd/MM/yyyy HH:mm") : format(new Date(), "dd/MM/yyyy HH:mm")}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>VENDA:</span>
            <span className="font-bold">#{parcela.vendas?.id.slice(0, 8).toUpperCase()}</span>
          </div>

          <div className="flex justify-between">
            <span>PARCELA:</span>
            <span className="font-bold">{parcela.numero_parcela}ª via</span>
          </div>

          <div className="divider" />

          <div className="flex flex-col">
            <span>CLIENTE:</span>
            <span className="font-bold uppercase leading-tight">{parcela.clientes?.nome}</span>
            <span>CPF: {parcela.clientes?.cpf}</span>
          </div>

          <div className="divider" />

          <div className="flex justify-between items-center py-2">
            <span className="text-sm font-bold">VALOR RECEBIDO:</span>
            <span className="text-xl font-bold">R$ {parcela.valor.toFixed(2)}</span>
          </div>

          <div className="divider" />
        </div>

        {/* Rodapé */}
        <div className="text-center w-full mt-4">
          <div className="flex justify-center mb-2">
            {/* Usando um SVG simples para garantir que apareça na impressão */}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <p className="font-bold text-sm uppercase">PAGAMENTO CONFIRMADO</p>
          <p className="text-[10px] mt-4 uppercase">Obrigado pela preferência!</p>
          <p className="text-[10px] font-bold">www.nordictech.tech</p>
        </div>

      </div>
    </div>
  );
}