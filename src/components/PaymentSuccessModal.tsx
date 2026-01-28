"use client";

import { X, Printer, MessageCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  dados: {
    clienteNome: string;
    clienteTelefone?: string;
    valor: number;
    numeroParcela: number;
    restantes?: number;
    vencimento: string;
  } | null;
}

export function PaymentSuccessModal({ isOpen, onClose, dados }: PaymentSuccessModalProps) {
  if (!isOpen || !dados) return null;

  // 1. WhatsApp Blindado
  const gerarLinkWhatsApp = () => {
    // Remove tudo que não for número
    const telefone = (dados.clienteTelefone || "").replace(/\D/g, "");
    
    if (!telefone || telefone.length < 10) {
      toast.warning("Cliente sem telefone válido cadastrado!");
      return;
    }

    const valorFormatado = dados.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    const linhas = [
      "*COMPROVANTE DE PAGAMENTO* ✅",
      `Olá, *${dados.clienteNome}*!`,
      "",
      "Confirmamos o recebimento da sua parcela.",
      "",
      `💰 *Valor:* ${valorFormatado}`,
      `📅 *Ref:* Parcela ${dados.numeroParcela}`,
      "",
      "_Obrigado pela preferência!_"
    ];

    const textoCompleto = encodeURIComponent(linhas.join("\n"));
    const url = `https://api.whatsapp.com/send?phone=55${telefone}&text=${textoCompleto}`;
    window.open(url, '_blank');
  };

  // 2. Recibo Térmico (Ajustado)
  const handleImprimir = () => {
    const conteudo = document.getElementById("area-recibo-oculto")?.innerHTML;
    const janela = window.open("", "", "height=600,width=800");

    if (janela && conteudo) {
      janela.document.write(`
        <html>
          <head>
            <title>Recibo</title>
            <style>
              @page { margin: 0; }
              body { margin: 0; padding: 20px; font-family: 'Courier New', monospace; text-align: center; }
              .recibo { width: 80mm; margin: 0 auto; text-transform: uppercase; }
              .linha { border-bottom: 1px dashed #000; margin: 10px 0; }
              .row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px; }
              .grande { font-size: 16px; font-weight: bold; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="recibo">${conteudo}</div>
            <script>
              setTimeout(() => { window.print(); window.close(); }, 500);
            </script>
          </body>
        </html>
      `);
      janela.document.close();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
        
        {/* Cabeçalho */}
        <div className="bg-green-600 p-6 text-center text-white">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-md">
            <CheckCircle size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold">Pagamento Confirmado!</h2>
          <p className="text-green-50 mt-1 opacity-90">Baixa realizada com sucesso.</p>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-6">
          <div className="text-center space-y-1">
            <p className="text-gray-400 uppercase text-xs font-bold tracking-wider">Valor Recebido</p>
            <p className="text-4xl font-extrabold text-gray-900 tracking-tight">
              {dados.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-sm text-gray-500 mt-2 font-medium">
              Ref: Parcela {dados.numeroParcela}
            </p>
            <p className="text-sm font-bold text-gray-800">
              {dados.clienteNome}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleImprimir}
              className="flex items-center justify-center gap-2 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg font-semibold transition-all"
            >
              <Printer size={18} />
              Imprimir
            </button>
            <button 
              onClick={gerarLinkWhatsApp}
              className="flex items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg font-bold transition-all shadow-lg shadow-green-200"
            >
              <MessageCircle size={18} />
              Enviar Zap
            </button>
          </div>

          <button onClick={onClose} className="w-full py-2 text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors">
            Fechar e voltar
          </button>
        </div>

        {/* Recibo Oculto (Para Impressão) */}
        <div id="area-recibo-oculto" className="hidden">
          <div style={{fontWeight:'bold', fontSize:'14px', marginBottom:'5px'}}>RECIBO DE PAGAMENTO</div>
          <div className="linha"></div>
          
          <div className="row">
            <span>DATA:</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
          <div className="row">
            <span>CLIENTE:</span>
            <span>{dados.clienteNome}</span>
          </div>
          <div className="row">
            <span>REFERÊNCIA:</span>
            <span>PARCELA {dados.numeroParcela}</span>
          </div>

          <div className="linha"></div>
          
          <div className="grande">
            R$ {dados.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          
          <div className="linha"></div>
          <div style={{fontSize:'10px', color:'#555'}}>OBRIGADO PELA PREFERÊNCIA!</div>
        </div>

      </div>
    </div>
  );
}