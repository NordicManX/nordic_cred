"use client";

import { useEffect, useState, useRef } from "react";
import { CheckCircle, Printer, X, FileText, ArrowRight } from "lucide-react";
import { createClient } from "@/src/lib/supabase";
import { format } from "date-fns";

interface VendaSucessoModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendaId: string | null;
  formaPagamento: string;
}

export function VendaSucessoModal({ isOpen, onClose, vendaId, formaPagamento }: VendaSucessoModalProps) {
  const supabase = createClient();
  const [venda, setVenda] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [parcelas, setParcelas] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  
  // Ref para impressão do CUPOM TÉRMICO
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && vendaId) {
      fetchDadosCompletos();
    }
  }, [isOpen, vendaId]);

  async function fetchDadosCompletos() {
    // 1. Buscar Venda e Cliente
    const { data: vendaData } = await supabase
      .from("vendas")
      .select("*, clientes(nome, cpf, telefone, pontos_acumulados)")
      .eq("id", vendaId)
      .single();
    
    // 2. Buscar Itens
    const { data: itensData } = await supabase
      .from("itens_venda")
      .select("*")
      .eq("venda_id", vendaId);

    // 3. Buscar Parcelas
    const { data: parcelasData } = await supabase
      .from("parcelas")
      .select("*")
      .eq("venda_id", vendaId)
      .order("numero_parcela", { ascending: true });

    // 4. Buscar Configurações
    const { data: configData } = await supabase
        .from("configuracoes")
        .select("*")
        .single();

    setVenda(vendaData);
    setItens(itensData || []);
    setParcelas(parcelasData || []);
    setConfig(configData);
  }

  const formatCurrency = (val: number) => {
    return val?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';
  };

  const formatarPagamento = (tipo: string) => {
    const mapa: Record<string, string> = {
        'pix': 'PIX', 
        'dinheiro': 'DINHEIRO',
        'credito': 'CARTAO CREDITO', 
        'debito': 'CARTAO DEBITO', 
        'crediario': 'CREDIARIO LOJA'
    };
    return mapa[tipo] || tipo?.toUpperCase() || 'OUTROS';
  };

  // --- CÁLCULOS ---
  const totalItens = itens.reduce((acc, item) => acc + (item.quantidade * item.valor_unitario), 0);
  const valorDesconto = venda?.desconto || 0;
  const totalVenda = totalItens - valorDesconto;
  const totalParcelado = parcelas.reduce((acc, p) => acc + p.valor, 0);
  const valorEntrada = Math.max(0, totalVenda - totalParcelado);
  
  // Cálculo de Pontos
  const pontosPorReal = config 
    ? (typeof config.pontos_por_real === 'string' ? parseFloat(config.pontos_por_real) : config.pontos_por_real) 
    : 1;
    
  const pontosGanhos = Math.floor(totalVenda * pontosPorReal);

  // CORREÇÃO: Assumimos que o banco traz o saldo ANTES da atualização instantânea
  // Então somamos visualmente para o cliente ver o saldo final projetado
  const saldoFinalProjetado = (venda?.clientes?.pontos_acumulados || 0) + pontosGanhos;

  // --- IMPRESSÃO CUPOM ---
  const handlePrintCupom = () => {
    if (printRef.current) {
      const conteudo = printRef.current.innerHTML;
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <html>
            <head>
              <title>Cupom #${vendaId?.slice(0,6)}</title>
              <style>
                @media print { @page { margin: 0; size: 80mm auto; } body { margin: 0; padding: 0; } }
                body { font-family: 'Courier New', monospace; background: #eee; margin: 0; padding: 20px; display: flex; justify-content: center; }
                .receipt { background: #fff; width: 80mm; padding: 10px 15px; box-shadow: 0 0 5px rgba(0,0,0,0.1); color: #000; font-size: 12px; line-height: 1.4; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .divider { border-top: 1px dashed #000; margin: 8px 0; display: block; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; }
                td { vertical-align: top; }
                .total-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px; }
                .final-total { font-size: 16px; font-weight: bold; margin-top: 5px; display: flex; justify-content: space-between; }
                .parcela-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px; }
                .footer { font-size: 10px; margin-top: 15px; text-align: center; }
              </style>
            </head>
            <body>
              <div class="receipt">${conteudo}</div>
              <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
            </body>
          </html>
        `);
        win.document.close();
      }
    }
  };

  // --- IMPRESSÃO CARNÊ ---
  const handlePrintCarne = () => {
    if (!vendaId) return;
    const w = 900;
    const h = 800;
    const left = (window.screen.width - w) / 2;
    const top = (window.screen.height - h) / 2;
    window.open(`/imprimir/carne/${vendaId}`, 'Carne', `width=${w},height=${h},top=${top},left=${left}`);
  };

  const isCrediario = formaPagamento === 'crediario';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh] relative overflow-visible">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"><X size={24}/></button>

        <div className="mt-8 text-center px-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Venda Realizada!</h2>
          <p className="text-gray-500 text-sm mt-1">O registro foi salvo com sucesso.</p>
        </div>

        {/* --- PREVIEW --- */}
        <div className="p-6 overflow-y-auto max-h-[350px] bg-gray-50 mx-4 my-4 rounded-lg border border-gray-200 custom-scrollbar">
            <div className="text-sm space-y-2">
                <div className="flex justify-between"><span>Subtotal</span> <span>{formatCurrency(totalItens)}</span></div>
                {valorDesconto > 0 && <div className="flex justify-between text-green-600"><span>Desconto</span> <span>-{formatCurrency(valorDesconto)}</span></div>}
                <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-2"><span>Total</span> <span>{formatCurrency(totalVenda)}</span></div>
                
                {valorEntrada > 0.01 && (
                    <div className="flex justify-between text-blue-600 pt-2 text-xs font-bold uppercase">
                        <span>Entrada (Pago)</span> <span>{formatCurrency(valorEntrada)}</span>
                    </div>
                )}

                {parcelas.length > 0 && (
                    <div className="mt-4 pt-2 border-t border-gray-200">
                        <p className="font-bold text-xs uppercase mb-2 text-gray-500">Parcelamento</p>
                        {parcelas.map((p, i) => (
                            <div key={p.id} className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>{i+1}x {format(new Date(p.data_vencimento), "dd/MM/yyyy")}</span>
                                <span>{formatCurrency(p.valor)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* --- TEMPLATE IMPRESSÃO TÉRMICA --- */}
        <div style={{ display: 'none' }}>
            <div ref={printRef}>
                <div className="text-center">
                    <div className="font-bold text-lg">NORDICCRED</div>
                    <div>Rua da Tecnologia, 123 - Centro</div>
                    <div>CNPJ: 00.000.000/0001-00</div>
                    <div className="divider"></div>
                    <div className="font-bold">COMPROVANTE DE VENDA</div>
                    <div className="divider"></div>
                </div>

                <div>
                    <div>DATA: {format(new Date(), "dd/MM/yyyy HH:mm")}</div>
                    <div>VENDA: <b>#{vendaId?.slice(0,6).toUpperCase()}</b></div>
                    <div>CLI: {venda?.clientes?.nome?.toUpperCase().slice(0,25) || "CONSUMIDOR FINAL"}</div>
                    {venda?.clientes?.cpf && <div>CPF: {venda.clientes.cpf}</div>}
                </div>
                
                <div className="divider"></div>

                <table>
                    <tbody>
                        {itens.map((item, idx) => (
                            <div key={idx}>
                                <tr><td colSpan={2}>{item.produto_nome?.toUpperCase().slice(0, 25)}</td></tr>
                                <tr style={{ borderBottom: '1px dashed #ccc' }}>
                                    <td style={{ paddingBottom: '4px' }}>{item.quantidade} x {formatCurrency(item.valor_unitario)}</td>
                                    <td className="text-right" style={{ paddingBottom: '4px' }}>{formatCurrency(item.quantidade * item.valor_unitario)}</td>
                                </tr>
                            </div>
                        ))}
                    </tbody>
                </table>

                <div className="divider"></div>

                <div className="total-row"><span>SUBTOTAL</span> <span>{formatCurrency(totalItens)}</span></div>
                {valorDesconto > 0 && <div className="total-row"><span>DESCONTO</span> <span>-{formatCurrency(valorDesconto)}</span></div>}
                <div className="divider"></div>
                <div className="final-total"><span>TOTAL A PAGAR</span> <span>{formatCurrency(totalVenda)}</span></div>
                
                <div style={{ marginTop: '10px' }}>
                    <div className="font-bold text-center" style={{ marginBottom: '5px' }}>FORMA DE PAGAMENTO</div>
                    
                    {valorEntrada > 0.01 && (
                        <div className="total-row"><span>ENTRADA (DINHEIRO/PIX)</span><span>{formatCurrency(valorEntrada)}</span></div>
                    )}

                    {parcelas.length > 0 ? (
                        <div style={{ marginTop: '5px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 'bold' }}>PARCELAMENTO:</div>
                            {parcelas.map((p, i) => (
                                <div key={p.id} className="parcela-row">
                                    <span>{p.numero_parcela}/{parcelas.length} - {format(new Date(p.data_vencimento), "dd/MM/yyyy")}</span>
                                    <span>{formatCurrency(p.valor)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        valorEntrada <= 0.01 && <div className="total-row"><span>{formatarPagamento(formaPagamento)}</span><span>{formatCurrency(totalVenda)}</span></div>
                    )}
                </div>

                <div className="divider"></div>
                {venda?.clientes && (
                    <div className="text-center" style={{ fontSize: '10px', marginTop: '5px' }}>
                        <div>SALDO FIDELIDADE</div>
                        <div style={{ fontWeight: 'bold' }}>GANHOU: {pontosGanhos} PONTOS</div>
                        {/* AQUI ESTÁ A SOMA RESTAURADA */}
                        <div>SALDO ATUAL: {saldoFinalProjetado} PONTOS</div>
                    </div>
                )}
                <div className="footer">
                    <div>OBRIGADO PELA PREFERENCIA!</div>
                    <div>Sistema: NordicTech</div>
                </div>
                <br />.
            </div>
        </div>

        {/* --- BOTÕES DE AÇÃO --- */}
        <div className="p-6 mt-auto space-y-3 bg-white border-t border-gray-100">
            
            {isCrediario && (
                <button 
                    onClick={handlePrintCarne} 
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-transform active:scale-95"
                >
                    <FileText size={20} /> Imprimir Carnê
                </button>
            )}

            <div className="flex gap-3">
                <button onClick={handlePrintCupom} className="flex-1 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95">
                    <Printer size={20} /> Cupom
                </button>
                <button onClick={onClose} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95">
                    Nova Venda <ArrowRight size={18}/>
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}