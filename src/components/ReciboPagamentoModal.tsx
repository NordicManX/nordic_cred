"use client";

import { useRef } from "react";
import { X, Printer } from "lucide-react";
import { format, parseISO, isValid, addMinutes } from "date-fns";

interface ReciboPagamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  dados: {
    referencia: string;
    vencimento: string;
    valor: number;
    dataPagamento: string;
    clienteNome: string;
  } | null;
}

export function ReciboPagamentoModal({ isOpen, onClose, dados }: ReciboPagamentoModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // --- CORREÇÃO DE DATA E FUSO HORÁRIO ---
  const safeDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return "--/--/----";
    try {
        // Usa parseISO primeiro para garantir leitura correta da string do banco
        let date = parseISO(dateStr);
        
        // Se for apenas data (ex: 2026-02-27), adicionamos o offset do fuso para não cair no dia anterior
        if (dateStr.length === 10) {
             date = addMinutes(date, date.getTimezoneOffset());
        }

        if (isValid(date)) return format(date, "dd/MM/yyyy");
        return "--/--/----";
    } catch { return "--/--/----"; }
  };

  const safeTime = (dateStr: string | undefined | null) => {
      if (!dateStr) return "";
      try {
          const date = parseISO(dateStr);
          if (isValid(date)) return format(date, "HH:mm");
          return "";
      } catch { return ""; }
  }

  const handlePrint = () => {
    if (printRef.current) {
      const conteudo = printRef.current.innerHTML;
      const win = window.open("", "", "height=600,width=400");
      if (win) {
        win.document.write(`
          <html>
            <head>
              <title>Recibo de Pagamento</title>
              <style>
                @page { margin: 0; size: 80mm auto; }
                body { margin: 0; padding: 10px; font-family: 'Courier New', monospace; background-color: #fff; }
                .receipt { width: 100%; max-width: 80mm; margin: 0 auto; text-transform: uppercase; color: #000; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .divider { border-bottom: 1px dashed #000; margin: 10px 0; display: block; width: 100%; }
                .flex-between { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px; }
                .title { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
                .subtitle { font-size: 10px; }
              </style>
            </head>
            <body>
              <div class="receipt">${conteudo}</div>
              <script>
                setTimeout(() => { window.print(); window.close(); }, 500);
              </script>
            </body>
          </html>
        `);
        win.document.close();
      }
    }
  };

  if (!isOpen || !dados) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
        
        {/* CABEÇALHO */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h3 className="font-bold text-gray-800">Visualizar Comprovante</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* ÁREA DE IMPRESSÃO (RECIBO) */}
        <div className="p-6 bg-gray-200 flex justify-center">
          <div ref={printRef} className="bg-white p-5 shadow-lg border border-gray-300 w-[80mm]">
            
            <div className="text-center mb-4">
                <div className="font-bold text-sm text-black">NORDICCRED</div>
                <div className="text-[10px] text-black">RECIBO DE PAGAMENTO</div>
            </div>
            
            <div className="border-b border-dashed border-black my-2"></div>

            <div className="flex justify-between text-xs mb-1 text-black">
                <span>DATA PAGTO:</span>
                <span>{safeDate(dados.dataPagamento)} {safeTime(dados.dataPagamento)}</span>
            </div>
            <div className="flex justify-between text-xs mb-1 text-black">
                <span>REFERÊNCIA:</span>
                <span>{dados.referencia}</span>
            </div>
            <div className="flex justify-between text-xs mb-1 text-black">
                <span>VENCIMENTO:</span>
                <span>{safeDate(dados.vencimento)}</span>
            </div>

            <div className="border-b border-dashed border-black my-2"></div>

            <div className="flex justify-between font-bold text-sm mt-2 text-black">
                <span>TOTAL PAGO:</span>
                <span>R$ {dados.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="border-b border-dashed border-black my-2"></div>

            <div className="text-center text-[10px] mt-4 text-black">
                <div>OBRIGADO PELA PREFERÊNCIA!</div>
                <div>SISTEMA: NORDICTECH</div>
            </div>
          </div>
        </div>

        {/* BOTÃO DE AÇÃO */}
        <div className="p-4 border-t bg-white">
            <button 
                onClick={handlePrint} 
                className="w-full bg-zinc-900 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors"
            >
                <Printer size={18}/> Imprimir Recibo
            </button>
        </div>

      </div>
    </div>
  );
}