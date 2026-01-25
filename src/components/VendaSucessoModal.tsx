"use client";

import { useEffect, useState, useRef } from "react";
import { CheckCircle, Printer, X, ShoppingBag, MessageCircle } from "lucide-react";
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

  // --- IMPRESSÃO EM NOVA JANELA (POPUP) ---
  const handlePrint = () => {
    if (printRef.current) {
      const conteudo = printRef.current.innerHTML;
      
      // Configurações para centralizar a janela na tela
      const width = 350;
      const height = 600;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      const win = window.open(
        '', 
        'Comprovante', 
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`
      );
      
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
                  font-size: 12px;
                  width: 100%;
                  max-width: 80mm;
                  margin: 0 auto;
                  padding: 5px;
                  color: #000;
                  background-color: #fff;
                  line-height: 1.2;
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
                .total-row { font-size: 14px; margin-top: 5px; }
                .footer { font-size: 10px; margin-top: 10px; }
              </style>
            </head>
            <body>
              ${conteudo}
              <script>
                // Espera carregar e imprime
                setTimeout(() => { 
                    window.print(); 
                    // Opcional: window.close(); // Se quiser fechar automático
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
    const link = `https://wa.me/?text=${encodeURIComponent(`*COMPROVANTE DE VENDA*\nValor: ${formatCurrency(venda.valor_total)}\nVerifique sua compra!`)}`;
    window.open(link, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
      {/* Modal Principal - Overflow Visible para ícone flutuante */}
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh] relative overflow-visible">
        
        {/* Ícone de Sucesso Flutuante */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-10 z-20">
             <div className="bg-green-100 p-4 rounded-full shadow-lg ring-4 ring-white">
                <CheckCircle size={48} className="text-green-600" />
             </div>
        </div>

        {/* Header do Modal (Visualização na Tela) */}
        <div className="mt-14 text-center px-6">
          <h2 className="text-2xl font-bold text-gray-900">Venda Finalizada!</h2>
          <p className="text-gray-500 text-sm mt-1">Tudo certo. O que deseja fazer agora?</p>
        </div>

        {/* Resumo Visual na Tela */}
        <div className="p-6 bg-gray-50 mt-6 mx-4 rounded-xl border border-gray-200">
            <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-gray-500">Total Pago</span>
                <span className="font-bold text-lg text-green-700">{venda ? formatCurrency(venda.valor_total) : 'R$ 0,00'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Cliente</span>
                <span className="font-medium text-gray-900 truncate max-w-[150px]">{venda?.clientes?.nome || "Consumidor Final"}</span>
            </div>
        </div>

        {/* --- CONTEÚDO OCULTO --- 
            Isso aqui NÃO aparece no modal, serve apenas de template 
            para o Javascript copiar para a nova janela de impressão.
        */}
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

                <div className="total-row text-right">
                    <div className="font-bold">TOTAL: {venda ? formatCurrency(venda.valor_total) : '0,00'}</div>
                </div>
                
                <div style={{ fontSize: '11px', marginTop: '5px' }}>
                    <div className="text-right">Forma: {formatarPagamento(formaPagamento)}</div>
                    {venda?.desconto > 0 && (
                        <div className="text-right">Desconto: -{formatCurrency(venda.desconto)}</div>
                    )}
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