"use client";

import { useState, useEffect } from "react";
import { X, Save, Loader2, DollarSign, Edit } from "lucide-react";
import { createClient } from "@/src/lib/supabase";
import { toast } from "sonner";
import { maskMoney } from "@/src/utils/masks";
import { Despesa } from "@/src/types";

interface NovaDespesaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  despesaParaEditar?: Despesa | null; // <--- NOVO PROP OPCIONAL
}

export function NovaDespesaModal({ isOpen, onClose, onSuccess, despesaParaEditar }: NovaDespesaModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    descricao: "",
    categoria: "fixa",
    valor: "",
    data_vencimento: ""
  });

  // Efeito Mágico: Quando abre, verifica se é Edição ou Novo
  useEffect(() => {
    if (isOpen) {
      if (despesaParaEditar) {
        // MODO EDIÇÃO: Preenche os campos
        setFormData({
          descricao: despesaParaEditar.descricao,
          categoria: despesaParaEditar.categoria,
          // Converte o número do banco (1500.50) para string mascarada (1.500,50)
          valor: maskMoney(despesaParaEditar.valor.toFixed(2)), 
          data_vencimento: despesaParaEditar.data_vencimento
        });
      } else {
        // MODO NOVO: Limpa tudo
        setFormData({ descricao: "", categoria: "fixa", valor: "", data_vencimento: "" });
      }
    }
  }, [isOpen, despesaParaEditar]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'valor') {
      setFormData(prev => ({ ...prev, valor: maskMoney(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const valorFloat = parseFloat(formData.valor.replace(/\./g, '').replace(',', '.'));

    if (despesaParaEditar) {
      // --- LOGICA DE ATUALIZAR (UPDATE) ---
      const { error } = await supabase
        .from("despesas")
        .update({
          descricao: formData.descricao,
          categoria: formData.categoria,
          valor: valorFloat,
          data_vencimento: formData.data_vencimento
        })
        .eq("id", despesaParaEditar.id);

      if (error) {
        toast.error("Erro ao atualizar despesa.");
      } else {
        toast.success("Despesa atualizada com sucesso!");
        onSuccess();
        onClose();
      }

    } else {
      // --- LOGICA DE CRIAR (INSERT) ---
      const { error } = await supabase.from("despesas").insert({
        descricao: formData.descricao,
        categoria: formData.categoria,
        valor: valorFloat,
        data_vencimento: formData.data_vencimento,
        status: "pendente"
      });

      if (error) {
        toast.error("Erro ao salvar despesa.");
      } else {
        toast.success("Despesa lançada com sucesso!");
        onSuccess();
        onClose();
      }
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  const isEditing = !!despesaParaEditar;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Cabeçalho muda de cor se for Edição */}
        <div className={`px-6 py-4 flex justify-between items-center text-white ${isEditing ? 'bg-orange-600' : 'bg-red-600'}`}>
          <h2 className="font-bold flex items-center gap-2">
            {isEditing ? <Edit size={20} className="text-orange-200" /> : <DollarSign size={20} className="text-red-200" />}
            {isEditing ? "Editar Despesa" : "Nova Despesa"}
          </h2>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">Descrição</label>
            <input
              required
              name="descricao"
              value={formData.descricao}
              onChange={handleChange}
              placeholder="Ex: Conta de Luz..."
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${isEditing ? 'focus:ring-orange-500' : 'focus:ring-red-500'}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Categoria</label>
              <select
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 bg-white ${isEditing ? 'focus:ring-orange-500' : 'focus:ring-red-500'}`}
              >
                <option value="fixa">Despesa Fixa</option>
                <option value="variavel">Despesa Variável</option>
                <option value="fornecedor">Fornecedor</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Vencimento</label>
              <input
                required
                type="date"
                name="data_vencimento"
                value={formData.data_vencimento}
                onChange={handleChange}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${isEditing ? 'focus:ring-orange-500' : 'focus:ring-red-500'}`}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">Valor (R$)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">R$</span>
              <input
                required
                name="valor"
                value={formData.valor}
                onChange={handleChange}
                className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-lg font-bold text-gray-800 ${isEditing ? 'focus:ring-orange-500' : 'focus:ring-red-500'}`}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-2.5 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${isEditing ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {loading ? <Loader2 className="animate-spin" /> : (isEditing ? <Save size={18} /> : <DollarSign size={18} />)}
              {isEditing ? "Atualizar" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}