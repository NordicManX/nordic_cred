"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle, Calendar, DollarSign, Loader2 } from "lucide-react";
import { createClient } from "@/src/lib/supabase";
import { toast } from "sonner";
import { Cliente, ItemCarrinho } from "@/src/types";
import { addDays, format } from "date-fns";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: Cliente | null;
  carrinho: ItemCarrinho[];
  total: number;
  onSuccess: () => void; // Limpar carrinho após sucesso
}

export function CheckoutModal({ isOpen, onClose, cliente, carrinho, total, onSuccess }: CheckoutModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  
  // Configuração da Venda
  const [parcelas, setParcelas] = useState(1);
  const [primeiroVencimento, setPrimeiroVencimento] = useState(
    format(addDays(new Date(), 30), "yyyy-MM-dd") // Padrão: Daqui 30 dias
  );

  // Simulação das Parcelas (Visualização)
  const valorParcela = total / parcelas;
  const pontosGanhos = Math.floor(total / 10); // Regra: 1 ponto a cada 10 reais

  const handleFinalizar = async () => {
    if (!cliente) return;
    setLoading(true);

    try {
      // 1. Criar a VENDA (Cabeçalho)
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

      // 2. Inserir os ITENS DA VENDA
      const itensParaInserir = carrinho.map(item => ({
        venda_id: vendaId,
        produto_id: item.id,
        produto_nome: item.nome,
        quantidade: item.quantidade,
        valor_unitario: item.preco
      }));

      const { error: itensError } = await supabase.from("itens_venda").insert(itensParaInserir);
      if (itensError) throw itensError;

      // 3. Gerar as PARCELAS (Financeiro)
      const parcelasParaInserir = [];
      const dataBase = new Date(primeiroVencimento);

      for (let i = 0; i < parcelas; i++) {
        // Adiciona meses subsequentes (Lógica simples de 30 dias para MVP)
        // O ideal é usar addMonths, mas cuidado com dia 31. Vamos usar dias fixos por enquanto.
        const dataVenc = addDays(dataBase, i * 30); 
        
        parcelasParaInserir.push({
          venda_id: vendaId,
          cliente_id: cliente.id,
          numero_parcela: i + 1,
          data_vencimento: format(dataVenc, "yyyy-MM-dd"),
          valor: valorParcela,
          status: "pendente"
        });
      }

      const { error: parcelasError } = await supabase.from("parcelas").insert(parcelasParaInserir);
      if (parcelasError) throw parcelasError;

      // 4. Atualizar PONTOS do Cliente (Gamificação)
      const novosPontos = (cliente.pontos_acumulados || 0) + pontosGanhos;
      const { error: clienteError } = await supabase
        .from("clientes")
        .update({ pontos_acumulados: novosPontos })
        .eq("id", cliente.id);

      if (clienteError) throw clienteError;

      // SUCESSO TOTAL
      toast.success("Venda realizada com sucesso!");
      onSuccess(); // Limpa o carrinho lá no pai
      onClose();   // Fecha modal

    } catch (error) {
      console.error(error);
      toast.error("Erro ao finalizar venda. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !cliente) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-200">
        
        {/* Cabeçalho */}
        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <DollarSign size={24} className="text-blue-200" />
            <div>
              <h2 className="text-lg font-bold">Finalizar Crediário</h2>
              <p className="text-blue-100 text-xs">Cliente: {cliente.nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-blue-700 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Resumo de Valores */}
          <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div>
              <p className="text-sm text-gray-500">Valor Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Pontos Ganhos</p>
              <p className="text-xl font-bold text-blue-600">+{pontosGanhos} pts</p>
            </div>
          </div>

          {/* Configuração do Crediário */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Parcelas</label>
              <select 
                value={parcelas}
                onChange={(e) => setParcelas(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 10, 12].map(n => (
                  <option key={n} value={n}>{n}x de {(total / n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">1º Vencimento</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="date"
                  value={primeiroVencimento}
                  onChange={(e) => setPrimeiroVencimento(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* Preview das Parcelas */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 max-h-40 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Vencimento</th>
                  <th className="pb-2 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {Array.from({ length: parcelas }).map((_, i) => {
                  const dataPrevista = addDays(new Date(primeiroVencimento), i * 30);
                  return (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="py-2">{i + 1}</td>
                      <td className="py-2">{format(dataPrevista, "dd/MM/yyyy")}</td>
                      <td className="py-2 text-right font-medium">
                        {(total / parcelas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Botões de Ação */}
          <div className="pt-2 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleFinalizar}
              disabled={loading}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />}
              Confirmar Venda
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}