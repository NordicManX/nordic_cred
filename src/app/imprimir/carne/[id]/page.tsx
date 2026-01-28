"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/src/lib/supabase";
import { Loader2, AlertCircle, Printer, Scissors, Info } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function ImprimirCarnePage() {
  const params = useParams();
  const id = params?.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [dados, setDados] = useState<any>(null);

  useEffect(() => {
    if (id) carregarDados();
  }, [id]);

  async function carregarDados() {
    try {
      const { data: venda, error: errVenda } = await supabase
        .from("vendas")
        .select("*, clientes(*)")
        .eq("id", id)
        .single();

      if (errVenda) throw new Error("Venda não encontrada.");

      const { data: parcelas, error: errParcelas } = await supabase
        .from("parcelas")
        .select("*")
        .eq("venda_id", id)
        .order("numero_parcela", { ascending: true });

      setDados({ venda, parcelas: parcelas || [] });

    } catch (err: any) {
      console.error(err);
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Formata data evitando erros
  const formatarData = (dataStr: string) => {
    if (!dataStr) return "--/--";
    try { return format(parseISO(dataStr), "dd/MM/yyyy"); } catch { return dataStr; }
  };

  if (loading) return <div className="fixed inset-0 z-[99999] bg-zinc-800 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>;
  
  if (erro || !dados) return (
    <div className="fixed inset-0 z-[99999] bg-zinc-800 flex flex-col items-center justify-center text-red-400 gap-2">
        <AlertCircle size={32}/>
        <p>{erro}</p>
    </div>
  );

  const { venda, parcelas } = dados;
  const cliente = venda.clientes || {};

  // Lógica de Paginação (4 parcelas por folha A4)
  const PARCELAS_POR_FOLHA = 4;
  const paginas = [];
  for (let i = 0; i < parcelas.length; i += PARCELAS_POR_FOLHA) {
    paginas.push(parcelas.slice(i, i + PARCELAS_POR_FOLHA));
  }

  return (
    <div className="screen-container">
      
      {/* AVISO DE TELA (Configuração) */}
      <div className="no-print bg-white p-4 rounded-lg shadow-xl mb-8 flex flex-col gap-2 max-w-md border border-gray-200 animate-in slide-in-from-top-5">
        <div className="flex items-center gap-2 text-blue-600 font-bold">
            <Info size={20}/> Configuração de Impressão:
        </div>
        <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
            <li>Papel: <strong>A4</strong></li>
            <li>Margens: <strong>Padrão</strong> ou <strong>Nenhuma</strong></li>
            <li>Escala: <strong>100%</strong></li>
        </ul>
        <button onClick={() => window.print()} className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors">
            <Printer size={18} /> Imprimir Carnê
        </button>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');

        /* CONFIGURAÇÃO DA TELA (PREVIEW) */
        .screen-container {
            position: fixed;
            inset: 0;
            z-index: 99999; /* Cobre tudo */
            background-color: #52525b; /* Fundo cinza escuro */
            display: flex;
            flex-direction: column;
            align-items: center;
            overflow-y: auto;
            padding: 40px 0;
        }

        /* FOLHA A4 NA TELA */
        .a4-page {
            background: white;
            width: 210mm;
            min-height: 297mm;
            padding: 10mm; /* Margem interna segura */
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            font-family: 'Roboto', sans-serif;
            color: black;
            margin-bottom: 20px;
            display: flex;
            flex-direction: column;
        }

        /* ESTILO DA TIRA (PARCELA) */
        .carne-row {
            display: flex;
            width: 100%;
            border-bottom: 1px dashed #000; /* Linha de corte */
            padding-bottom: 10px;
            margin-bottom: 10px;
            height: 60mm; /* Altura fixa para caber 4 */
        }

        /* CANHOTO (ESQUERDA) */
        .canhoto {
            width: 30%;
            border-right: 1px dashed #000;
            padding-right: 10px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        /* RECIBO (DIREITA) */
        .recibo {
            width: 70%;
            padding-left: 10px;
            display: flex;
            flex-direction: column;
        }

        /* CAIXINHAS DE DADOS (TIPO BOLETO) */
        .box {
            border: 1px solid #000;
            padding: 2px 4px;
            margin-bottom: 3px;
            background: #fff;
            min-height: 28px;
        }
        
        .box-label {
            font-size: 7px;
            text-transform: uppercase;
            color: #333;
            font-weight: bold;
            line-height: 1;
        }

        .box-value {
            font-size: 11px;
            font-weight: bold;
            color: #000;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.2;
        }

        .header-logo {
            font-weight: 900;
            font-size: 16px;
            text-transform: uppercase;
            border-bottom: 2px solid #000;
            margin-bottom: 5px;
        }

        /* CONFIGURAÇÃO DE IMPRESSÃO */
        @media print {
            @page { 
                size: A4; 
                margin: 0; /* Remove margens do navegador */
            }
            
            body { 
                background: white !important; 
                margin: 0 !important; 
            }
            
            /* Esconde tudo que não seja a página A4 */
            body * { visibility: hidden; }

            /* Reposiciona o container */
            .screen-container {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                background: none !important;
                display: block;
                overflow: visible;
                padding: 0;
                margin: 0;
            }

            /* Mostra as páginas */
            .a4-page, .a4-page * {
                visibility: visible;
            }

            .a4-page {
                width: 100%;
                height: 297mm; /* Força altura total */
                margin: 0;
                padding: 10mm; /* Margem de impressão */
                box-shadow: none;
                page-break-after: always; /* PULA PÁGINA DEPOIS DE CADA FOLHA */
                position: relative;
                left: 0;
                top: 0;
            }
            
            /* Remove a quebra da última página para não sair folha em branco */
            .a4-page:last-child {
                page-break-after: auto;
            }

            .no-print { display: none !important; }
        }
      `}</style>

      {/* Renderiza as Páginas */}
      {paginas.map((grupoParcelas, indexPagina) => (
        <div key={indexPagina} className="a4-page">
            
            {/* CABEÇALHO DA FOLHA */}
            <div className="text-center mb-4 pb-2 border-b-2 border-black">
                <h1 className="text-2xl font-black uppercase">CARNÊ DE PAGAMENTO - NORDICCRED</h1>
                <div className="flex justify-between text-xs mt-1 px-4">
                    <span><strong>Cliente:</strong> {cliente.nome}</span>
                    <span><strong>CPF:</strong> {cliente.cpf || '---'}</span>
                    <span><strong>Venda:</strong> #{venda.id.slice(0,6).toUpperCase()}</span>
                </div>
            </div>

            {/* PARCELAS DA PÁGINA */}
            <div className="flex-1">
                {grupoParcelas.map((p: any) => (
                    <div key={p.id} className="carne-row">
                        
                        {/* LADO ESQUERDO (CANHOTO) */}
                        <div className="canhoto">
                            <div className="header-logo text-xs">NORDIC</div>
                            
                            <div className="box">
                                <div className="box-label">Vencimento</div>
                                <div className="box-value text-center">{formatarData(p.data_vencimento)}</div>
                            </div>
                            
                            <div className="box">
                                <div className="box-label">Valor</div>
                                <div className="box-value text-center">R$ {p.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                            </div>

                            <div className="box">
                                <div className="box-label">Parcela</div>
                                <div className="box-value text-center">{p.numero_parcela} / {parcelas.length}</div>
                            </div>

                            <div className="text-[8px] text-center mt-auto">
                                Controle da Loja
                            </div>
                        </div>

                        {/* LADO DIREITO (RECIBO) */}
                        <div className="recibo">
                            {/* Cabeçalho da Parcela */}
                            <div className="flex justify-between items-center border-b-2 border-black mb-2 pb-1">
                                <span className="font-black text-lg">NORDICCRED</span>
                                <span className="text-[10px] font-bold bg-gray-200 px-2 py-1 rounded">RECIBO DO PAGADOR</span>
                            </div>

                            <div className="grid grid-cols-4 gap-1">
                                {/* Linha 1 */}
                                <div className="col-span-3 box bg-gray-50">
                                    <div className="box-label">Local de Pagamento</div>
                                    <div className="box-value">PAGÁVEL PREFERENCIALMENTE NA LOJA</div>
                                </div>
                                <div className="col-span-1 box">
                                    <div className="box-label">Vencimento</div>
                                    <div className="box-value text-right font-black">{formatarData(p.data_vencimento)}</div>
                                </div>

                                {/* Linha 2 */}
                                <div className="col-span-3 box">
                                    <div className="box-label">Beneficiário / Loja</div>
                                    <div className="box-value">NordicTech Solutions</div>
                                </div>
                                <div className="col-span-1 box">
                                    <div className="box-label">Valor Documento</div>
                                    <div className="box-value text-right font-black">R$ {p.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                                </div>

                                {/* Linha 3 */}
                                <div className="col-span-1 box">
                                    <div className="box-label">Data Doc.</div>
                                    <div className="box-value">{formatarData(venda.data_venda)}</div>
                                </div>
                                <div className="col-span-1 box">
                                    <div className="box-label">Nº Documento</div>
                                    <div className="box-value">{venda.id.slice(0,6)}-{p.numero_parcela}</div>
                                </div>
                                <div className="col-span-1 box">
                                    <div className="box-label">Espécie</div>
                                    <div className="box-value">R$</div>
                                </div>
                                <div className="col-span-1 box">
                                    <div className="box-label">Parcela</div>
                                    <div className="box-value text-center">{p.numero_parcela} / {parcelas.length}</div>
                                </div>

                                {/* Linha 4 - Sacado */}
                                <div className="col-span-4 box h-auto min-h-[35px]">
                                    <div className="box-label">Pagador (Cliente)</div>
                                    <div className="box-value text-xs uppercase">
                                        {cliente.nome} - CPF: {cliente.cpf || 'Não Informado'}
                                    </div>
                                    <div className="box-value text-[9px] font-normal text-gray-500">
                                        {cliente.endereco || 'Endereço não cadastrado'}
                                    </div>
                                </div>
                            </div>

                            {/* Rodapé da Parcela */}
                            <div className="mt-auto flex justify-between items-end pt-1">
                                <div className="text-[8px] text-gray-500">
                                    Multa de 2% após vencimento.
                                </div>
                                <div className="text-[8px] font-bold">
                                    Autenticação Mecânica
                                </div>
                            </div>
                        </div>

                        {/* Ícone de Tesoura */}
                        <div className="absolute left-[30%] -ml-3 top-1/2 hidden print:block text-gray-400">
                            <Scissors size={16} style={{ transform: 'rotate(90deg)' }} />
                        </div>
                    </div>
                ))}
            </div>

            {/* RODAPÉ DA PÁGINA */}
            <div className="text-center text-[10px] text-gray-400 mt-2">
                Folha {indexPagina + 1} de {paginas.length}
            </div>
        </div>
      ))}

    </div>
  );
}