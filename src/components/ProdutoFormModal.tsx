"use client";

import { useState, useEffect, useRef } from "react";
import { X, Save, Loader2, Package, Barcode, Calculator, RotateCcw, CloudDownload, Search } from "lucide-react";
import { createClient } from "@/src/lib/supabase";
import { toast } from "sonner";

interface ProdutoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  produtoParaEditar?: any | null;
}

export function ProdutoFormModal({ isOpen, onClose, onSuccess, produtoParaEditar }: ProdutoFormModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  // --- ESTADOS DO FORMULÁRIO ---
  const [nome, setNome] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [ncm, setNcm] = useState("");
  const [estoque, setEstoque] = useState("");
  const [estoqueMinimo, setEstoqueMinimo] = useState("5");
  
  // Financeiro
  const [precoCusto, setPrecoCusto] = useState("");
  const [margemLucro, setMargemLucro] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");

  // --- AUTOCOMPLETE NCM ---
  const [sugestoesNcm, setSugestoesNcm] = useState<any[]>([]);
  const [mostrandoSugestoes, setMostrandoSugestoes] = useState(false);
  const [loadingNcm, setLoadingNcm] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null); // Para fechar ao clicar fora

  useEffect(() => {
    if (isOpen) {
      if (produtoParaEditar) {
        setNome(produtoParaEditar.nome || "");
        setCodigoBarras(produtoParaEditar.codigo_barras || "");
        setNcm(produtoParaEditar.ncm || "");
        setEstoque(produtoParaEditar.estoque?.toString() || "");
        setEstoqueMinimo(produtoParaEditar.estoque_minimo?.toString() || "5");
        setPrecoCusto(produtoParaEditar.preco_custo?.toString() || "");
        setMargemLucro(produtoParaEditar.margem_lucro?.toString() || "");
        setPrecoVenda(produtoParaEditar.preco?.toString() || "");
      } else {
        limparFormulario();
      }
    }
  }, [isOpen, produtoParaEditar]);

  // Fecha sugestões ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: any) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setMostrandoSugestoes(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const limparFormulario = () => {
    setNome("");
    setCodigoBarras("");
    setNcm("");
    setEstoque("");
    setEstoqueMinimo("5");
    setPrecoCusto("");
    setMargemLucro("");
    setPrecoVenda("");
    setSugestoesNcm([]);
  };

  // --- FUNÇÕES NCM ---

  // 1. Sincronizar Base (Botão Nuvem)
  const atualizarBaseNcm = async () => {
    setLoadingNcm(true);
    const toastId = toast.loading("Baixando tabela NCM do governo...");
    
    try {
        // Busca da BrasilAPI (Gratuita)
        const response = await fetch("https://brasilapi.com.br/api/ncm/v1");
        const dados = await response.json();

        if (!dados || dados.length === 0) throw new Error("API retornou vazio.");

        toast.loading("Salvando no banco de dados (isso pode demorar um pouco)...", { id: toastId });

        // Prepara para inserir em lotes (Chunking) para não travar
        const ncmFormatados = dados.map((item: any) => ({
            codigo: item.codigo,
            descricao: item.descricao
        }));

        // Upsert no Supabase
        const { error } = await supabase.from("ncms").upsert(ncmFormatados, { onConflict: 'codigo' });
        
        if (error) throw error;

        toast.success("Tabela NCM atualizada com sucesso!", { id: toastId });

    } catch (err: any) {
        console.error(err);
        toast.error("Erro ao atualizar NCM: " + err.message, { id: toastId });
    } finally {
        setLoadingNcm(false);
    }
  };

  // 2. Busca Autocomplete (Enquanto digita)
  const buscarSugestoesNcm = async (texto: string) => {
    setNcm(texto);
    if (texto.length < 3) {
        setSugestoesNcm([]);
        setMostrandoSugestoes(false);
        return;
    }

    const { data } = await supabase
        .from("ncms")
        .select("*")
        .or(`codigo.ilike.%${texto}%,descricao.ilike.%${texto}%`)
        .limit(10); // Limita para não travar a tela
    
    setSugestoesNcm(data || []);
    setMostrandoSugestoes(true);
  };

  const selecionarNcm = (item: any) => {
    setNcm(item.codigo); // Salva só o código no input
    setMostrandoSugestoes(false);
  };

  // --- OUTRAS FUNÇÕES ---

  const gerarCodigoBarras = () => {
    let codigo = "789";
    for (let i = 0; i < 9; i++) codigo += Math.floor(Math.random() * 10);
    let soma = 0;
    for (let i = 0; i < 12; i++) {
        const digito = parseInt(codigo[i]);
        soma += i % 2 === 0 ? digito * 1 : digito * 3;
    }
    const resto = soma % 10;
    const digitoVerificador = resto === 0 ? 0 : 10 - resto;
    setCodigoBarras(codigo + digitoVerificador);
  };

  useEffect(() => {
    const custo = parseFloat(precoCusto.replace(',', '.'));
    const margem = parseFloat(margemLucro.replace(',', '.'));
    if (!isNaN(custo) && !isNaN(margem)) {
        const vendaCalculada = custo + (custo * (margem / 100));
        setPrecoVenda(vendaCalculada.toFixed(2));
    }
  }, [precoCusto, margemLucro]);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const vendaFloat = parseFloat(precoVenda.replace(',', '.'));
      const custoFloat = parseFloat(precoCusto.replace(',', '.')) || 0;
      const margemFloat = parseFloat(margemLucro.replace(',', '.')) || 0;
      const estoqueInt = parseInt(estoque, 10);

      if (!nome || isNaN(vendaFloat)) {
        toast.warning("Preencha Nome e Preço de Venda.");
        setLoading(false);
        return;
      }

      const dadosProduto = {
        nome,
        codigo_barras: codigoBarras,
        ncm,
        estoque: isNaN(estoqueInt) ? 0 : estoqueInt,
        estoque_minimo: parseInt(estoqueMinimo) || 5,
        preco: vendaFloat,
        preco_custo: custoFloat,
        margem_lucro: margemFloat
      };

      if (produtoParaEditar?.id) {
        await supabase.from("produtos").update(dadosProduto).eq("id", produtoParaEditar.id);
      } else {
        await supabase.from("produtos").insert(dadosProduto);
      }

      toast.success(produtoParaEditar ? "Produto atualizado!" : "Produto cadastrado!");
      onSuccess();
      onClose();

    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <Package size={20} />
            </div>
            <div>
                <h2 className="text-lg font-bold text-gray-800">
                {produtoParaEditar ? "Editar Produto" : "Novo Produto"}
                </h2>
                <p className="text-xs text-gray-500">Cadastro completo de item.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSalvar} className="p-6 overflow-y-auto space-y-6 flex-1">
          
          <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-1">Identificação</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
                <input 
                  type="text" required value={nome} onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  placeholder="EX: PRODUTO X..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código de Barras (EAN)</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                            <input 
                              type="text" value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <button type="button" onClick={gerarCodigoBarras} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg border border-gray-200" title="Gerar EAN">
                            <RotateCcw size={18} />
                        </button>
                    </div>
                  </div>

                  {/* CAMPO NCM COM AUTOCOMPLETE */}
                  <div ref={wrapperRef} className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">NCM (Fiscal)</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                             <input 
                                type="text" 
                                value={ncm}
                                onChange={(e) => buscarSugestoesNcm(e.target.value)}
                                onFocus={() => ncm.length >= 3 && setMostrandoSugestoes(true)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Digite cód ou nome..."
                                autoComplete="off"
                             />
                             {/* Lista Suspensa de Sugestões */}
                             {mostrandoSugestoes && sugestoesNcm.length > 0 && (
                                <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                                    {sugestoesNcm.map((item) => (
                                        <li 
                                            key={item.codigo}
                                            onClick={() => selecionarNcm(item)}
                                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs border-b border-gray-50 last:border-0"
                                        >
                                            <span className="font-bold text-gray-800">{item.codigo}</span> - <span className="text-gray-600">{item.descricao.slice(0, 40)}...</span>
                                        </li>
                                    ))}
                                </ul>
                             )}
                        </div>
                        {/* BOTÃO PARA ATUALIZAR TABELA NCM */}
                        <button 
                            type="button"
                            onClick={atualizarBaseNcm}
                            disabled={loadingNcm}
                            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg border border-blue-200 transition-colors"
                            title="Atualizar Tabela NCM (Internet)"
                        >
                            {loadingNcm ? <Loader2 className="animate-spin" size={18}/> : <CloudDownload size={18} />}
                        </button>
                    </div>
                  </div>
              </div>
          </div>

          {/* Calculadora Financeira */}
          <div className="space-y-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                <Calculator size={14}/> Formação de Preço
              </h3>
              <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Custo (R$)</label>
                    <input type="number" step="0.01" value={precoCusto} onChange={(e) => setPrecoCusto(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Margem (%)</label>
                    <input type="number" step="0.1" value={margemLucro} onChange={(e) => setMargemLucro(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-600 font-bold" placeholder="Ex: 50"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-green-700 mb-1">Venda Final *</label>
                    <input type="number" step="0.01" required value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-green-400 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-lg font-bold text-green-700 shadow-sm"/>
                  </div>
              </div>
          </div>

          <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-1">Estoque</h3>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Qtd Atual</label>
                    <input type="number" required value={estoque} onChange={(e) => setEstoque(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estoque Mínimo</label>
                    <input type="number" value={estoqueMinimo} onChange={(e) => setEstoqueMinimo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  </div>
              </div>
          </div>
        </form>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors">Cancelar</button>
          <button onClick={handleSalvar} disabled={loading} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-md flex items-center gap-2 disabled:opacity-70 transition-all">
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {produtoParaEditar ? "Salvar" : "Cadastrar"}
          </button>
        </div>

      </div>
    </div>
  );
}