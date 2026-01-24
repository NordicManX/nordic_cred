"use client";

import { useEffect, useState, useRef } from "react";
import { CheckCircle, Printer, X, ShoppingBag } from "lucide-react";
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
      .select("*, clientes(nome, cpf)")
      .eq("id", vendaId)
      .single();
    
    const { data: itensData } = await supabase
      .from("itens_venda")
      .select("*")
      .eq("venda_id", vendaId);

    setVenda(vendaData);
    setItens(itensData || []);
  }

  // --- NOVA FUNÇÃO DE IMPRESSÃO (POPUP) ---
  const handlePrint = () => {
    if (printRef.current) {
      const conteudo = printRef.current.innerHTML;
      
      // Cria uma janela popup limpa
      const win = window.open('', '', 'width=350,height=600');
      
      if (win) {
        win.document.write(`
          <html>
            <head>
              <title>Comprovante - NordicCred</title>
              <style>
                /* CSS ESPECÍFICO PARA IMPRESSORA TÉRMICA (80mm) */
                @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap');
                
                @media print {
                  @page { 
                    margin: 0; 
                    size: 80mm auto; /* Força o tamanho do papel */
                  }
                  body { 
                    margin: 0; 
                    padding: 0; 
                  }
                }

                body {
                  font-family: 'Roboto Mono', monospace;
                  width: 80mm; /* Largura fixa da bobina */
                  margin: 0 auto;
                  padding: 10px;
                  color: #000;
                  background: #fff;
                }

                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .text-left { text-align: left; }
                .font-bold { font-weight: bold; }
                
                /* Tamanhos de fonte otimizados para térmica */
                .text-lg { font-size: 16px; }
                .text-md { font-size: 14px; }
                .text-sm { font-size: 12px; }
                .text-xs { font-size: 10px; }

                .border-b { border-bottom: 1px dashed #000; }
                .border-t { border-top: 1px dashed #000; }
                
                .mb-2 { margin-bottom: 5px; }
                .mb-4 { margin-bottom: 10px; }
                .mt-2 { margin-top: 5px; }
                .pb-2 { padding-bottom: 5px; }
                .pt-2 { padding-top: 5px; }

                table { width: 100%; border-collapse: collapse; font-size: 11px; }
                th, td { padding: 2px 0; }
              </style>
            </head>
            <body>
              ${conteudo}
              <script>
                // Auto-imprimir e fechar
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 500);
              </script>
            </body>
          </html>
        `);
        win.document.close();
      }
    }
  };

  const formatarPagamento = (tipo: string) => {
    const mapa: Record<string, string> = {
        'pix': 'PIX',
        'dinheiro': 'DINHEIRO',
        'credito': 'CARTÃO CRÉDITO',
        'debito': 'CARTÃO DÉBITO',
        'crediario': 'CREDIÁRIO'
    };
    return mapa[tipo] || tipo?.toUpperCase() || 'OUTROS';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Visual */}
        <div className="bg-green-600 p-6 text-center text-white shrink-0">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
            <CheckCircle size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold">Venda Realizada!</h2>
          <p className="text-green-100 text-sm">O pedido foi registrado com sucesso.</p>
        </div>

        {/* Corpo do Recibo (Preview na tela) */}
        <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
            
            {/* --- CONTEÚDO OCULTO QUE VAI PARA A IMPRESSORA --- */}
            <div className="hidden">
                <div ref={printRef}>
                    {/* Cabeçalho */}
                    <div className="text-center mb-4 border-b pb-2">
                        <div className="font-bold text-lg">NORDICCRED</div>
                        <div className="text-xs">Rua da Tecnologia, 123</div>
                        <div className="text-xs">CNPJ: 00.000.000/0001-00</div>
                        <div className="text-xs mt-2">{format(new Date(), "dd/MM/yyyy HH:mm")}</div>
                        <div className="text-xs">Venda: #{vendaId?.slice(0,8).toUpperCase()}</div>
                    </div>
                    
                    {/* Cliente */}
                    <div className="mb-4 border-b pb-2 text-xs">
                        <div><span className="font-bold">CONSUMIDOR:</span> {venda?.clientes?.nome || "Consumidor Final"}</div>
                        <div>CPF: {venda?.clientes?.cpf || "---"}</div>
                    </div>

                    {/* Itens */}
                    <table className="mb-4">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left">ITEM</th>
                                <th className="text-right" style={{ width: '30px' }}>QTD</th>
                                <th className="text-right" style={{ width: '60px' }}>TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itens.map((item) => (
                                <tr key={item.id}>
                                    <td className="text-left">{item.produto_nome?.slice(0, 20)}</td>
                                    <td className="text-right">{item.quantidade}</td>
                                    <td className="text-right">{ (item.valor_unitario * item.quantidade).toFixed(2) }</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totais */}
                    <div className="text-right border-t pt-2">
                        <div className="font-bold text-lg">TOTAL: R$ {venda?.valor_total?.toFixed(2)}</div>
                        <div className="text-xs mt-1">Forma: {formatarPagamento(formaPagamento)}</div>
                    </div>

                    {/* Rodapé */}
                    <div className="text-center mt-6 text-xs">
                        <div>*** NÃO É DOCUMENTO FISCAL ***</div>
                        <div>Controle Interno</div>
                        <br/>
                        <div>Volte Sempre!</div>
                        <div>www.nordictech.com.br</div>
                    </div>
                </div>
            </div>

            {/* --- VISUALIZAÇÃO NA TELA (BONITA) --- */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-3">
                    <span className="text-gray-500 text-xs uppercase font-bold">Total Pago</span>
                    <span className="text-xl font-bold text-gray-900">
                        R$ {venda?.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Pagamento via</span>
                        <span className="font-medium text-gray-900">{formatarPagamento(formaPagamento)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Itens</span>
                        <span className="font-medium text-gray-900">{itens.length} produtos</span>
                    </div>
                </div>
            </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
          >
            Fechar
          </button>
          <button 
            onClick={handlePrint}
            className="flex-1 py-3 bg-black hover:bg-gray-800 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <Printer size={20} />
            Imprimir (80mm)
          </button>
        </div>

      </div>
    </div>
  );
}