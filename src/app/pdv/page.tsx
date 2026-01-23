"use client";

import { useState, useEffect } from "react";
import { Search, ShoppingCart, Trash2, User, CreditCard, Banknote } from "lucide-react";
import { toast } from "sonner";
import { Produto, ItemCarrinho, Cliente } from "@/src/types";
import { createClient } from "@/src/lib/supabase";
import { CheckoutModal } from "@/src/components/CheckoutModal";
import { VendaSucessoModal } from "@/src/components/VendaSucessoModal";
import { ConfirmAvistaModal } from "@/src/components/ConfirmAvistaModal"; // <--- IMPORT NOVO

const MOCK_PRODUTOS: Produto[] = [
  { id: "1", nome: "Notebook Gamer Acer", preco: 4500.00 },
  { id: "2", nome: "Mouse Logitech G", preco: 150.00 },
  { id: "3", nome: "Teclado Mecânico", preco: 350.00 },
  { id: "4", nome: "Monitor 24' IPS", preco: 890.00 },
  { id: "5", nome: "Headset Redragon", preco: 220.00 },
  { id: "6", nome: "Cadeira Ergonômica", preco: 1200.00 },
  { id: "7", nome: "Fone de Ouvido Bluetooth Lenovo", preco: 199.00 },
  { id: "8", nome: "Memoria RAM 16GB", preco: 232.00 },
  { id: "9", nome: "SSD 1TB Samsung", preco: 789.00 },
];

