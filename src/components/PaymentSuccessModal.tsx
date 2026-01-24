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
    totalParcelas?: number;
    restantes: number;
    vencimento: string;
  } | null;
}

export function PaymentSuccessModal({ isOpen, onClose, dados }: PaymentSuccessModalProps) {
  if (!isOpen || !dados) return null;

  // 1. WhatsApp Blindado (URLSearchParams)
  const gerarLinkWhatsApp = () => {
    const telefone = dados.clienteTelefone?.replace(/\D/g, "") || "";
    
    if (!telefone) {
      toast.warning("Cliente sem telefone cadastrado!");
      return;
    }

    const valorFormatado = dados.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    // Usamos códigos Unicode para garantir que o emoji saia certo independente do editor
    // \u2705 = Check Verde
    // \uD83D\uDCB2 = Sifrão
    // \uD83D\uDCC5 = Calendário
    // \uD83D\uDCCA = Gráfico/Status
    
    const linhas = [
      "*COMPROVANTE DE PAGAMENTO* \u2705",
      `Olá, *${dados.clienteNome}*!`,
      "",
      "Confirmamos o recebimento da sua parcela.",
      "",
      `\uD83D\uDCB2 *Valor:* ${valorFormatado}`,
      `\uD83D\uDCC5 *Ref:* Parcela ${dados.numeroParcela}`,
      `\uD83D\uDCCA *Situação:* ${dados.restantes === 0 ? "Quitado! \uD83C\uDF89" : `Restam ${dados.restantes} parcelas.`}`,
      "",
      "_Obrigado pela preferência!_"
    ];

    const textoCompleto = linhas.join("\n");

    // A Mágica acontece aqui: URLSearchParams codifica tudo perfeitamente
    const params = new URLSearchParams();
    params.set("phone", "55" + telefone);
    params.set("text", textoCompleto);

    const url = `https://api.whatsapp.com/send?${params.toString()}`;
    window.open(url, '_blank');
  };

  // 2. Recibo Térmico 80mm
  // 2. Recibo Térmico 80mm (Centralizado)
  const handleImprimir = () => {
    const conteudo = document.getElementById("area-recibo")?.innerHTML;
    const janela = window.open("", "", "height=600,width=800");

    if (janela && conteudo) {
      janela.document.write(`
        <html>
          <head>
            <title>Recibo</title>
            <style>
              /* Reset e Configuração da Página */
              @page { margin: 0; } /* Remove margens da impressora */
              body {
                margin: 0;
                padding: 40px 0; /* Espaço em cima e embaixo */
                background-color: #525659; /* Fundo cinza escuro (padrão de visualizadores PDF) */
                display: flex;
                justify-content: center; /* A MÁGICA: Centraliza horizontalmente */
                align-items: flex-start; /* Alinha no topo */
                min-height: 100vh;
              }

              /* O "Papel" do Recibo (80mm) */
              .recibo-papel {
                width: 80mm;
                background-color: #fff; /* Papel branco */
                padding: 20px 15px; /* Espaçamento interno */
                box-shadow: 0 10px 30px rgba(0,0,0,0.3); /* Sombra realista */
                
                /* Estilos do Texto */
                font-family: 'Courier New', monospace;
                font-size: 12px;
                color: #000;
              }

              /* Estilos Internos (Conteúdo) */
              .container { width: 100%; }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .line { border-bottom: 1px dashed #000; margin: 10px 0; }
              .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
              .big { font-size: 18px; margin: 15px 0; }
              .footer { margin-top: 20px; font-size: 10px; text-align: center; color: #555; }
            </style>
          </head>
          <body>
            <div class="recibo-papel">
              <div class="container">
                ${conteudo}
              </div>
            </div>
            
            <script>
              // Delay para garantir que o CSS carregou antes de abrir a caixa de impressão
              window.onload = function() {
                setTimeout(() => {
                    window.print();
                    // window.close(); // Comentei para você ver o resultado na tela
                }, 500);
              }
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

        {/* Corpo Visual (Na Tela) */}
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

        {/* --- MODELO DE RECIBO (Escondido na tela, usado na impressão) --- */}
        <div id="area-recibo" className="hidden">
          <div className="center bold big">RECIBO DE PAGAMENTO</div>
          <div className="line"></div>
          
          <div className="row">
            <span>DATA:</span>
            <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString().slice(0,5)}</span>
          </div>
          
          <div className="line"></div>
          
          <div className="center bold" style={{marginBottom: '5px'}}>{dados.clienteNome}</div>
          
          <div className="row">
            <span>REFERENCIA:</span>
            <span>PARCELA {dados.numeroParcela}</span>
          </div>
          
          <div className="row">
            <span>VENCIMENTO:</span>
            <span>{new Date(dados.vencimento).toLocaleDateString()}</span>
          </div>

          <div className="line"></div>
          
          <div className="row big bold">
            <span>TOTAL PAGO:</span>
            <span>{dados.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
          
          <div className="line"></div>
          
          <div className="footer">
            SISTEMA DE GESTÃO<br/>
            Obrigado pela preferência!
          </div>
        </div>

      </div>
    </div>
  );
}