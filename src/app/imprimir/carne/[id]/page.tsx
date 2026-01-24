"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/src/lib/supabase";
import { Loader2, AlertTriangle, Scissors } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function ImprimirCarnePage() {
  const params = useParams();
  const id = params?.id as string;
  
  const supabase = createClient();
  const [venda, setVenda] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erroDetalhe, setErroDetalhe] = useState<string>("");

  useEffect(() => {
    if (id) fetchVenda();
  }, [id]);

  async function fetchVenda() {
    if (id === 'avulso' || id === 'undefined' || !id) {
        setErroDetalhe(`ID inválido: "${id}"`);
        setLoading(false);
        return;
    }

    try {
        const { data: vendaData, error } = await supabase
          .from("vendas")
          .select(`
            *,
            clientes:clientes!fk_vendas_clientes_oficial (nome, cpf, endereco),
            parcelas:parcelas!fk_parcelas_vendas_oficial (*)
          `)
          .eq("id", id)
          .single();

        if (error) throw error;
        if (!vendaData) throw new Error("Venda não encontrada.");

        setVenda(vendaData);
        setTimeout(() => window.print(), 1000);

    } catch (err: any) {
        console.error(err);
        setErroDetalhe(err.message);
    } finally {
        setLoading(false);
    }
  }

  const formatarData = (dataString: string | null) => {
    if (!dataString) return "--/--/----";
    try { return format(parseISO(dataString), "dd/MM/yyyy"); } catch { return "Data Inválida"; }
  };

  if (loading) return <div className="h-screen flex items-center justify-center gap-2 bg-white fixed top-0 left-0 w-full z-[9999]"><Loader2 className="animate-spin text-blue-600"/> Carregando...</div>;
  if (!venda) return <div className="p-10 text-center bg-white fixed top-0 left-0 w-full h-full z-[9999]">Erro ao carregar.</div>;

  const parcelasOrdenadas = venda.parcelas?.sort((a: any, b: any) => a.numero_parcela - b.numero_parcela) || [];
  const totalParcelas = parcelasOrdenadas.length;
  const PARCELAS_POR_PAGINA = 4; 
  const paginas = [];
  
  for (let i = 0; i < parcelasOrdenadas.length; i += PARCELAS_POR_PAGINA) {
    paginas.push(parcelasOrdenadas.slice(i, i + PARCELAS_POR_PAGINA));
  }

  return (
    <div id="print-area" className="bg-white text-black font-mono text-sm">
      <style jsx global>{`
        /* REGRA DE OURO: Bloqueia a UI do Layout (Sidebar) 
           Tanto na tela (screen) quanto na impressão (print)
        */
        
        /* Esconde barras de rolagem padrão do navegador na popup */
        html, body {
            margin: 0;
            padding: 0;
            background: white !important;
            overflow-x: hidden;
        }

        /* Tenta esconder elementos comuns de sidebar/header por tag */
        nav, aside, header, footer, .sidebar {
            display: none !important;
        }

        /* Garante que nossa área ocupe tudo e fique por cima */
        #print-area {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            min-height: 100vh;
            background: white;
            z-index: 99999; /* Valor altíssimo para cobrir Sidebar */
            padding: 20px;
        }

        @media print {
          @page { margin: 0; size: A4; }
          
          /* Esconde tudo do body */
          body * { visibility: hidden; }
          
          /* Mostra só nosso container */
          #print-area, #print-area * { visibility: visible; }
          
          #print-area {
            position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0;
          }

          .pagina-a4 {
            height: 100vh;
            page-break-after: always;
            padding: 1.5cm;
            display: flex;
            flex-direction: column;
          }
          
          .pagina-a4:last-child {
            page-break-after: auto;
          }

          .no-print { display: none !important; }
        }

        .serrilhado {
            background-image: linear-gradient(to bottom, #9ca3af 50%, rgba(255, 255, 255, 0) 0%);
            background-position: right;
            background-size: 1px 12px;
            background-repeat: repeat-y;
        }
      `}</style>

      {paginas.map((grupoParcelas, indicePagina) => (
        <div key={indicePagina} className="pagina-a4 bg-white relative max-w-[21cm] mx-auto mb-10 border border-gray-100 shadow-lg print:shadow-none print:border-0 print:mb-0">
            
            {/* CABEÇALHO */}
            <div className="text-center border-b-2 border-black pb-4 mb-6">
                <h1 className="text-3xl font-bold uppercase tracking-wider">NordicCred</h1>
                <p className="text-sm uppercase mt-1 font-bold text-gray-600">
                    Carnê de Pagamento {paginas.length > 1 ? `(Folha ${indicePagina + 1}/${paginas.length})` : ''}
                </p>
            </div>

            {/* DADOS DO CLIENTE */}
            <div className="mb-6 bg-gray-50 border border-gray-300 p-4 rounded-sm">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-gray-500">Cliente</p>
                        <p className="font-bold text-lg leading-tight">{venda.clientes?.nome}</p>
                        <p className="text-sm">{venda.clientes?.cpf}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-gray-500">Referência</p>
                        <p className="font-bold text-lg">#{venda.id.slice(0,8).toUpperCase()}</p>
                        <p className="text-sm">Total da Venda: R$ {venda.valor_total.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {/* LISTA DE PARCELAS */}
            <div className="space-y-5 flex-1">
                {grupoParcelas.map((p: any) => (
                <div key={p.id} className="flex border border-gray-400 relative overflow-hidden rounded-sm h-32">
                    
                    {p.status === 'pago' && (
                        <div className="absolute right-12 top-4 z-20 print:block">
                            <span className="font-bold text-green-700 border-2 border-green-700 px-3 py-1 rounded uppercase text-xs bg-white rotate-[-10deg] inline-block">
                                PAGO
                            </span>
                        </div>
                    )}

                    {/* CANHOTO */}
                    <div className="w-[100px] bg-gray-100 p-2 flex flex-col justify-between relative serrilhado border-r border-gray-300 text-[10px] print:bg-gray-50">
                        <div className="absolute -right-[9px] top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-[2px] border border-gray-200 hidden print:block">
                            <Scissors size={12} className="text-gray-400 rotate-90" />
                        </div>
                        <div className="text-center">
                            <span className="font-bold block text-gray-500">PARCELA</span>
                            <span className="text-lg font-black">{p.numero_parcela}/{totalParcelas}</span>
                        </div>
                        <div className="text-center">
                            <span className="block text-gray-500">VALOR</span>
                            <span className="font-bold block">R$ {p.valor.toFixed(2)}</span>
                        </div>
                        <div className="text-center">
                            <span className="block text-gray-500">VENC.</span>
                            <span className="font-bold block">{formatarData(p.data_vencimento).slice(0,5)}</span>
                        </div>
                    </div>

                    {/* LÂMINA */}
                    <div className="flex-1 p-3 bg-white flex flex-col justify-between">
                        <div className="flex justify-between items-start border-b border-dashed border-gray-200 pb-2">
                            <div>
                                <h3 className="text-xl font-bold uppercase">NordicCred</h3>
                                <p className="text-[10px] text-gray-500">Parcela {p.numero_parcela} de {totalParcelas} - Via do Cliente</p>
                            </div>
                            <div className="text-right">
                                <h3 className="text-2xl font-bold text-gray-800">R$ {p.valor.toFixed(2)}</h3>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-gray-400">Vencimento</p>
                                <p className="font-bold text-base">{formatarData(p.data_vencimento)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] uppercase font-bold text-gray-400">Cliente</p>
                                <p className="font-bold truncate max-w-[200px] ml-auto">{venda.clientes?.nome}</p>
                            </div>
                        </div>
                        <div className="text-[9px] text-gray-400 text-right mt-1 font-mono">
                            Ref: {venda.id.slice(0,8)}-P{p.numero_parcela}
                        </div>
                    </div>
                </div>
                ))}
            </div>

            {/* RODAPÉ */}
            {indicePagina === paginas.length - 1 && (
                <div className="mt-4 pt-4 border-t-2 border-black text-right">
                    <p className="text-lg">Total Financiado: <strong>R$ {venda.valor_total.toFixed(2)}</strong></p>
                    <p className="text-[10px] text-gray-400 mt-2 text-center">NordicCred - Sistema Inteligente</p>
                </div>
            )}
            
            {indicePagina < paginas.length - 1 && (
                 <div className="mt-4 text-center text-xs text-gray-400 italic">
                    Continua na próxima folha...
                 </div>
            )}
        </div>
      ))}
    </div>
  );
}