"use client";

import { useState, useEffect } from "react";
import { Search, ShoppingCart, Trash2, User, Loader2, Package, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Produto, ItemCarrinho, Cliente } from "@/src/types";
import { createClient } from "@/src/lib/supabase";
import { VendaSucessoModal } from "@/src/components/VendaSucessoModal";
import { ConfirmModal } from "@/src/components/ConfirmModal"; 
import { PaymentFlowModal } from "@/src/components/PaymentFlowModal"; 

export default function PDVPage() {
  const supabase = createClient();
  
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
  
  // CORREÇÃO: Agora guardamos o ID e a FORMA REAL (ex: 'pix', 'dinheiro')
  const [ultimaVendaId, setUltimaVendaId] = useState<string | null>(null);
  const [formaPagamentoReal, setFormaPagamentoReal] = useState<string>(""); 

  // Cliente Padrão (Cache)
  const [consumidorFinal, setConsumidorFinal] = useState<Cliente | null>(null);

  // 1. Carregar Consumidor Final e Produtos
  useEffect(() => {
    async function loadInitialData() {
      const { data: clienteData } = await supabase
        .from("clientes")
        .select("*")
        .or('cpf.eq.000.000.000-00,nome.eq.Consumidor Final')
        .single();
      
      if (clienteData) setConsumidorFinal(clienteData);

      const { data: produtosData } = await supabase
        .from("produtos")
        .select("*")
        .order("nome");
      
      setProdutosDb(produtosData || []);
      setLoadingProdutos(false);
    }
    loadInitialData();
  }, []);

  // 2. Busca de Clientes
  useEffect(() => {
    async function searchClientes() {
      if (buscaCliente.length < 2) {
        setClientes([]);
        return;
      }
      const { data } = await supabase
        .from("clientes")
        .select("*")
        .ilike("nome", `%${buscaCliente}%`)
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
  };

  const removerDoCarrinho = (id: string) => {
    setCarrinho((prev) => prev.filter((item) => item.id !== id));
  };

  // --- PROCESSAMENTO DA VENDA ---
  const processarVenda = async (dadosPagamento: any) => {
    setLoadingVenda(true);
    const clienteFinal = clienteSelecionado || consumidorFinal;

    if (!clienteFinal) {
        toast.error("Erro: Cliente não identificado.");
        setLoadingVenda(false);
        return;
    }

    try {
        const pontosGanhos = dadosPagamento.forma_pagamento !== 'crediario' ? Math.floor(totalCarrinho / 10) : 0;

        // 1. Criar Venda
        const { data: venda, error: errVenda } = await supabase.from("vendas").insert({
            cliente_id: clienteFinal.id,
            valor_total: totalCarrinho,
            forma_pagamento: dadosPagamento.forma_pagamento, 
            pontos_gerados: pontosGanhos
        }).select().single();

        if (errVenda) throw errVenda;

        // 2. Inserir Itens
        const itens = carrinho.map(item => ({
            venda_id: venda.id,
            produto_id: item.id,
            produto_nome: item.nome, 
            quantidade: item.quantidade,
            valor_unitario: item.preco
        }));
        
        const { error: errItens } = await supabase.from("itens_venda").insert(itens);
        
        if (errItens) {
            await supabase.from("vendas").delete().eq("id", venda.id);
            throw new Error(`Erro ao salvar itens: ${errItens.message}`);
        }

        // 3. Gerar Parcelas
        const parcelas = [];
        const numParcelas = dadosPagamento.detalhes.parcelas;
        const valorParcela = totalCarrinho / numParcelas;

        for (let i = 1; i <= numParcelas; i++) {
            let vencimento = new Date();
            let status = 'pago'; 
            let dataPagamento = new Date().toISOString();

            if (dadosPagamento.forma_pagamento === 'crediario') {
                status = 'pendente';
                dataPagamento = null as any;
                
                if (dadosPagamento.detalhes.primeiro_vencimento) {
                    const dataBase = new Date(dadosPagamento.detalhes.primeiro_vencimento);
                    vencimento = new Date(dataBase); 
                    vencimento.setMonth(vencimento.getMonth() + (i - 1));
                } else {
                    vencimento.setDate(vencimento.getDate() + (i * 30));
                }
            }

            parcelas.push({
                venda_id: venda.id,
                cliente_id: clienteFinal.id,
                numero_parcela: i,
                valor: valorParcela,
                data_vencimento: vencimento.toISOString(),
                data_pagamento: dataPagamento,
                status: status
            });
        }
        
        const { error: errParcelas } = await supabase.from("parcelas").insert(parcelas);
        if (errParcelas) throw errParcelas;

        // 4. Pontos
        if (pontosGanhos > 0) {
            const novosPontos = (clienteFinal.pontos_acumulados || 0) + pontosGanhos;
            await supabase.from("clientes").update({ pontos_acumulados: novosPontos }).eq("id", clienteFinal.id);
        }

        // 5. Atualizar Estado para o Modal
        setUltimaVendaId(venda.id);
        // AQUI ESTAVA O PROBLEMA: Antes salvava apenas 'avista' ou 'crediario'.
        // Agora salvamos o dado exato (ex: 'pix', 'dinheiro')
        setFormaPagamentoReal(dadosPagamento.forma_pagamento);
        
        setCarrinho([]);
        setClienteSelecionado(null);
        setBuscaCliente("");
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
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-4rem)] gap-6 pb-20 lg:pb-0">
      
      {/* LADO ESQUERDO: Catálogo */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar produto (F1)..." 
              value={buscaProduto}
              onChange={(e) => setBuscaProduto(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-gray-900"
              autoFocus
            />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 pb-20 content-start">
          {loadingProdutos ? (
            <div className="col-span-full py-12 flex flex-col items-center text-gray-400 gap-2">
              <Loader2 className="animate-spin" size={32} />
              <p>Carregando catálogo...</p>
            </div>
          ) : produtosFiltrados.length === 0 ? (
            <div className="col-span-full py-12 flex flex-col items-center text-gray-400 gap-2">
              <Package size={48} className="opacity-20" />
              <p>Nenhum produto encontrado.</p>
            </div>
          ) : (
            produtosFiltrados.map((produto) => (
              <button
                key={produto.id}
                onClick={() => adicionarAoCarrinho(produto)}
                className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all text-left group flex flex-col justify-between h-40"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">COD: {produto.id.slice(0,4)}</span>
                    {(produto.estoque !== undefined) && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        produto.estoque > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {produto.estoque} un
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-800 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                    {produto.nome}
                  </h3>
                </div>
                <div className="mt-2">
                  <span className="text-lg font-bold text-green-700">
                    {produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* LADO DIREITO: Carrinho */}
      <div className="w-full md:w-[400px] bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col h-full overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 space-y-3">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <ShoppingCart size={20} className="text-blue-600" />
            Carrinho
          </h2>
          <div className="relative">
            {clienteSelecionado ? (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-200 p-2 rounded-full text-blue-700">
                    <User size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-900">{clienteSelecionado.nome}</p>
                    <p className="text-xs text-blue-600">Limite: R$ {clienteSelecionado.limite_credito}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setClienteSelecionado(null); setBuscaCliente(""); }}
                  className="text-blue-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Cliente (Vazio = Consumidor Final)"
                  value={buscaCliente}
                  onChange={(e) => setBuscaCliente(e.target.value)}
                  className="w-full pl-3 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                {mostrarListaClientes && clientes.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl mt-1 z-50 max-h-48 overflow-y-auto">
                    {clientes.map(cliente => (
                      <button
                        key={cliente.id}
                        onClick={() => selecionarCliente(cliente)}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 flex justify-between items-center ${cliente.status === 'bloqueado' ? 'bg-red-50 hover:bg-red-100' : ''}`}
                      >
                        <div>
                            <p className="font-medium text-gray-800">{cliente.nome}</p>
                            <p className="text-xs text-gray-500">CPF: {cliente.cpf}</p>
                        </div>
                        {cliente.status === 'bloqueado' && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold border border-red-200">BLOQUEADO</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {carrinho.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 opacity-50">
              <ShoppingCart size={48} />
              <p>Carrinho vazio</p>
            </div>
          ) : (
            carrinho.map((item) => (
              <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.nome}</p>
                  <p className="text-xs text-gray-500">
                    {item.quantidade}x {item.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-700 text-sm">
                    {(item.preco * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <button onClick={() => removerDoCarrinho(item.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between items-end mb-4">
            <span className="text-gray-500 font-medium">Total a Pagar</span>
            <span className="text-3xl font-bold text-gray-900">
              {totalCarrinho.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>

          <button 
            onClick={() => setIsPaymentOpen(true)}
            disabled={carrinho.length === 0}
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
          >
            {loadingVenda ? <Loader2 className="animate-spin" /> : <CheckCircle size={24} />}
            Finalizar Venda
          </button>
          {!clienteSelecionado && <p className="text-xs text-center text-gray-400 mt-2">Venda s/ cliente será registrada como Consumidor Final.</p>}
        </div>
      </div>

      <PaymentFlowModal 
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onConfirm={processarVenda}
        total={totalCarrinho}
        cliente={clienteSelecionado}
        loading={loadingVenda}
      />

      {/* CORREÇÃO: Passamos formaPagamentoReal para o modal */}
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
        description={`O cliente ${clienteBloqueadoTemp?.nome} possui restrições no cadastro.`}
        confirmText="Entendi"
        variant="warning"
        showCancel={false}
      />
    </div>
  );
}