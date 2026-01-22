"use client";

import { useState } from "react";
import { X, Save, Loader2, UserPlus } from "lucide-react";
import { createClient } from "@/src/lib/supabase";
import { toast } from "sonner";
import { maskCPF, maskPhone, maskRG } from "@/src/utils/masks";

interface NovoClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NovoClienteModal({ isOpen, onClose, onSuccess }: NovoClienteModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    rg: "",
    telefone: "",
    endereco: "",
    limite_credito: "1000",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === "cpf") finalValue = maskCPF(value);
    if (name === "telefone") finalValue = maskPhone(value);
    if (name === "rg") finalValue = maskRG(value);

    setFormData((prev) => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (formData.cpf.length < 14) {
      toast.error("CPF incompleto!");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("clientes").insert({
      nome: formData.nome,
      cpf: formData.cpf,
      rg: formData.rg,
      telefone: formData.telefone,
      endereco: formData.endereco,
      limite_credito: parseFloat(formData.limite_credito),
      status: "ativo",
      pontos_acumulados: 0
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("Este CPF já está cadastrado!");
      } else {
        toast.error("Erro ao cadastrar cliente.");
      }
    } else {
      toast.success("Cliente cadastrado com sucesso!");
      setFormData({ nome: "", cpf: "", rg: "", telefone: "", endereco: "", limite_credito: "1000" });
      onSuccess();
      onClose();
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100">
        
        {/* Cabeçalho */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Novo Cliente</h2>
              <p className="text-sm text-gray-500">Cadastro completo para crediário.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Nome */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Nome Completo <span className="text-red-500">*</span></label>
              <input
                required
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                placeholder="Ex: Nelson Antônio"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 uppercase transition-all placeholder:text-gray-400 text-gray-900"
              />
            </div>

            {/* CPF */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">CPF <span className="text-red-500">*</span></label>
              <input
                required
                name="cpf"
                value={formData.cpf}
                onChange={handleChange}
                placeholder="000.000.000-00"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-gray-900 transition-all"
              />
            </div>

            {/* RG */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">RG</label>
              <input
                name="rg"
                value={formData.rg}
                onChange={handleChange}
                placeholder="00.000.000-0"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-gray-900 transition-all"
              />
            </div>

            {/* Telefone */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Telefone / WhatsApp</label>
              <input
                name="telefone"
                value={formData.telefone}
                onChange={handleChange}
                placeholder="(00) 0 0000-0000"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-gray-900 transition-all"
              />
            </div>

            {/* Limite */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Limite Inicial (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
                <input
                  type="number"
                  name="limite_credito"
                  value={formData.limite_credito}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 text-green-700 font-bold transition-all"
                />
              </div>
            </div>

             {/* Endereço */}
             <div className="md:col-span-2 space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Endereço Completo</label>
              <input
                name="endereco"
                value={formData.endereco}
                onChange={handleChange}
                placeholder="Rua, Número, Bairro..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-gray-900 transition-all"
              />
            </div>
          </div>

          {/* Rodapé */}
          <div className="pt-6 flex justify-end gap-3 border-t border-gray-100 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Salvar Cadastro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}