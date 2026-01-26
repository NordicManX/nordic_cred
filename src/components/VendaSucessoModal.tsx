"use client";

import { useEffect, useState, useRef } from "react";
import { CheckCircle, Printer, ShoppingBag, MessageCircle } from "lucide-react"; // Removido X
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
  
  // Ref para capturar o conteúdo HTML
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && vendaId) {
      fetchVendaDetalhes();
    }
  }, [isOpen, vendaId]);

  async function fetchVendaDetalhes() {
    const { data: vendaData } = await supabase
      .from("vendas")
      .select("*, clientes(nome, cpf, telefone)")
      .eq("id", vendaId)
      .single();
    
    const { data: itensData } = await supabase
      .from("itens_venda")
      .select("*")
      .eq("venda_id", vendaId);

    setVenda(vendaData);
    setItens(itensData || []);
  }

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

  // --- CÁLCULOS MATEMÁTICOS REAIS ---
  // Calculamos a soma dos itens (Bruto)
  const totalItens = itens.reduce((acc, item) => acc + (item.quantidade * item.valor_unitario), 0);
  // Pegamos o desconto (ou 0)
  const valorDesconto = venda?.desconto || 0;
  // Calculamos o final (Líquido)
  const totalFinal = totalItens - valorDesconto;

  // --- IMPRESSÃO EM NOVA ABA (MAXIMIZADO) ---
  const handlePrint = () => {
    if (printRef.current) {
      const conteudo = printRef.current.innerHTML;
      
      const win = window.open('', '_blank');
      
      if (win) {
        win.document.write(`
          <html>
            <head>
              <title>Cupom #${vendaId?.slice(0,6)}</title>
              <style>
                @media print { 
                    @page { margin: 0; size: 80mm auto; } 
                    body { margin: 0; padding: 0; }
                }
                body {
                  font-family: 'Courier New', Courier, monospace;
                  background-color: #525659;
                  margin: 0;
                  padding: 20px;
                  display: flex;
                  justify-content: center;
                }
                .receipt {
                  background-color: #fff;
                  width: 80mm;
                  padding: 10px;
                  box-shadow: 0 0 15px rgba(0,0,0,0.5);
                  min-height: 200px;
                  color: #000;
                  line-height: 1.2;
                  font-size: 12px;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .text-left { text-align: left; }
                .font-bold { font-weight: bold; }
                .divider { border-top: 1px dashed #000; margin: 5px 0; display: block; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; }
                th { text-align: left; border-bottom: 1px dashed #000; padding-bottom: 2px; }
                td { vertical-align: top; padding-top: 2px; }
                .col-qtd { width: 10%; text-align: center; }
                .col-vl { width: 25%; text-align: right; }
                .total-row { font-size: 12px; margin-top: 5px; }
                .final-total { font-size: 16px; margin-top: 5px; font-weight: bold; }
                .footer { font-size: 10px; margin-top: 10px; }
              </style>
            </head>
            <body>
              <div class="receipt">
                ${conteudo}
              </div>
              <script>
                setTimeout(() => { 
                    window.print(); 
                }, 500);
              </script>
            </body>
          </html>
        `);
        win.document.close();
        win.focus();
      }
    }
  };

  const handleWhatsApp = () => {
    if (!venda) return;
    const link = `https://wa.me/?text=${encodeURIComponent(`*COMPROVANTE DE VENDA*\nValor: ${formatCurrency(totalFinal)}\nVerifique sua compra!`)}`;
    window.open(link, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh] relative overflow-visible">
        
        {/* Ícone de Sucesso Flutuante */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-10 z-20">
             <div className="bg-green-100 p-4 rounded-full shadow-lg ring-4 ring-white">
                <CheckCircle size={48} className="text-green-600" />
             </div>
        </div>

        {/* Header Modal */}
        <div className="mt-14 text-center px-6">
          <h2 className="text-2xl font-bold text-gray-900">Venda Finalizada!</h2>
          <p className="text-gray-500 text-sm mt-1">Tudo certo. O que deseja fazer agora?</p>
        </div>

        {/* --- PRÉ-VISUALIZAÇÃO NA TELA --- */}
        <div className="p-6 bg-gray-50 mt-6 mx-4 rounded-xl border border-gray-200">
            {valorDesconto > 0 && (
                <div className="flex justify-between items-center text-sm mb-1 text-gray-400">
                    <span>Subtotal</span>
                    <span className="line-through">{formatCurrency(totalItens)}</span>
                </div>
            )}
            
            <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-gray-500">Total Pago</span>
                <span className="font-bold text-lg text-green-700">{formatCurrency(totalFinal)}</span>
            </div>
            
            {valorDesconto > 0 && (
                <div className="flex justify-between items-center text-xs mb-3 bg-green-100 text-green-700 px-2 py-1 rounded">
                    <span>Desconto Aplicado</span>
                    <span className="font-bold">-{formatCurrency(valorDesconto)}</span>
                </div>
            )}

            <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-200">
                <span className="text-gray-500">Cliente</span>
                <span className="font-medium text-gray-900 truncate max-w-[150px]">{venda?.clientes?.nome || "Consumidor Final"}</span>
            </div>
        </div>

        {/* --- CONTEÚDO OCULTO (TEMPLATE PARA A NOVA ABA) --- */}
        <div style={{ display: 'none' }}>
            <div ref={printRef}>
                <div className="text-center">
                    <div className="font-bold text-lg">NORDICCRED</div>
                    <div>Rua da Tecnologia, 123</div>
                    <div>CNPJ: 00.000.000/0001-00</div>
                    <div className="divider"></div>
                    <div className="font-bold">COMPROVANTE NAO FISCAL</div>
                    <div className="divider"></div>
                </div>

                <div style={{ fontSize: '11px' }}>
                    <div>DATA: {format(new Date(), "dd/MM/yyyy HH:mm:ss")}</div>
                    <div>VENDA: <b>#{vendaId?.slice(0,6).toUpperCase()}</b></div>
                    <div>CLI: {venda?.clientes?.nome?.slice(0,25) || "CONSUMIDOR FINAL"}</div>
                    {venda?.clientes?.cpf && <div>CPF: {venda.clientes.cpf}</div>}
                </div>
                
                <div className="divider"></div>

                <table>
                    <thead>
                        <tr>
                            <th>DESC</th>
                            <th className="col-qtd">QTD</th>
                            <th className="col-vl">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itens.map((item, idx) => (
                            <tr key={idx}>
                                <td>{item.produto_nome?.toUpperCase().slice(0, 18)}</td>
                                <td className="text-center">{item.quantidade}</td>
                                <td className="text-right">{formatCurrency(item.valor_unitario * item.quantidade).replace('R$', '').trim()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="divider"></div>

                {/* LOGICA DE TOTAIS CORRIGIDA */}
                <div className="text-right">
                    
                    {/* Se tiver desconto, mostra o subtotal antes */}
                    {valorDesconto > 0 && (
                        <>
                            <div className="total-row">SUBTOTAL: {formatCurrency(totalItens)}</div>
                            <div className="total-row">DESCONTO: -{formatCurrency(valorDesconto)}</div>
                            <div className="divider"></div>
                        </>
                    )}

                    <div className="final-total">TOTAL: {formatCurrency(totalFinal)}</div>
                </div>
                
                <div style={{ fontSize: '11px', marginTop: '5px' }}>
                    <div className="text-right">Forma: {formatarPagamento(formaPagamento)}</div>
                </div>

                <div className="divider"></div>

                <div className="text-center footer">
                    <div className="font-bold">OBRIGADO PELA PREFERENCIA!</div>
                    <div style={{ marginTop: '5px' }}>Sistema: NordicTech</div>
                    <div>www.nordictech.com.br</div>
                </div>
                <br /><div className="text-center">.</div> 
            </div>
        </div>

        {/* Botões de Ação */}
        <div className="p-6 mt-auto space-y-3">
            <button 
                onClick={handleWhatsApp}
                className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-100 transition-transform active:scale-95"
            >
                <MessageCircle size={20} />
                Enviar no WhatsApp
            </button>

            <div className="flex gap-3">
                <button 
                    onClick={handlePrint}
                    className="flex-1 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
                >
                    <Printer size={20} /> Imprimir
                </button>
                <button 
                    onClick={onClose}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
                >
                    Nova Venda
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}