export default function PDVPage() {
  const supabase = createClient();
  
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [buscaProduto, setBuscaProduto] = useState("");
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [mostrarListaClientes, setMostrarListaClientes] = useState(false);
  
  // Controle de Modais
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isConfirmAvistaOpen, setIsConfirmAvistaOpen] = useState(false); // <--- ESTADO NOVO
  const [loadingAvista, setLoadingAvista] = useState(false); // <--- LOADING NOVO

  // Estado para o Modal de Sucesso
  const [sucessoOpen, setSucessoOpen] = useState(false);
  const [ultimaVendaId, setUltimaVendaId] = useState<string | null>(null);
  const [tipoUltimaVenda, setTipoUltimaVenda] = useState<'avista' | 'crediario'>('avista');

  // Cliente Consumidor Final (Cache)
  const [consumidorFinal, setConsumidorFinal] = useState<Cliente | null>(null);

  // Carregar Consumidor Final ao iniciar
  useEffect(() => {
    async function loadDefaults() {
      const { data } = await supabase
        .from("clientes")
        .select("*")
        .or('cpf.eq.000.000.000-00,nome.eq.Consumidor Final')
        .single();
      
      if (data) setConsumidorFinal(data);
    }
    loadDefaults();
  }, []);

  // Autocomplete de Clientes
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
  };

  const removerDoCarrinho = (id: string) => {
    setCarrinho((prev) => prev.filter((item) => item.id !== id));
  };

  // Funções de Limpeza e Sucesso
  const handleVendaConcluida = (vendaId: string, tipo: 'avista' | 'crediario') => {
    setCarrinho([]);
    setClienteSelecionado(null);
    setBuscaCliente("");
    setIsCheckoutOpen(false);
    setIsConfirmAvistaOpen(false); // Fecha o modal de confirmação
    
    // Abre o modal de sucesso
    setUltimaVendaId(vendaId);
    setTipoUltimaVenda(tipo);
    setSucessoOpen(true);
  };

  const totalCarrinho = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);

  const produtosFiltrados = MOCK_PRODUTOS.filter(p => 
    p.nome.toLowerCase().includes(buscaProduto.toLowerCase())
  );

  // --- PASSO 1: ABRIR MODAL DE CONFIRMAÇÃO ---
  const handleBotaoAvista = () => {
    if (!carrinho.length) {
      toast.error("Carrinho vazio.");
      return;
    }
    setIsConfirmAvistaOpen(true);
  };

  // --- PASSO 2: EXECUTAR A VENDA (Chamado pelo Modal) ---
  const executarVendaAvista = async () => {
    setLoadingAvista(true);

    // Se não tem cliente, usa o Consumidor Final
    let clienteParaVenda = clienteSelecionado;
    
    if (!clienteParaVenda) {
      if (consumidorFinal) {
        clienteParaVenda = consumidorFinal;
      } else {
        toast.error("Erro crítico: Cliente 'Consumidor Final' não encontrado.");
        setLoadingAvista(false);
        return;
      }
    }

    try {
      const pontosGanhos = Math.floor(totalCarrinho / 10);

      // 1. Venda Header
      const { data: vendaData, error: vendaError } = await supabase
        .from("vendas")
        .insert({
          cliente_id: clienteParaVenda.id,
          valor_total: totalCarrinho,
          forma_pagamento: "avista",
          pontos_gerados: pontosGanhos
        })
        .select()
        .single();

      if (vendaError) throw vendaError;
      const vendaId = vendaData.id;

      // 2. Itens
      const itensParaInserir = carrinho.map(item => ({
        venda_id: vendaId,
        produto_id: item.id,
        produto_nome: item.nome,
        quantidade: item.quantidade,
        valor_unitario: item.preco
      }));
      await supabase.from("itens_venda").insert(itensParaInserir);

      // 3. Financeiro (Parcela única paga)
      await supabase.from("parcelas").insert({
        venda_id: vendaId,
        cliente_id: clienteParaVenda.id,
        numero_parcela: 1,
        data_vencimento: new Date().toISOString(),
        data_pagamento: new Date().toISOString(),
        valor: totalCarrinho,
        status: "pago"
      });

      // 4. Pontos (Só atualiza se NÃO for consumidor final genérico, opcional)
      // Aqui atualizamos sempre, pois mesmo consumidor final pode ter pontos se configurado
      const novosPontos = (clienteParaVenda.pontos_acumulados || 0) + pontosGanhos;
      await supabase.from("clientes").update({ pontos_acumulados: novosPontos }).eq("id", clienteParaVenda.id);

      // SUCESSO!
      handleVendaConcluida(vendaId, 'avista');

    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar venda à vista.");
    } finally {
      setLoadingAvista(false);
    }
  };

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

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 pb-20">
          {produtosFiltrados.map((produto) => (
            <button
              key={produto.id}
              onClick={() => adicionarAoCarrinho(produto)}
              className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all text-left group flex flex-col justify-between h-40"
            >
              <div>
                <span className="text-xs font-bold text-gray-400 mb-1 block">COD: {produto.id}</span>
                <h3 className="font-semibold text-gray-800 leading-tight group-hover:text-blue-600 transition-colors">
                  {produto.nome}
                </h3>
              </div>
              <div className="mt-4">
                <span className="text-lg font-bold text-green-700">
                  {produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </button>
          ))}
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
                  onClick={() => {
                    setClienteSelecionado(null);
                    setBuscaCliente("");
                  }}
                  className="text-blue-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Cliente (Deixe vazio para Consumidor Final)"
                  value={buscaCliente}
                  onChange={(e) => setBuscaCliente(e.target.value)}
                  className="w-full pl-3 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                {mostrarListaClientes && clientes.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl mt-1 z-50 max-h-48 overflow-y-auto">
                    {clientes.map(cliente => (
                      <button
                        key={cliente.id}
                        onClick={() => {
                          setClienteSelecionado(cliente);
                          setMostrarListaClientes(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0"
                      >
                        <p className="font-medium text-gray-800">{cliente.nome}</p>
                        <p className="text-xs text-gray-500">CPF: {cliente.cpf}</p>
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
                  <p className="text-sm font-medium text-gray-800">{item.nome}</p>
                  <p className="text-xs text-gray-500">
                    {item.quantidade}x {item.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-700 text-sm">
                    {(item.preco * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <button 
                    onClick={() => removerDoCarrinho(item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
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

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleBotaoAvista} // <--- CHAMA O MODAL, NÃO A LÓGICA DIRETA
              disabled={carrinho.length === 0}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Banknote size={20} />
              À Vista
            </button>
            <button 
              disabled={!clienteSelecionado || carrinho.length === 0}
              onClick={() => setIsCheckoutOpen(true)}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
            >
              <CreditCard size={20} />
              Crediário
            </button>
          </div>
          {!clienteSelecionado && (
             <p className="text-xs text-center text-gray-400 mt-2">Venda s/ cliente será registrada como Consumidor Final.</p>
          )}
        </div>

      </div>

      {/* MODAL CHECKOUT (Crediário) */}
      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cliente={clienteSelecionado}
        carrinho={carrinho}
        total={totalCarrinho}
        onSuccess={(vendaId) => handleVendaConcluida(vendaId, 'crediario')}
      />

      {/* NOVO: MODAL CONFIRMAÇÃO À VISTA */}
      <ConfirmAvistaModal
        isOpen={isConfirmAvistaOpen}
        onClose={() => setIsConfirmAvistaOpen(false)}
        onConfirm={executarVendaAvista}
        total={totalCarrinho}
        clienteNome={clienteSelecionado?.nome || null}
        loading={loadingAvista}
      />

      {/* MODAL SUCESSO (Impressão) */}
      <VendaSucessoModal 
        isOpen={sucessoOpen}
        onClose={() => setSucessoOpen(false)}
        vendaId={ultimaVendaId}
        tipoVenda={tipoUltimaVenda}
      />
    </div>
  );
}