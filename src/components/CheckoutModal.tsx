"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle, Calendar, DollarSign, Loader2, Edit2 } from "lucide-react";
import { createClient } from "@/src/lib/supabase";
import { toast } from "sonner";
import { Cliente, ItemCarrinho } from "@/src/types";
import { addDays, format, parseISO } from "date-fns";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: Cliente | null;
  carrinho: ItemCarrinho[];
  total: number;
  onSuccess: (vendaId: string) => void;
}

// Tipo local para manipular as parcelas antes de salvar
interface ParcelaDraft {
  numero: number;
  vencimento: string;
  valor: number;
}

export function CheckoutModal({ isOpen, onClose, cliente, carrinho, total, onSuccess }: CheckoutModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  
  // Configuração da Venda
  const [qtdParcelas, setQtdParcelas] = useState(1);
  const [entrada, setEntrada] = useState<string>(""); // String para facilitar digitação
  const [primeiroVencimento, setPrimeiroVencimento] = useState(
    format(addDays(new Date(), 30), "yyyy-MM-dd")
  );

  // Lista de Parcelas (Estado local para permitir edição)
  const [parcelasCalculadas, setParcelasCalculadas] = useState<ParcelaDraft[]>([]);

  // Recalcula as parcelas sempre que mudar a Qtd, Entrada ou 1º Vencimento
  useEffect(() => {
    if (!isOpen) return;

    const valorEntrada = parseFloat(entrada) || 0;
    const valorFinanciado = total - valorEntrada;
    
    // Se a entrada for maior que o total, trava
    if (valorFinanciado < 0) return;

    const novasParcelas: ParcelaDraft[] = [];
    const valorPorParcela = valorFinanciado / qtdParcelas;

    for (let i = 0; i < qtdParcelas; i++) {
      const dataVenc = addDays(parseISO(primeiroVencimento), i * 30);
      novasParcelas.push({
        numero: i + 1,
        vencimento: format(dataVenc, "yyyy-MM-dd"),
        valor: valorPorParcela
      });
    }
    setParcelasCalculadas(novasParcelas);
  }, [qtdParcelas, entrada, primeiroVencimento, total, isOpen]);

  // Função para editar uma parcela específica manualmente
  const editarParcela = (index: number, campo: keyof ParcelaDraft, valor: string | number) => {
    const novas = [...parcelasCalculadas];
    novas[index] = { ...novas[index], [campo]: valor };
    setParcelasCalculadas(novas);
  };

  const handleFinalizar = async () => {
    if (!cliente) return;
    
    // Validação de segurança
    const totalParcelas = parcelasCalculadas.reduce((acc, p) => acc + Number(p.valor), 0);
    const valorEntrada = parseFloat(entrada) || 0;
    
    // Pequena margem de erro para arredondamento (0.05 centavos)
    if (Math.abs((totalParcelas + valorEntrada) - total) > 0.05) {
      toast.error("A soma das parcelas + entrada não bate com o total. Verifique os valores.");
      return;
    }

    setLoading(true);

    try {
      const pontosGanhos = Math.floor(total / 10);

      // 1. Criar a VENDA
      const { data: vendaData, error: vendaError } = await supabase
        .from("vendas")
        .insert({
          cliente_id: cliente.id,
          valor_total: total,
          forma_pagamento: "crediario",
          pontos_gerados: pontosGanhos
        })
        .select()
        .single();

      if (vendaError) throw vendaError;

      const vendaId = vendaData.id;

      // 2. Inserir ITENS
      const itensParaInserir = carrinho.map(item => ({
        venda_id: vendaId,
        produto_id: item.id,
        produto_nome: item.nome,
        quantidade: item.quantidade,
        valor_unitario: item.preco
      }));
      await supabase.from("itens_venda").insert(itensParaInserir);

      const parcelasParaInserir = [];

      // 3a. Se tiver ENTRADA, cria uma parcela "0" já PAGA
      if (valorEntrada > 0) {
        parcelasParaInserir.push({
          venda_id: vendaId,
          cliente_id: cliente.id,
          numero_parcela: 0, // Parcela 0 indica entrada
          data_vencimento: new Date().toISOString(), // Hoje
          data_pagamento: new Date().toISOString(), // Já paga
          valor: valorEntrada,
          status: "pago"
        });
      }

      // 3b. Cria as parcelas do FINANCIAMENTO (Pendentes)
      parcelasCalculadas.forEach(p => {
        parcelasParaInserir.push({
          venda_id: vendaId,
          cliente_id: cliente.id,
          numero_parcela: p.numero,
          data_vencimento: p.vencimento,
          valor: p.valor,
          status: "pendente"
        });
      });

      const { error: parcelasError } = await supabase.from("parcelas").insert(parcelasParaInserir);
      if (parcelasError) throw parcelasError;

      // 4. Atualizar Pontos
      const novosPontos = (cliente.pontos_acumulados || 0) + pontosGanhos;
      await supabase.from("clientes").update({ pontos_acumulados: novosPontos }).eq("id", cliente.id);

      toast.success("Venda realizada com sucesso!");
      onSuccess(vendaId);
      onClose();

    } catch (error) {
      console.error(error);
      toast.error("Erro ao finalizar venda.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !cliente) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabeçalho */}
        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-3">
            <Edit2 size={24} className="text-blue-200" />
            <div>
              <h2 className="text-lg font-bold">Configurar Crediário</h2>
              <p className="text-blue-100 text-xs">Cliente: {cliente.nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-blue-700 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Resumo de Valores */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-500">Valor da Compra</p>
              <p className="text-2xl font-bold text-gray-900">
                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            
            {/* Campo de Entrada */}
            <div className="flex-1 bg-green-50 p-4 rounded-lg border border-green-200 relative">
              <label className="text-sm text-green-700 font-bold block mb-1">Valor de Entrada</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-bold">R$</span>
                <input 
                  type="number"
                  value={entrada}
                  onChange={(e) => setEntrada(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-10 pr-3 py-1 bg-white border border-green-300 rounded focus:ring-2 focus:ring-green-500 outline-none text-green-800 font-bold text-lg"
                />
              </div>
            </div>
          </div>

          {/* Configuração do Financiamento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Parcelas Restantes</label>
              <select 
                value={qtdParcelas}
                onChange={(e) => setQtdParcelas(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                  <option key={n} value={n}>{n}x</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">1º Vencimento</label>
              <input 
                type="date"
                value={primeiroVencimento}
                onChange={(e) => setPrimeiroVencimento(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-sm"
              />
            </div>
          </div>

          {/* Lista Editável */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Calendar size={16} />
              Simulação (Você pode editar as datas e valores)
            </h3>
            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-left text-gray-600 border-b border-gray-200">
                    <th className="px-4 py-2 font-medium w-16">#</th>
                    <th className="px-4 py-2 font-medium">Vencimento</th>
                    <th className="px-4 py-2 font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {parcelasCalculadas.map((p, index) => (
                    <tr key={index} className="hover:bg-white transition-colors">
                      <td className="px-4 py-2 text-gray-500 font-medium">{p.numero}</td>
                      <td className="px-4 py-2">
                        <input 
                          type="date"
                          value={p.vencimento}
                          onChange={(e) => editarParcela(index, 'vencimento', e.target.value)}
                          className="bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 rounded px-2 py-1 outline-none w-full cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
                          <input 
                            type="number"
                            value={p.valor}
                            step="0.01"
                            onChange={(e) => editarParcela(index, 'valor', parseFloat(e.target.value))}
                            className="bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 rounded pl-6 py-1 outline-none w-full font-medium text-gray-900"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-center text-gray-500 mt-2">
              * Dica: Clique na data ou valor da tabela acima para fazer ajustes manuais finos.
            </p>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleFinalizar}
            disabled={loading}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />}
            Confirmar e Gerar
          </button>
        </div>

      </div>
    </div>
  );
}