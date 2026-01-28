"use client";

import { useEffect, useState } from "react";
import { X, Save, Loader2, DollarSign, Search, Award, AlertCircle, Trash2 } from "lucide-react";
import { createClient } from "@/src/lib/supabase";
import { toast } from "sonner";
import { ConfirmModal } from "@/src/components/ConfirmModal"; 

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clienteParaEditar?: any | null;
}

export function ClientFormModal({ isOpen, onClose, onSuccess, clienteParaEditar }: ClientFormModalProps) {
  const supabase = createClient();
  
  // Estados de Loading
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [zerandoPontos, setZerandoPontos] = useState(false);
  
  // Estado para o Modal de Confirmação
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Estados do Formulário
  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    telefone: "",
    limite_credito: 0,
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    pontos_acumulados: 0 // Campo apenas leitura
  });

  // --- FUNÇÕES DE MÁSCARA ---
  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, "") // Remove tudo o que não é dígito
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1"); // Limita ao tamanho do CPF
  };

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, "") // Remove tudo o que não é dígito
      .replace(/^(\d{2})(\d)/g, "($1) $2") // Coloca parênteses em volta dos dois primeiros dígitos
      .replace(/(\d)(\d{4})$/, "$1-$2") // Coloca hífen entre o quarto e o quinto dígitos
      .slice(0, 15); // Limita tamanho (15 para celular com 9 dígitos)
  };

  useEffect(() => {
    if (isOpen) {
      if (clienteParaEditar) {
        setFormData({
          nome: clienteParaEditar.nome || "",
          cpf: clienteParaEditar.cpf || "",
          telefone: clienteParaEditar.telefone || "",
          // Tenta pegar do novo campo, se falhar tenta do antigo, se não 0
          limite_credito: clienteParaEditar.limite_credito ?? clienteParaEditar.limite ?? 0,
          cep: clienteParaEditar.cep || "",
          logradouro: clienteParaEditar.logradouro || "",
          numero: clienteParaEditar.numero || "",
          complemento: clienteParaEditar.complemento || "",
          bairro: clienteParaEditar.bairro || "",
          cidade: clienteParaEditar.cidade || "",
          estado: clienteParaEditar.estado || "",
          pontos_acumulados: clienteParaEditar.pontos_acumulados || 0
        });
      } else {
        setFormData({ 
          nome: "", cpf: "", telefone: "", limite_credito: 1000,
          cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
          pontos_acumulados: 0
        });
      }
    }
  }, [isOpen, clienteParaEditar]);

  const buscarCep = async (cepInput: string) => {
    // Aplica máscara de CEP visualmente (00000-000)
    let cepFormatado = cepInput.replace(/\D/g, "").slice(0, 8);
    if (cepFormatado.length > 5) {
        cepFormatado = cepFormatado.replace(/^(\d{5})(\d)/, "$1-$2");
    }
    
    setFormData(prev => ({ ...prev, cep: cepFormatado }));

    const cepLimpo = cepFormatado.replace(/\D/g, "");

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
        }
      } catch (error) {
        toast.error("Erro ao buscar CEP.");
      } finally {
        setLoadingCep(false);
      }
    }
  };

  // Botão clicado: Abre o modal de confirmação
  const handleRequestZerar = () => {
    if (!clienteParaEditar?.id || formData.pontos_acumulados === 0) return;
    setShowConfirmReset(true);
  };

  // Confirmado no Modal: Executa a ação no banco
  const confirmZerarPontos = async () => {
    setShowConfirmReset(false); // Fecha o modal de confirmação
    setZerandoPontos(true); // Inicia loading do botão

    try {
        const { error } = await supabase
            .from('clientes')
            .update({ pontos_acumulados: 0 })
            .eq('id', clienteParaEditar.id);

        if (error) throw error;

        setFormData(prev => ({ ...prev, pontos_acumulados: 0 }));
        toast.success("Pontos zerados com sucesso!");
        onSuccess(); // Atualiza a lista pai também
    } catch (err: any) {
        toast.error("Erro ao zerar: " + err.message);
    } finally {
        setZerandoPontos(false);
    }
  };

  async function handleSave() {
    if (!formData.nome) return toast.warning("O nome é obrigatório.");

    setLoading(true);

    // Endereço formatado legado para compatibilidade
    const enderecoFormatado = `${formData.logradouro}, ${formData.numero} ${formData.complemento ? '- ' + formData.complemento : ''} - ${formData.bairro}, ${formData.cidade}/${formData.estado}`;

    const dadosParaSalvar = {
        nome: formData.nome,
        cpf: formData.cpf,
        telefone: formData.telefone,
        limite_credito: parseFloat(formData.limite_credito.toString()) || 0,
        cep: formData.cep,
        logradouro: formData.logradouro,
        numero: formData.numero,
        complemento: formData.complemento,
        bairro: formData.bairro,
        cidade: formData.cidade,
        estado: formData.estado,
        endereco: enderecoFormatado
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
      toast.error("Erro ao salvar cliente: " + error.message);
    } else {
      toast.success(clienteParaEditar ? "Dados atualizados!" : "Cliente cadastrado!");
      onSuccess();
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <>
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
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
            
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
                    onChange={e => setFormData({...formData, cpf: maskCPF(e.target.value)})} // APLICA MÁSCARA CPF
                    className="input-form"
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
                <div>
                  <label className="label-form">Telefone / WhatsApp</label>
                  <input 
                    value={formData.telefone}
                    onChange={e => setFormData({...formData, telefone: maskPhone(e.target.value)})} // APLICA MÁSCARA TELEFONE
                    className="input-form"
                    placeholder="(00) 00000-0000"
                    maxLength={15}
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
                    {loadingCep ? <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-600" /> : <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="label-form">Cidade</label>
                  <input value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} className="input-form bg-gray-50" placeholder="Cidade" />
                </div>
                <div className="md:col-span-1">
                  <label className="label-form">UF</label>
                  <input value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})} className="input-form bg-gray-50" placeholder="UF" maxLength={2} />
                </div>
                <div className="md:col-span-3">
                  <label className="label-form">Logradouro</label>
                  <input value={formData.logradouro} onChange={e => setFormData({...formData, logradouro: e.target.value})} className="input-form" placeholder="Rua..." />
                </div>
                <div className="md:col-span-1">
                  <label className="label-form">Número</label>
                  <input value={formData.numero} onChange={e => setFormData({...formData, numero: e.target.value})} className="input-form" placeholder="123" />
                </div>
                <div className="md:col-span-2">
                  <label className="label-form">Bairro</label>
                  <input value={formData.bairro} onChange={e => setFormData({...formData, bairro: e.target.value})} className="input-form" placeholder="Bairro" />
                </div>
                <div className="md:col-span-2">
                  <label className="label-form">Complemento</label>
                  <input value={formData.complemento} onChange={e => setFormData({...formData, complemento: e.target.value})} className="input-form" placeholder="Apto, Bloco..." />
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: FINANCEIRO & FIDELIDADE (LADO A LADO) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* Coluna Financeiro */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider border-b border-green-100 pb-1">Financeiro</h4>
                  <div>
                      <label className="label-form text-green-700">Limite de Crédito</label>
                      <div className="relative">
                          <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500" />
                          <input 
                              type="number" step="0.01" min="0"
                              value={formData.limite_credito}
                              onChange={e => setFormData({...formData, limite_credito: parseFloat(e.target.value) || 0})}
                              className="w-full border border-green-200 bg-green-50/30 rounded-lg pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-green-500 outline-none font-bold text-gray-800"
                              placeholder="0,00"
                          />
                      </div>
                  </div>
                </div>

                {/* Coluna Fidelidade (Só aparece se estiver editando) */}
                {clienteParaEditar && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-purple-600 uppercase tracking-wider border-b border-purple-100 pb-1 flex items-center gap-2">
                          <Award size={14}/> Programa de Fidelidade
                      </h4>
                      <div className="flex items-end gap-3">
                          <div className="flex-1">
                              <label className="label-form text-purple-700">Pontos Acumulados</label>
                              <div className="w-full border border-purple-200 bg-purple-50 rounded-lg px-3 py-2.5 font-bold text-purple-800">
                                  {formData.pontos_acumulados} pts
                              </div>
                          </div>
                          <button 
                              type="button"
                              onClick={handleRequestZerar}
                              disabled={formData.pontos_acumulados === 0 || zerandoPontos}
                              className="h-[42px] px-3 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-xs font-bold transition-colors"
                              title="Zerar pontos deste cliente"
                          >
                              {zerandoPontos ? <Loader2 className="animate-spin" size={16}/> : <Trash2 size={16}/>}
                              Zerar
                          </button>
                      </div>
                      {formData.pontos_acumulados > 0 && (
                          <p className="text-[10px] text-gray-400 flex items-center gap-1">
                              <AlertCircle size={10}/> Zere para correções manuais.
                          </p>
                      )}
                    </div>
                )}
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

        {/* MODAL DE CONFIRMAÇÃO PERSONALIZADO */}
        <ConfirmModal 
          isOpen={showConfirmReset}
          onClose={() => setShowConfirmReset(false)}
          onConfirm={confirmZerarPontos}
          title="Zerar Pontuação?"
          description={`Você está prestes a remover os ${formData.pontos_acumulados} pontos acumulados deste cliente. Esta ação não pode ser desfeita.`}
          confirmText="Sim, zerar pontos"
          variant="danger"
        />

        <style jsx>{`
          .label-form {
            display: block;
            font-size: 0.75rem; 
            font-weight: 700;
            color: #6b7280; 
            text-transform: uppercase;
            margin-bottom: 0.25rem;
          }
          .input-form {
            width: 100%;
            border: 1px solid #d1d5db; 
            border-radius: 0.5rem; 
            padding: 0.625rem 0.75rem; 
            color: #1f2937; 
            outline: none;
            transition: all 0.2s;
          }
          .input-form:focus {
            border-color: #3b82f6; 
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
          }
          /* Scrollbar Fina */
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        `}</style>
      </div>
    </>
  );
}