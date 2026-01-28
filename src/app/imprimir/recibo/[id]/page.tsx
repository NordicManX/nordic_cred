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

  // Auto-print removido para você conferir a tela antes.
  // useEffect(() => {
  //   if (!loading && dados) {
  //     setTimeout(() => { window.print(); }, 800);
  //   }
  // }, [loading, dados]);

  const formatCurrency = (val: number) => val?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';

  if (loading) return <div className="fixed inset-0 z-[99999] bg-zinc-800 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>;
  
  if (erro || !dados) return (
    <div className="fixed inset-0 z-[99999] bg-zinc-800 flex flex-col items-center justify-center text-red-400 gap-2">
        <AlertCircle size={32}/>
        <p>Recibo não encontrado.</p>
    </div>
  );

  const { venda, itens, parcelas, config } = dados;
  
  const metodoPagamento = (venda.forma_pagamento || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const detalhes = venda.detalhes || {};
  const valorTotal = venda.valor_total;
  const valorRecebido = detalhes.valor_recebido !== undefined ? detalhes.valor_recebido : valorTotal;
  const troco = detalhes.troco || 0;
  const totalParcelado = parcelas.reduce((acc: number, p: any) => acc + p.valor, 0);
  const valorEntrada = Math.max(0, valorTotal - totalParcelado);
  const pontosGanhos = venda.pontos_ganhos || detalhes.pontos_ganhos_estimados || Math.floor(valorTotal * (config?.pontos_por_real || 1));

  return (
    // TELA DE FUNDO (VISUALIZAÇÃO)
    <div className="fixed inset-0 z-[99999] bg-zinc-700 overflow-y-auto flex flex-col items-center py-10 print:p-0 print:bg-white print:overflow-visible print:static">
      
      {/* AVISO DE CONFIGURAÇÃO (SOMENTE TELA) */}
      <div className="no-print bg-white border border-gray-300 text-gray-800 p-4 rounded-lg max-w-md text-sm shadow-xl flex gap-3 items-start shrink-0 mb-6 animate-in slide-in-from-top-4">
        <Info className="shrink-0 mt-0.5 text-blue-600" size={18} />
        <div>
            <p className="font-bold">Dica de Impressão:</p>
            <p className="mt-1">1. Margens: <strong>"Nenhuma"</strong></p>
            <p>2. Cabeçalhos e rodapés: <strong>Desmarcar</strong></p>
            <button onClick={() => window.print()} className="mt-3 bg-zinc-900 text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-black transition-colors text-xs uppercase shadow-md w-full justify-center">
                <Printer size={16}/> Imprimir Agora
            </button>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');

        /* --- ESTILO NA TELA --- */
        .cupom-fiscal {
            font-family: 'Courier Prime', 'Courier New', monospace;
            width: 80mm;
            min-height: 100mm;
            background: #fff;
            padding: 5mm;
            color: #000;
            font-size: 11px;
            line-height: 1.2;
            text-transform: uppercase;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); /* Sombra bonita na tela */
        }

        .divider { 
            border-bottom: 1px dashed #000; 
            margin: 6px 0; 
            width: 100%;
            display: block; 
        }
        
        .flex-between { display: flex; justify-content: space-between; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }

        /* --- O SEGREDO DA IMPRESSÃO CENTRALIZADA --- */
        @media print {
            @page { margin: 0; size: auto; }
            
            /* 1. Esconde TUDO na tela */
            body {
                background-color: white !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            body * {
                visibility: hidden;
            }

            /* 2. Mostra APENAS o recibo */
            #area-impressao, #area-impressao * {
                visibility: visible;
            }

            /* 3. Centraliza ABSOLUTAMENTE na folha */
            #area-impressao {
                position: absolute;
                left: 0;
                right: 0;
                top: 0;
                margin: 0 auto; /* ISSO CENTRALIZA HORIZONTALMENTE */
                
                width: 80mm; /* Garante a largura correta */
                box-shadow: none; /* Remove a sombra do papel */
                padding: 5mm; /* Mantém o espaçamento interno */
                background: white;
            }

            /* Esconde o aviso */
            .no-print { display: none !important; }
        }
      `}</style>

      {/* ÁREA DE IMPRESSÃO */}
      <div id="area-impressao" className="cupom-fiscal">
        
        {/* CABEÇALHO */}
        <div className="text-center">
          <div className="font-bold" style={{ fontSize: '14px' }}>NORDICCRED</div>
          <div style={{ fontSize: '10px' }}>Rua da Tecnologia, 123 - Centro</div>
          <div style={{ fontSize: '10px' }}>CNPJ: 00.000.000/0001-00</div>
          <div className="divider"></div>
          <div className="font-bold">COMPROVANTE DE VENDA</div>
          <div className="divider"></div>
        </div>

        {/* DADOS GERAIS */}
        <div style={{ fontSize: '10px' }}>
            <div className="flex-between"><span>DATA:</span> <span>{format(new Date(venda.data_venda), "dd/MM/yyyy HH:mm")}</span></div>
            <div className="flex-between"><span>VENDA:</span> <span>#{venda.id.slice(0, 6).toUpperCase()}</span></div>
            <div className="divider"></div>
            <div>CLI: {venda.clientes?.nome?.slice(0, 25).toUpperCase() || "CONSUMIDOR FINAL"}</div>
            {venda.clientes?.cpf && <div>CPF: {venda.clientes.cpf}</div>}
        </div>

        <div className="divider"></div>

        {/* ITENS */}
        <div className="mb-1">
            <div className="flex-between font-bold" style={{ fontSize: '10px', marginBottom: '4px' }}>
                <span>ITEM</span>
                <span>TOTAL</span>
            </div>
            {itens.map((item: any, i: number) => (
              <div key={i} style={{ marginBottom: '4px' }}>
                <div className="font-bold">{item.produto_nome.slice(0, 30).toUpperCase()}</div>
                <div className="flex-between" style={{ fontSize: '10px' }}>
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
        
        <div className="divider"></div>
        <div className="flex-between font-bold" style={{ fontSize: '14px' }}>
            <span>TOTAL A PAGAR</span> 
            <span>{formatCurrency(valorTotal)}</span>
        </div>

        {/* PAGAMENTO */}
        <div style={{ marginTop: '8px' }}>
            <div className="text-center font-bold mb-1" style={{ fontSize: '10px' }}>FORMA DE PAGAMENTO</div>
            
            {/* DINHEIRO */}
            {metodoPagamento === 'dinheiro' && (
                <>
                    <div className="flex-between">
                        <span>DINHEIRO</span>
                        <span>{formatCurrency(valorRecebido)}</span>
                    </div>
                    {troco > 0 && (
                        <div className="flex-between font-bold">
                            <span>TROCO</span>
                            <span>{formatCurrency(troco)}</span>
                        </div>
                    )}
                </>
            )}

            {/* PIX / CARTÃO */}
            {['pix', 'credito', 'debito'].includes(metodoPagamento) && (
                <div className="flex-between uppercase">
                    <span>{venda.forma_pagamento}</span>
                    <span>{formatCurrency(valorTotal)}</span>
                </div>
            )}

            {/* CREDIÁRIO */}
            {metodoPagamento === 'crediario' && (
                <>
                    {valorEntrada > 0.01 ? (
                        <div className="flex-between">
                            <span>ENTRADA</span> 
                            <span>{formatCurrency(valorEntrada)}</span>
                        </div>
                    ) : (
                        null
                    )}

                    {parcelas.length > 0 && (
                        <div style={{ marginTop: '4px' }}>
                            {parcelas.map((p: any) => (
                                <div key={p.id} className="flex-between" style={{ fontSize: '10px' }}>
                                    <span>{p.numero_parcela}x {format(new Date(p.data_vencimento), "dd/MM/yy")}</span>
                                    <span>{formatCurrency(p.valor)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>

        <div className="divider"></div>

        {/* FIDELIDADE */}
        {venda.clientes && (
            <div className="text-center" style={{ marginTop: '5px', padding: '4px', border: '1px dashed #000' }}>
                <div style={{ fontSize: '10px' }}>PROGRAMA FIDELIDADE</div>
                <div className="font-bold">GANHOU: {pontosGanhos} PONTOS</div>
                <div>SALDO: {venda.clientes.pontos_acumulados} PONTOS</div>
            </div>
        )}

        <div className="text-center" style={{ marginTop: '15px', fontSize: '9px' }}>
          <div>OBRIGADO PELA PREFERENCIA!</div>
          <div>Sistema: NordicTech</div>
        </div>
        <div className="text-center" style={{ marginTop: '20px' }}>.</div>

      </div>
    </div>
  );
}