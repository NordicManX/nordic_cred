"use client";

import { useState, useEffect } from "react";
import { X, Save, Loader2, Package, Edit, Barcode, Calculator, RefreshCw } from "lucide-react";
import { createClient } from "@/src/lib/supabase";
import { toast } from "sonner";
import { maskMoney } from "@/src/utils/masks";
import { Produto } from "@/src/types";
import { generateEAN13 } from "@/src/utils/eanGenerator";
import { NcmSelect } from "@/src/components/NcmSelect";

interface NovoProdutoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  produtoParaEditar?: Produto | null;
}

export function NovoProdutoModal({ isOpen, onClose, onSuccess, produtoParaEditar }: NovoProdutoModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    codigo_barras: "",
    ncm: "",
    unidade: "UN",
    tipo_produto: "revenda",
    estoque: "0",
    estoque_minimo: "5",
    custo: "",
    margem_lucro: "",
    preco: ""
  });

  useEffect(() => {
    if (isOpen) {
      if (produtoParaEditar) {
        setFormData({
          nome: produtoParaEditar.nome,
          codigo_barras: produtoParaEditar.codigo_barras || "",
          ncm: produtoParaEditar.ncm || "",
          unidade: produtoParaEditar.unidade || "UN",
          tipo_produto: produtoParaEditar.tipo_produto || "revenda",
          estoque: produtoParaEditar.estoque?.toString() || "0",
          estoque_minimo: produtoParaEditar.estoque_minimo?.toString() || "5",
          custo: produtoParaEditar.custo ? maskMoney(produtoParaEditar.custo.toFixed(2)) : "0,00",
          margem_lucro: produtoParaEditar.margem_lucro?.toString() || "0",
          preco: maskMoney(produtoParaEditar.preco.toFixed(2))
        });
      } else {
        // Novo Produto: Gera código de barras automático ao abrir
        setFormData({
          nome: "",
          codigo_barras: generateEAN13(),
          ncm: "",
          unidade: "UN",
          tipo_produto: "revenda",
          estoque: "0",
          estoque_minimo: "5",
          custo: "",
          margem_lucro: "",
          preco: ""
        });
      }
    }
  }, [isOpen, produtoParaEditar]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Lógica de Máscaras e Cálculos
    if (name === 'custo' || name === 'preco') {
      const maskedValue = maskMoney(value);

      // Se alterou Custo e tem Margem, recalcula Preço
      if (name === 'custo') {
        setFormData(prev => {
          const custoNum = parseFloat(maskedValue.replace(/\./g, '').replace(',', '.') || '0');
          const margemNum = parseFloat(prev.margem_lucro || '0');
          const novoPreco = custoNum + (custoNum * (margemNum / 100));
          return { ...prev, custo: maskedValue, preco: maskMoney(novoPreco.toFixed(2)) };
        });
      } else {
        setFormData(prev => ({ ...prev, [name]: maskedValue }));
      }

    } else if (name === 'margem_lucro') {
      // Se alterou Margem, recalcula Preço baseado no Custo
      setFormData(prev => {
        const custoNum = parseFloat(prev.custo.replace(/\./g, '').replace(',', '.') || '0');
        const margemNum = parseFloat(value || '0');
        const novoPreco = custoNum + (custoNum * (margemNum / 100));
        return { ...prev, margem_lucro: value, preco: maskMoney(novoPreco.toFixed(2)) };
      });

    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const gerarNovoCodigo = () => {
    setFormData(prev => ({ ...prev, codigo_barras: generateEAN13() }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const custoFloat = parseFloat(formData.custo.replace(/\./g, '').replace(',', '.') || '0');
    const precoFloat = parseFloat(formData.preco.replace(/\./g, '').replace(',', '.') || '0');
    const margemFloat = parseFloat(formData.margem_lucro || '0');
    const estoqueInt = parseInt(formData.estoque) || 0;
    const estoqueMinInt = parseInt(formData.estoque_minimo) || 0;

    const payload = {
      nome: formData.nome,
      codigo_barras: formData.codigo_barras,
      ncm: formData.ncm,
      unidade: formData.unidade,
      tipo_produto: formData.tipo_produto,
      custo: custoFloat,
      margem_lucro: margemFloat,
      preco: precoFloat,
      estoque: estoqueInt,
      estoque_minimo: estoqueMinInt
    };

    try {
      if (produtoParaEditar) {
        const { error } = await supabase.from("produtos").update(payload).eq("id", produtoParaEditar.id);
        if (error) throw error;
        toast.success("Produto atualizado!");
      } else {
        const { error } = await supabase.from("produtos").insert(payload);
        if (error) throw error;
        toast.success("Produto cadastrado!");
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar produto.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  const isEditing = !!produtoParaEditar;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">

        {/* Cabeçalho */}
        <div className={`px-6 py-4 flex justify-between items-center text-white ${isEditing ? 'bg-orange-600' : 'bg-blue-600'}`}>
          <h2 className="font-bold flex items-center gap-2 text-lg">
            <Package size={24} className="text-white/80" />
            {isEditing ? "Editar Produto" : "Novo Produto"}
          </h2>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* SEÇÃO 1: Identificação */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-1">Identificação</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Nome do Produto *</label>
                <input required name="nome" value={formData.nome} onChange={handleChange} placeholder="Ex: Notebook Gamer..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex justify-between">
                  Código de Barras (EAN)
                  <button type="button" onClick={gerarNovoCodigo} className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                    <RefreshCw size={10} /> Gerar Novo
                  </button>
                </label>
                <div className="relative">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input name="codigo_barras" value={formData.codigo_barras} onChange={handleChange} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">NCM (Busca Inteligente)</label>
                <NcmSelect
                  value={formData.ncm}
                  onChange={(novoNcm) => setFormData(prev => ({ ...prev, ncm: novoNcm }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Unidade</label>
                <select name="unidade" value={formData.unidade} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                  <option value="UN">UN - Unidade</option>
                  <option value="KG">KG - Quilograma</option>
                  <option value="LT">LT - Litro</option>
                  <option value="CX">CX - Caixa</option>
                  <option value="M">M - Metro</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Tipo</label>
                <select name="tipo_produto" value={formData.tipo_produto} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                  <option value="revenda">Revenda</option>
                  <option value="servico">Serviço</option>
                  <option value="fabricacao">Fabricação Própria</option>
                </select>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: Formação de Preço */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-1 flex items-center gap-2">
              <Calculator size={14} /> Custos e Precificação
            </h3>

            <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Preço de Custo (R$)</label>
                <input name="custo" value={formData.custo} onChange={handleChange} placeholder="0,00" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="space-y-1 relative">
                <label className="text-xs font-semibold text-gray-500">Margem (%)</label>
                <input type="number" name="margem_lucro" value={formData.margem_lucro} onChange={handleChange} placeholder="Ex: 50" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="absolute right-8 top-8 text-gray-400 text-xs text-center">=</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-green-700">Preço de Venda (R$)</label>
                <input required name="preco" value={formData.preco} onChange={handleChange} className="w-full px-3 py-2 border-2 border-green-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 font-bold text-lg text-green-800" />
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: Estoque */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-1">Controle de Estoque</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Estoque Atual</label>
                <input type="number" name="estoque" value={formData.estoque} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Estoque Mínimo (Alerta)</label>
                <input type="number" name="estoque_minimo" value={formData.estoque_minimo} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className={`flex-1 py-3 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02] ${isEditing ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
              {isEditing ? "Atualizar Produto" : "Salvar Cadastro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}