"use client";

import { useState, useEffect, useRef } from "react";
import { Search, ShoppingCart, Trash2, User, Loader2, CheckCircle, X, CreditCard, Plus, LayoutGrid, LogOut, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Produto, ItemCarrinho, Cliente } from "@/src/types";
import { createClient } from "@/src/lib/supabase";
import { VendaSucessoModal } from "@/src/components/VendaSucessoModal"; 
import { ConfirmModal } from "@/src/components/ConfirmModal"; 
import { PaymentFlowModal } from "@/src/components/PaymentFlowModal"; 
import { useRouter } from "next/navigation";

// --- ESTILOS DE SCROLLBAR FININHA ---
const customStyles = `
  .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
`;

export default function PDVPage() {
  const supabase = createClient();
  const router = useRouter();
  
  // --- ESTADOS DE DADOS ---
  const [produtosDb, setProdutosDb] = useState<Produto[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  
  // --- ESTADOS DE BUSCA ---
  const [buscaProduto, setBuscaProduto] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [mostrarListaClientes, setMostrarListaClientes] = useState(false);
  
  // --- ESTADOS DE MODAIS ---
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [loadingVenda, setLoadingVenda] = useState(false);
  
  // Bloqueio e Sucesso
  const [modalBloqueioOpen, setModalBloqueioOpen] = useState(false);
  const [clienteBloqueadoTemp, setClienteBloqueadoTemp] = useState<Cliente | null>(null);
  const [sucessoOpen, setSucessoOpen] = useState(false);
  
  const [ultimaVendaId, setUltimaVendaId] = useState<string | null>(null);
  const [formaPagamentoReal, setFormaPagamentoReal] = useState<string>(""); 

  // Refs
  const inputBuscaRef = useRef<HTMLInputElement>(null);

  // ==============================================================================
  // 1. LÓGICA DE PERSISTÊNCIA (SALVAR/RECUPERAR) - NOVO!
  // ==============================================================================

  // A. Recuperar dados ao abrir a página
  useEffect(() => {
    const backup = localStorage.getItem('@nordic:pdv_backup');
    if (backup) {
      try {
        const dados = JSON.parse(backup);
        
        // Só restaura se tiver conteúdo útil
        if (dados.carrinho?.length > 0 || dados.cliente) {
            setCarrinho(dados.carrinho || []);
            setClienteSelecionado(dados.cliente || null);
            toast.info("Venda anterior recuperada!");
        }
      } catch (e) {
        console.error("Erro ao recuperar backup", e);
      }
    }
  }, []);

  // B. Salvar dados a cada alteração
  useEffect(() => {
    // Só salva se houver algo para salvar (evita salvar estado vazio inicial)
    if (carrinho.length > 0 || clienteSelecionado) {
        const estadoParaSalvar = {
            carrinho,
            cliente: clienteSelecionado
        };
        localStorage.setItem('@nordic:pdv_backup', JSON.stringify(estadoParaSalvar));
    }
  }, [carrinho, clienteSelecionado]);

  // C. Função para limpar manualmente (Cancelar Venda)
  const limparVendaAtual = () => {
    if (confirm("Tem certeza que deseja cancelar esta venda e limpar o carrinho?")) {
        setCarrinho([]);
        setClienteSelecionado(null);
        setBuscaCliente("");
        localStorage.removeItem('@nordic:pdv_backup');
        toast.success("Venda cancelada.");
        inputBuscaRef.current?.focus();
    }
  };

  // ==============================================================================

  // 2. VERIFICAR AUTENTICAÇÃO AO CARREGAR
  useEffect(() => {
    async function checkAuth() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            toast.error("Sessão expirada. Faça login novamente.");
        }
    }
    checkAuth();
  }, []);

  // 3. Carregar Produtos
  useEffect(() => {
    async function loadInitialData() {
      const { data: produtosData } = await supabase
        .from("produtos")
        .select("*")
        .order("nome");
      
      setProdutosDb(produtosData || []);
      setLoadingProdutos(false);
    }
    loadInitialData();
  }, []);

  // 4. Busca de Clientes
  useEffect(() => {
    async function searchClientes() {
      if (buscaCliente.length < 2) {
        setClientes([]);
        return;
      }
      const { data } = await supabase
        .from("clientes")
        .select("*")
        .or(`nome.ilike.%${buscaCliente}%,cpf.ilike.%${buscaCliente}%`)
        .limit(5);
      
      setClientes(data || []);
      setMostrarListaClientes(true);
    }
    const timeoutId = setTimeout(searchClientes, 300);
    return () => clearTimeout(timeoutId);
  }, [buscaCliente]);

  const selecionarCliente = (cliente: Cliente) => {
    if (cliente.status === 'bloqueado') {
        setClienteBloqueadoTemp(cliente);
        setModalBloqueioOpen(true);
        setMostrarListaClientes(false);
        return;
    }
    setClienteSelecionado(cliente);
    setMostrarListaClientes(false);
    setBuscaCliente(""); 
    toast.success(`Cliente ${cliente.nome} selecionado.`);
  };

  const adicionarAoCarrinho = (produto: Produto) => {
    setCarrinho((prev) => {
      const itemExistente = prev.find((item) => item.id === produto.id);
      if (itemExistente) {
        return prev.map((item) =>
          item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item
        );
      }
      return [...prev, { ...produto, quantidade: 1 }];
    });
    toast.success(`${produto.nome} adicionado!`);
    setBuscaProduto("");
    inputBuscaRef.current?.focus();
  };

  const removerDoCarrinho = (id: string) => {
    setCarrinho((prev) => {
        const novoCarrinho = prev.filter((item) => item.id !== id);
        // Se o carrinho ficar vazio, limpa o localStorage também para não ficar lixo
        if (novoCarrinho.length === 0 && !clienteSelecionado) {
            localStorage.removeItem('@nordic:pdv_backup');
        }
        return novoCarrinho;
    });
  };

  // --- FUNÇÃO AUXILIAR: OBTER CONSUMIDOR FINAL ---
  const getConsumidorFinalID = async () => {
      const { data: existente } = await supabase
          .from('clientes')
          .select('id')
          .ilike('nome', 'Consumidor Final')
          .maybeSingle();

      if (existente) return existente.id;

      const { data: novo, error } = await supabase
          .from('clientes')
          .insert({ 
              nome: 'Consumidor Final', 
              cpf: '000.000.000-00', 
              telefone: '00000000000'
          })
          .select('id')
          .single();
      
      if (error) {
          console.error("Erro ao criar Consumidor Final:", error);
          throw new Error("Erro de configuração: Não foi possível criar o cliente padrão.");
      }
      return novo.id;
  };

  // --- PROCESSAMENTO DA VENDA ---
  const processarVenda = async (dadosPagamento: any) => {
    setLoadingVenda(true);
    
    let clienteIdParaBanco = clienteSelecionado?.id;

    try {
        let userId = (await supabase.auth.getUser()).data.user?.id;
        if (!userId) {
            const { data: { session } } = await supabase.auth.getSession();
            userId = session?.user?.id;
        }
        if (!userId) {
            toast.error("Sessão expirada. Faça login novamente.");
            setLoadingVenda(false);
            return;
        }

        if (!clienteIdParaBanco) {
            if (dadosPagamento.forma_pagamento === 'crediario') {
                toast.error("Para Crediário, é obrigatório selecionar um cliente cadastrado!");
                setLoadingVenda(false);
                return;
            }
            try {
                clienteIdParaBanco = await getConsumidorFinalID();
            } catch (err: any) {
                toast.error(err.message);
                setLoadingVenda(false);
                return;
            }
        }

        // --- TRAVA DE LIMITE ---
        if (dadosPagamento.forma_pagamento === 'crediario') {
            const valorFinanciado = dadosPagamento.detalhes.valor_financiado;
            
            // Só valida se NÃO foi autorizado pelo gerente manualmente
            if (!dadosPagamento.detalhes.autorizado_por_gerente) {
                const { data: cliAtual, error: errCli } = await supabase
                    .from('clientes')
                    .select('limite_credito')
                    .eq('id', clienteIdParaBanco)
                    .single();

                if (errCli) throw new Error("Erro ao consultar limite.");

                const limiteDisponivel = Number(cliAtual?.limite_credito || 0);

                if (valorFinanciado > limiteDisponivel) {
                    toast.error(`Limite Insuficiente! Disponível: R$ ${limiteDisponivel.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
                    setLoadingVenda(false);
                    return;
                }
            }

            // Desconta o limite
            if (clienteIdParaBanco) {
                const { data: cliParaDesconto } = await supabase
                    .from('clientes')
                    .select('limite_credito')
                    .eq('id', clienteIdParaBanco)
                    .single();
                
                if (cliParaDesconto) {
                    const limiteAtual = Number(cliParaDesconto.limite_credito || 0);
                    const novoLimite = limiteAtual - valorFinanciado;
                    
                    await supabase
                        .from('clientes')
                        .update({ limite_credito: novoLimite })
                        .eq('id', clienteIdParaBanco);
                }
            }
        }

        // --- CRIAR A VENDA ---
        const { data: venda, error: errVenda } = await supabase.from("vendas").insert({
            user_id: userId,
            cliente_id: clienteIdParaBanco,
            valor_total: totalCarrinho,
            desconto: dadosPagamento.detalhes.desconto_aplicado || 0,
            forma_pagamento: dadosPagamento.forma_pagamento,
            status: "concluido", 
            data_venda: new Date().toISOString()
        }).select().single();

        if (errVenda) throw new Error(`Erro ao criar venda: ${errVenda.message}`);
        if (!venda) throw new Error("Erro ao gerar ID da venda.");

        // --- INSERIR ITENS ---
        const itens = carrinho.map(item => ({
            venda_id: venda.id,
            produto_id: item.id,
            produto_nome: item.nome, 
            quantidade: item.quantidade,
            valor_unitario: item.preco
        }));
        
        const { error: errItens } = await supabase.from("itens_venda").insert(itens);
        if (errItens) throw errItens;

        // --- ATUALIZAR ESTOQUE ---
        for (const item of carrinho) {
            await supabase.rpc('decrementar_estoque', { 
                p_produto_id: item.id, 
                p_quantidade: item.quantidade 
            });
        }

        // --- FIDELIDADE (PONTOS) ---
        if (clienteSelecionado && clienteIdParaBanco === clienteSelecionado.id) {
            if (dadosPagamento.detalhes.pontos_ganhos_estimados > 0) {
                await supabase.rpc('incrementar_pontos', {
                    p_cliente_id: clienteIdParaBanco,
                    p_pontos: dadosPagamento.detalhes.pontos_ganhos_estimados
                });
            }
            if (dadosPagamento.detalhes.pontos_usados > 0) {
                await supabase.rpc('decrementar_pontos', {
                    p_cliente_id: clienteIdParaBanco,
                    p_pontos: dadosPagamento.detalhes.pontos_usados
                });
            }
        }

        // --- GERAR PARCELAS ---
        if (dadosPagamento.forma_pagamento === 'crediario') {
            const numParcelas = dadosPagamento.detalhes.parcelas;
            const valorFinanciado = dadosPagamento.detalhes.valor_financiado;
            const valorParcela = valorFinanciado / numParcelas;
            let dataBase = new Date(dadosPagamento.detalhes.primeiro_vencimento || new Date());

            const parcelas = [];
            for (let i = 0; i < numParcelas; i++) {
                const dataP = new Date(dataBase);
                if (i > 0) dataP.setMonth(dataP.getMonth() + i);

                parcelas.push({
                    venda_id: venda.id,
                    cliente_id: clienteIdParaBanco,
                    numero_parcela: i + 1,
                    valor: valorParcela,
                    data_vencimento: dataP.toISOString(),
                    status: 'pendente'
                });
            }
            await supabase.from("parcelas").insert(parcelas);
        }

        // --- SUCESSO ---
        toast.success("Venda realizada com sucesso!");
        setUltimaVendaId(venda.id);
        setFormaPagamentoReal(dadosPagamento.forma_pagamento);
        
        // LIMPEZA GERAL (ESTADO + LOCALSTORAGE) - IMPORTANTE!
        setCarrinho([]);
        setClienteSelecionado(null);
        setBuscaCliente("");
        localStorage.removeItem('@nordic:pdv_backup'); // <--- LIMPA O BACKUP AQUI
        
        setIsPaymentOpen(false);
        setSucessoOpen(true);

    } catch (err: any) {
        console.error(err);
        toast.error(`Falha na venda: ${err.message}`);
    } finally {
        setLoadingVenda(false);
    }
  };

  const totalCarrinho = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
  const produtosFiltrados = produtosDb.filter(p => p.nome.toLowerCase().includes(buscaProduto.toLowerCase()));

  return (
    <>
    <style>{customStyles}</style>
    {/* CONTAINER PRINCIPAL */}
    <div className="flex flex-col md:flex-row h-[calc(100vh-80px)] gap-4 p-4 animate-in fade-in overflow-hidden">
      
      {/* LADO ESQUERDO: Catálogo */}
      <div className="flex-1 flex flex-col gap-4 min-w-0 h-full">
        {/* Busca */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              ref={inputBuscaRef}
              type="text" 
              placeholder="Buscar produto (F1)..." 
              value={buscaProduto}
              onChange={(e) => setBuscaProduto(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-gray-900"
              autoFocus
            />
          </div>
        </div>

        {/* Grid Produtos */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-y-auto p-4 custom-scrollbar">
          {loadingProdutos ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
              <Loader2 className="animate-spin" size={32} />
              <p>Carregando...</p>
            </div>
          ) : produtosFiltrados.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2 opacity-50">
              <LayoutGrid size={48} />
              <p>Nada encontrado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {produtosFiltrados.map((produto) => (
                <div
                  key={produto.id}
                  onClick={() => adicionarAoCarrinho(produto)}
                  className="p-3 border rounded-xl hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all group flex flex-col justify-between h-36 bg-white shadow-sm hover:shadow-md"
                >
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">COD: {produto.codigo_barras || produto.id.slice(0,4)}</span>
                      {(produto.estoque !== undefined) && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          produto.estoque > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {produto.estoque} un
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-800 text-sm leading-tight group-hover:text-blue-600 line-clamp-2" title={produto.nome}>
                      {produto.nome}
                    </h3>
                  </div>
                  <div className="flex justify-between items-end mt-1">
                    <span className="text-base font-bold text-gray-900">
                      {produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                    <button className="bg-gray-900 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity transform active:scale-90">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* LADO DIREITO: Carrinho */}
      <div className="w-full md:w-[380px] lg:w-[420px] bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col h-full overflow-hidden shrink-0">
        
        {/* Header Carrinho */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 space-y-3 shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
              <ShoppingCart size={20} className="text-blue-600" />
              Carrinho
            </h2>
            {/* Botão de Limpar Venda (NOVO) */}
            {carrinho.length > 0 && (
                <button onClick={limparVendaAtual} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1 transition-colors" title="Cancelar Venda">
                    <RefreshCcw size={12}/> Limpar
                </button>
            )}
          </div>
          
          {/* Seleção de Cliente */}
          <div className="relative">
            {clienteSelecionado ? (
              <div className="flex items-center justify-between bg-blue-100 border border-blue-200 p-2.5 rounded-lg animate-in slide-in-from-top-2">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="bg-blue-600 w-8 h-8 flex items-center justify-center rounded-full text-white shrink-0 font-bold text-xs">
                    {clienteSelecionado.nome.charAt(0)}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-bold text-blue-900 truncate">{clienteSelecionado.nome}</p>
                    <p className="text-[10px] text-blue-700 font-medium">Limite: R$ {(clienteSelecionado.limite_credito || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setClienteSelecionado(null); setBuscaCliente(""); }}
                  className="text-blue-500 hover:text-red-500 transition-colors p-1"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><User size={16} /></div>
                <input 
                  type="text"
                  placeholder="Identificar Cliente..."
                  value={buscaCliente}
                  onChange={(e) => setBuscaCliente(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                />
                {mostrarListaClientes && clientes.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl mt-1 z-50 max-h-48 overflow-y-auto custom-scrollbar">
                    {clientes.map(cliente => (
                      <button
                        key={cliente.id}
                        onClick={() => selecionarCliente(cliente)}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 flex justify-between items-center ${cliente.status === 'bloqueado' ? 'bg-red-50 hover:bg-red-100' : ''}`}
                      >
                        <div className="truncate pr-2">
                            <p className="font-medium text-gray-800 truncate">{cliente.nome}</p>
                            <p className="text-xs text-gray-500">{cliente.cpf}</p>
                        </div>
                        {cliente.status === 'bloqueado' && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold border border-red-200 shrink-0">BLOQUEADO</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Lista Itens (Scroll só aqui) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-gray-50/50">
          {carrinho.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-2 select-none">
              <ShoppingCart size={40} />
              <p className="text-sm font-medium">Carrinho vazio</p>
            </div>
          ) : (
            carrinho.map((item) => (
              <div key={item.id} className="flex justify-between items-center bg-white border border-gray-200 p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow group">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 line-clamp-1" title={item.nome}>{item.nome}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">
                    {item.quantidade} x {item.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="flex items-center gap-3 pl-2 shrink-0">
                  <span className="font-bold text-gray-900 text-sm">
                    {(item.preco * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <button onClick={() => removerDoCarrinho(item.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Totais */}
        <div className="p-5 bg-white border-t border-gray-200 shrink-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-end mb-4">
            <span className="text-gray-500 font-medium text-sm">Total a Pagar</span>
            <span className="text-3xl font-bold text-gray-900 tracking-tight">
              {totalCarrinho.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>

          <button 
            onClick={() => setIsPaymentOpen(true)}
            disabled={carrinho.length === 0}
            className="w-full py-3.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {loadingVenda ? <Loader2 className="animate-spin" size={20}/> : <CreditCard size={20} />}
            Finalizar Venda
          </button>
          {!clienteSelecionado && <p className="text-[10px] text-center text-gray-400 mt-2 font-medium">Venda sem cliente = Consumidor Final</p>}
        </div>
      </div>

      {/* MODAIS */}
      <PaymentFlowModal 
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onConfirm={processarVenda}
        total={totalCarrinho}
        cliente={clienteSelecionado}
        loading={loadingVenda}
      />

      <VendaSucessoModal 
        isOpen={sucessoOpen}
        onClose={() => setSucessoOpen(false)}
        vendaId={ultimaVendaId}
        formaPagamento={formaPagamentoReal}
      />

      <ConfirmModal 
        isOpen={modalBloqueioOpen}
        onClose={() => setModalBloqueioOpen(false)}
        onConfirm={() => setModalBloqueioOpen(false)}
        title="Cliente Bloqueado 🚫"
        description={`O cliente ${clienteBloqueadoTemp?.nome} possui restrições.`}
        confirmText="Entendi"
        variant="warning"
        showCancel={false}
      />
    </div>
    </>
  );
}