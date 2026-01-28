"use client";

import { useEffect, useState } from "react";
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
  
  // Efeito para carregar dados do preview na tela (apenas visual)
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

    // 4. Buscar Configurações (para projeção de pontos)
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

  // --- CÁLCULOS PARA O PREVIEW (VISUALIZAÇÃO RÁPIDA) ---
  const totalItens = itens.reduce((acc, item) => acc + (item.quantidade * item.valor_unitario), 0);
  const valorDesconto = venda?.desconto || 0;
  const totalVenda = totalItens - valorDesconto;
  const totalParcelado = parcelas.reduce((acc, p) => acc + p.valor, 0);
  const valorEntrada = Math.max(0, totalVenda - totalParcelado);
  
  // --- AÇÃO DE IMPRESSÃO DO CUPOM ---
  // Agora chama a página dedicada que já corrigimos!
  const handlePrintCupom = () => {
    if (!vendaId) return;
    
    const w = 450; // Largura ideal para cupom
    const h = 700;
    const left = (window.screen.width - w) / 2;
    const top = (window.screen.height - h) / 2;
    
    // Abre a rota /imprimir/recibo/[id] em popup
    window.open(
        `/imprimir/recibo/${vendaId}`, 
        'Recibo', 
        `width=${w},height=${h},top=${top},left=${left},scrollbars=yes`
    );
  };

  // --- AÇÃO DE IMPRESSÃO DO CARNÊ ---
  const handlePrintCarne = () => {
    if (!vendaId) return;
    const w = 900;
    const h = 800;
    const left = (window.screen.width - w) / 2;
    const top = (window.screen.height - h) / 2;
    window.open(`/imprimir/carne/${vendaId}`, 'Carne', `width=${w},height=${h},top=${top},left=${left},scrollbars=yes`);
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

        {/* --- PREVIEW NA TELA (Resumo Rápido) --- */}
        <div className="p-6 overflow-y-auto max-h-[350px] bg-gray-50 mx-4 my-4 rounded-lg border border-gray-200 custom-scrollbar">
            <div className="text-sm space-y-2">
                <div className="flex justify-between"><span>Subtotal</span> <span>{formatCurrency(totalItens)}</span></div>
                {valorDesconto > 0 && <div className="flex justify-between text-green-600"><span>Desconto</span> <span>-{formatCurrency(valorDesconto)}</span></div>}
                <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-2"><span>Total</span> <span>{formatCurrency(totalVenda)}</span></div>
                
                {/* Mostra detalhes de entrada SOMENTE se for crediário e tiver entrada */}
                {isCrediario && valorEntrada > 0.01 && (
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