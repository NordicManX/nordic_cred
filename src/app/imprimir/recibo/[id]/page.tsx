"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/src/lib/supabase";
import { Loader2, AlertCircle, Printer, Info } from "lucide-react";
import { format } from "date-fns";

export default function ImprimirReciboVendaPage() {
  const params = useParams();
  const id = params?.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [dados, setDados] = useState<any>(null);

  useEffect(() => {
    if (id) carregarDadosVenda();
  }, [id]);

  async function carregarDadosVenda() {
    try {
      const { data: venda, error: errVenda } = await supabase
        .from("vendas")
        .select("*, clientes(nome, cpf, telefone, pontos_acumulados)")
        .eq("id", id)
        .single();

      if (errVenda) throw new Error("Venda não encontrada.");

      const { data: itens, error: errItens } = await supabase
        .from("itens_venda")
        .select("*")
        .eq("venda_id", id);

      const { data: parcelas } = await supabase
        .from("parcelas")
        .select("*")
        .eq("venda_id", id);

      const { data: config } = await supabase
        .from("configuracoes")
        .select("*")
        .single();

      setDados({ 
        venda, 
        itens: itens || [], 
        parcelas: parcelas || [], 
        config 
      });

    } catch (err: any) {
      console.error(err);
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!loading && dados) {
      setTimeout(() => {
        window.print();
      }, 800);
    }
  }, [loading, dados]);

  const formatCurrency = (val: number) => val?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';

  // Loading em tela cheia para cobrir sidebar
  if (loading) return (
    <div className="fixed inset-0 z-[9999] bg-gray-100 flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-600" />
    </div>
  );
  
  // Erro em tela cheia
  if (erro || !dados) return (
    <div className="fixed inset-0 z-[9999] bg-gray-100 flex flex-col items-center justify-center text-red-500 gap-2">
        <AlertCircle size={32}/>
        <p>Recibo não encontrado.</p>
    </div>
  );

  const { venda, itens, parcelas, config } = dados;
  const totalParcelado = parcelas.reduce((acc: number, p: any) => acc + p.valor, 0);
  const valorEntrada = Math.max(0, venda.valor_total - totalParcelado);
  const pontosGanhos = Math.floor(venda.valor_total * (config?.pontos_por_real || 1));

  return (
    // "fixed inset-0 z-[9999]" -> FORÇA TELA CHEIA POR CIMA DA SIDEBAR
    <div className="fixed inset-0 z-[9999] bg-gray-200 overflow-y-auto flex flex-col items-center py-10 print:bg-white print:p-0 print:static print:block">
      
      {/* AVISO APENAS NA TELA */}
      <div className="mb-6 bg-white border border-gray-300 text-gray-700 p-4 rounded-lg max-w-md text-sm shadow-sm print:hidden flex gap-3 items-start shrink-0">
        <Info className="shrink-0 mt-0.5 text-blue-600" size={18} />
        <div>
            <p className="font-bold text-gray-900">Configuração de Impressão:</p>
            <p className="mt-1">1. Margens: <strong>"Nenhuma"</strong> ou "Mínima"</p>
            <p>2. Cabeçalhos e rodapés: <strong>Desmarcar</strong></p>
            <button onClick={() => window.print()} className="mt-3 bg-gray-900 text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-black transition-colors text-xs uppercase">
                <Printer size={16}/> Imprimir
            </button>
        </div>
      </div>

      <style jsx global>{`
        /* Importando ROBOTO MONO */
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&display=swap');

        .cupom-fiscal {
            font-family: 'Roboto Mono', 'Courier New', monospace;
            width: 80mm;
            background: #fff;
            padding: 4mm;
            color: #000;
            font-size: 10px;
            line-height: 1.25;
            text-transform: uppercase;
        }

        .preview-shadow {
            box-shadow: 0 10px 30px -10px rgba(0,0,0,0.3);
        }

        .divider {
            border-top: 1px dashed #000;
            margin: 6px 0;
            display: block;
        }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: 700; }
        .flex-between { display: flex; justify-content: space-between; }

        @media print {
            @page { margin: 0; size: auto; }
            body { margin: 0; padding: 0; background: white; }
            
            body * { visibility: hidden; }
            
            #area-impressao, #area-impressao * { 
                visibility: visible; 
            }
            #area-impressao {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                max-width: 80mm;
                margin: 0 auto;
                padding: 0;
                box-shadow: none;
            }
        }
      `}</style>

      {/* ÁREA DE IMPRESSÃO */}
      <div id="area-impressao" className="cupom-fiscal preview-shadow">
        
        {/* CABEÇALHO */}
        <div className="text-center">
          <div className="font-bold" style={{ fontSize: '14px', marginBottom: '2px' }}>NORDICCRED</div>
          <div style={{ fontSize: '9px' }}>Rua da Tecnologia, 123 - Centro</div>
          <div style={{ fontSize: '9px' }}>CNPJ: 00.000.000/0001-00</div>
          <div className="divider"></div>
          <div className="font-bold">COMPROVANTE DE VENDA</div>
          <div className="divider"></div>
        </div>

        {/* DADOS */}
        <div style={{ fontSize: '10px' }}>
            <div className="flex-between"><span>DATA:</span> <span>{format(new Date(venda.data_venda), "dd/MM/yyyy HH:mm")}</span></div>
            <div className="flex-between"><span>VENDA:</span> <span>#{venda.id.slice(0, 6)}</span></div>
            <div className="divider"></div>
            <div>CLI: {venda.clientes?.nome?.slice(0, 25) || "CONSUMIDOR FINAL"}</div>
            {venda.clientes?.cpf && <div>CPF: {venda.clientes.cpf}</div>}
        </div>

        <div className="divider"></div>

        {/* ITENS */}
        <div style={{ marginBottom: '6px' }}>
            {itens.map((item: any, i: number) => (
              <div key={i} style={{ marginBottom: '4px' }}>
                <div className="font-bold">{item.produto_nome.slice(0, 35)}</div>
                <div className="flex-between" style={{ paddingLeft: '0', fontSize: '10px' }}>
                    <span>{item.quantidade} x {formatCurrency(item.valor_unitario)}</span>
                    <span>{formatCurrency(item.quantidade * item.valor_unitario)}</span>
                </div>
              </div>
            ))}
        </div>

        <div className="divider"></div>

        {/* TOTAIS */}
        <div className="flex-between"><span>SUBTOTAL</span> <span>{formatCurrency(venda.valor_total + (venda.desconto || 0))}</span></div>
        {venda.desconto > 0 && <div className="flex-between"><span>DESCONTO</span> <span>-{formatCurrency(venda.desconto)}</span></div>}
        
        <div className="flex-between font-bold" style={{ fontSize: '12px', marginTop: '6px' }}>
            <span>TOTAL A PAGAR</span> 
            <span>{formatCurrency(venda.valor_total)}</span>
        </div>

        <div className="divider"></div>

        {/* PAGAMENTO */}
        <div style={{ marginTop: '4px' }}>
            <div className="text-center font-bold" style={{ marginBottom: '4px' }}>FORMA DE PAGAMENTO</div>
            
            {venda.forma_pagamento === 'crediario' ? (
                <>
                    {valorEntrada > 0.01 && (
                        <div className="flex-between"><span>ENTRADA</span> <span>{formatCurrency(valorEntrada)}</span></div>
                    )}
                    {parcelas.length > 0 ? (
                        <div style={{ marginTop: '2px' }}>
                            {parcelas.map((p: any) => (
                                <div key={p.id} className="flex-between" style={{ fontSize: '9px' }}>
                                    <span>{p.numero_parcela}x {format(new Date(p.data_vencimento), "dd/MM/yy")}</span>
                                    <span>{formatCurrency(p.valor)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-between"><span>A PRAZO</span> <span>{formatCurrency(venda.valor_total - valorEntrada)}</span></div>
                    )}
                </>
            ) : (
                <div className="flex-between">
                    <span>{venda.forma_pagamento}</span>
                    <span>{formatCurrency(venda.valor_total)}</span>
                </div>
            )}
        </div>

        {/* FIDELIDADE */}
        {venda.clientes && (
            <div style={{ marginTop: '10px', borderTop: '1px dashed #000', paddingTop: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px' }}>FIDELIDADE NORDIC</div>
                <div className="font-bold">GANHOU: {pontosGanhos} | SALDO: {venda.clientes.pontos_acumulados}</div>
            </div>
        )}

        <div className="text-center" style={{ marginTop: '15px', fontSize: '9px' }}>
          <div>OBRIGADO PELA PREFERENCIA</div>
          <div>*** NORDIC TECH ***</div>
        </div>

      </div>
    </div>
  );
}