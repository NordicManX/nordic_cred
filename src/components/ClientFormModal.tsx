"use client";

import { useEffect, useState } from "react";
import { X, Save, Loader2, DollarSign, Search, MapPin } from "lucide-react";
import { createClient } from "@/src/lib/supabase";
import { toast } from "sonner";

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clienteParaEditar?: any | null;
}

export function ClientFormModal({ isOpen, onClose, onSuccess, clienteParaEditar }: ClientFormModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);

  // Estados do Formulário
  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    telefone: "",
    limite_credito: 0,
    // Novos campos de endereço
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: ""
  });

  // Efeito: Carrega dados ao abrir (Edição ou Novo)
  useEffect(() => {
    if (isOpen) {
      if (clienteParaEditar) {
        setFormData({
          nome: clienteParaEditar.nome || "",
          cpf: clienteParaEditar.cpf || "",
          telefone: clienteParaEditar.telefone || "",
          limite_credito: clienteParaEditar.limite_credito || 0,
          // Tenta pegar os campos novos, se não tiver, deixa vazio
          cep: clienteParaEditar.cep || "",
          logradouro: clienteParaEditar.logradouro || "",
          numero: clienteParaEditar.numero || "",
          complemento: clienteParaEditar.complemento || "",
          bairro: clienteParaEditar.bairro || "",
          cidade: clienteParaEditar.cidade || "",
          estado: clienteParaEditar.estado || ""
        });
      } else {
        // Limpa tudo se for novo
        setFormData({ 
          nome: "", cpf: "", telefone: "", limite_credito: 0,
          cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: ""
        });
      }
    }
  }, [isOpen, clienteParaEditar]);

  // Função para buscar CEP
  const buscarCep = async (cepInput: string) => {
    // Remove tudo que não é número
    const cepLimpo = cepInput.replace(/\D/g, "");

    // Atualiza o estado do CEP visualmente
    setFormData(prev => ({ ...prev, cep: cepInput }));

    // Só busca se tiver 8 dígitos
    if (cepLimpo.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await response.json();

        if (data.erro) {
          toast.error("CEP não encontrado.");
        } else {
          setFormData(prev => ({
            ...prev,
            logradouro: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            estado: data.uf
          }));
          toast.success("Endereço encontrado!");
          // Opcional: focar no campo número (via ref) se quisesse ser muito chique
        }
      } catch (error) {
        toast.error("Erro ao buscar CEP.");
      } finally {
        setLoadingCep(false);
      }
    }
  };

  if (!isOpen) return null;

  async function handleSave() {
    if (!formData.nome) return toast.warning("O nome é obrigatório.");

    setLoading(true);

    // Monta o endereço completo antigo (para compatibilidade com a listagem)
    const enderecoFormatado = `${formData.logradouro}, ${formData.numero} ${formData.complemento ? '- ' + formData.complemento : ''} - ${formData.bairro}, ${formData.cidade}/${formData.estado}`;

    const dadosParaSalvar = {
        ...formData,
        limite_credito: parseFloat(formData.limite_credito.toString()) || 0,
        endereco: enderecoFormatado // Mantém o campo antigo atualizado
    };

    let error;

    if (clienteParaEditar) {
      const { error: updateError } = await supabase
        .from("clientes")
        .update(dadosParaSalvar)
        .eq("id", clienteParaEditar.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("clientes")
        .insert([dadosParaSalvar]);
      error = insertError;
    }

    setLoading(false);

    if (error) {
      console.error(error);
      toast.error("Erro ao salvar cliente.");
    } else {
      toast.success(clienteParaEditar ? "Dados atualizados!" : "Cliente cadastrado!");
      onSuccess();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabeçalho */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-bold text-lg text-gray-900">
                {clienteParaEditar ? "Editar Cliente" : "Novo Cliente"}
            </h3>
            <p className="text-xs text-gray-500">Preencha os dados completos.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors bg-white p-2 rounded-full border border-transparent hover:border-gray-200">
            <X size={20} />
          </button>
        </div>

        {/* Formulário com Scroll */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* SEÇÃO 1: DADOS PESSOAIS */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-b border-blue-100 pb-1">Dados Pessoais</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label-form">Nome Completo *</label>
                <input 
                  value={formData.nome}
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  className="input-form"
                  placeholder="Ex: Maria Silva"
                  autoFocus
                />
              </div>

              <div>
                <label className="label-form">CPF</label>
                <input 
                  value={formData.cpf}
                  onChange={e => setFormData({...formData, cpf: e.target.value})}
                  className="input-form"
                  placeholder="000.000.000-00"
                />
              </div>
              
              <div>
                <label className="label-form">Telefone / WhatsApp</label>
                <input 
                  value={formData.telefone}
                  onChange={e => setFormData({...formData, telefone: e.target.value})}
                  className="input-form"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: ENDEREÇO */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-b border-blue-100 pb-1 flex items-center gap-2">
              Endereço <span className="text-gray-400 font-normal text-[10px] lowercase">(Busca automática pelo CEP)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* CEP */}
              <div className="md:col-span-1">
                <label className="label-form">CEP</label>
                <div className="relative">
                  <input 
                    value={formData.cep}
                    onChange={e => buscarCep(e.target.value)}
                    className="input-form pr-8"
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {loadingCep ? (
                    <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-600" />
                  ) : (
                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Cidade e Estado (Preenchidos Auto) */}
              <div className="md:col-span-2">
                <label className="label-form">Cidade</label>
                <input 
                  value={formData.cidade}
                  onChange={e => setFormData({...formData, cidade: e.target.value})}
                  className="input-form bg-gray-50"
                  placeholder="Cidade"
                />
              </div>
              <div className="md:col-span-1">
                <label className="label-form">UF</label>
                <input 
                  value={formData.estado}
                  onChange={e => setFormData({...formData, estado: e.target.value})}
                  className="input-form bg-gray-50"
                  placeholder="UF"
                  maxLength={2}
                />
              </div>

              {/* Logradouro */}
              <div className="md:col-span-3">
                <label className="label-form">Logradouro (Rua, Av...)</label>
                <input 
                  value={formData.logradouro}
                  onChange={e => setFormData({...formData, logradouro: e.target.value})}
                  className="input-form"
                  placeholder="Nome da rua"
                />
              </div>

              {/* Número */}
              <div className="md:col-span-1">
                <label className="label-form">Número</label>
                <input 
                  value={formData.numero}
                  onChange={e => setFormData({...formData, numero: e.target.value})}
                  className="input-form"
                  placeholder="123"
                />
              </div>

              {/* Bairro e Complemento */}
              <div className="md:col-span-2">
                <label className="label-form">Bairro</label>
                <input 
                  value={formData.bairro}
                  onChange={e => setFormData({...formData, bairro: e.target.value})}
                  className="input-form"
                  placeholder="Bairro"
                />
              </div>
              <div className="md:col-span-2">
                <label className="label-form">Complemento</label>
                <input 
                  value={formData.complemento}
                  onChange={e => setFormData({...formData, complemento: e.target.value})}
                  className="input-form"
                  placeholder="Apto, Bloco, etc."
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: FINANCEIRO */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider border-b border-green-100 pb-1">Financeiro</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-form text-green-700">Limite de Crédito</label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500" />
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.limite_credito}
                    onChange={e => setFormData({...formData, limite_credito: parseFloat(e.target.value) || 0})}
                    className="w-full border border-green-200 bg-green-50/30 rounded-lg pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-green-500 outline-none font-bold text-gray-800"
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Rodapé */}
        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 text-gray-600 hover:bg-white hover:text-gray-800 border border-transparent hover:border-gray-200 rounded-lg font-medium transition-all">
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-blue-200"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {clienteParaEditar ? "Salvar Alterações" : "Cadastrar Cliente"}
          </button>
        </div>

      </div>

      {/* Estilos locais para limpar o código JSX */}
      <style jsx>{`
        .label-form {
          display: block;
          font-size: 0.75rem; /* text-xs */
          font-weight: 700;
          color: #6b7280; /* text-gray-500 */
          text-transform: uppercase;
          margin-bottom: 0.25rem;
        }
        .input-form {
          width: 100%;
          border: 1px solid #d1d5db; /* border-gray-300 */
          border-radius: 0.5rem; /* rounded-lg */
          padding: 0.625rem 0.75rem; /* py-2.5 px-3 */
          color: #1f2937; /* text-gray-800 */
          outline: none;
          transition: all 0.2s;
        }
        .input-form:focus {
          border-color: #3b82f6; /* blue-500 */
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
      `}</style>
    </div>
  );
}