"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/lib/supabase";
import { 
  Search, Plus, Package, Edit, Trash2, Loader2, Filter, AlertTriangle
} from "lucide-react";
import { ProdutoFormModal } from "@/src/components/ProdutoFormModal"; 
import { ConfirmModal } from "@/src/components/ConfirmModal";
import { Pagination } from "@/src/components/Pagination"; // <--- Import da Paginação
import { toast } from "sonner";

export default function ProdutosPage() {
  const supabase = createClient();
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  // Estados de Modais
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<any | null>(null);

  // Estado para Exclusão
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<any | null>(null);
  const [loadingExclusao, setLoadingExclusao] = useState(false);

  // --- CONFIGURAÇÃO DA PAGINAÇÃO ---
  const [pagina, setPagina] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const ITENS_POR_PAGINA = 10; // Mantemos 10 para aproveitar a rolagem

  useEffect(() => {
    fetchProdutos();
  }, [pagina, busca]); // Recarrega se mudar página ou busca

  async function fetchProdutos() {
    setLoading(true);

    const from = (pagina - 1) * ITENS_POR_PAGINA;
    const to = from + ITENS_POR_PAGINA - 1;

    let query = supabase
      .from("produtos")
      .select("*", { count: "exact" })
      .order("nome", { ascending: true })
      .range(from, to);

    if (busca) {
      // ATUALIZADO: Agora busca por Nome, NCM ou Código de Barras (EAN)
      // A sintaxe .or() do Supabase permite buscar em várias colunas ao mesmo tempo
      query = query.or(`nome.ilike.%${busca}%,ncm.ilike.%${busca}%,codigo_barras.ilike.%${busca}%`);
    }

    const { data, count, error } = await query;

    if (error) {
      toast.error("Erro ao carregar produtos.");
    } else {
      setProdutos(data || []);
      setTotalItems(count || 0);
    }
    setLoading(false);
  }

  // Reseta para a página 1 quando o usuário pesquisa
  const handleBusca = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusca(e.target.value);
    setPagina(1); 
  };

  // --- AÇÕES ---
  const handleNovoProduto = () => {
    setProdutoEditando(null);
    setIsFormOpen(true);
  };

  const handleEditar = (produto: any) => {
    setProdutoEditando(produto);
    setIsFormOpen(true);
  };

  const abrirModalExclusao = (produto: any) => {
    setProdutoParaExcluir(produto);
    setIsDeleteModalOpen(true);
  };

  const confirmarExclusao = async () => {
    if (!produtoParaExcluir) return;
    setLoadingExclusao(true);

    const { error } = await supabase
      .from("produtos")
      .delete()
      .eq("id", produtoParaExcluir.id);

    if (error) {
      toast.error("Erro ao excluir. O produto pode estar vinculado a vendas.");
    } else {
      toast.success("Produto excluído com sucesso!");
      // Se excluiu o último item da página, volta uma página
      if (produtos.length === 1 && pagina > 1) {
          setPagina(pagina - 1);
      } else {
          fetchProdutos();
      }
      setIsDeleteModalOpen(false);
      setProdutoParaExcluir(null);
    }
    setLoadingExclusao(false);
  };

  const totalPaginas = Math.ceil(totalItems / ITENS_POR_PAGINA);

  return (
    <div className="w-full space-y-6">

      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo de Produtos</h1>
          <p className="text-gray-500 text-sm">Gerencie seu estoque e preços.</p>
        </div>
        <button
          onClick={handleNovoProduto}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
        >
          <Plus size={20} />
          Novo Produto
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar produto por nome..."
            value={busca}
            onChange={handleBusca}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 whitespace-nowrap">
          <Filter size={18} /> Filtros
        </button>
      </div>

      {/* Tabela de Produtos */}
      <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Produto</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Preço</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Estoque</th>
                <th className="px-6 py-4 font-medium text-right whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600"/></td></tr>
              ) : produtos.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhum produto encontrado.</td></tr>
              ) : (
                produtos.map((prod) => (
                  <tr key={prod.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600 hidden sm:block">
                            <Package size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">{prod.nome}</p>
                            <p className="text-xs text-gray-400 uppercase">COD: {prod.id.slice(0,6)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-700">
                      {prod.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-6 py-4">
                       {prod.estoque <= 5 ? (
                           <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold border border-red-200">
                               <AlertTriangle size={12}/> {prod.estoque} un
                           </span>
                       ) : (
                           <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
                               {prod.estoque} un
                           </span>
                       )}
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleEditar(prod)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => abrirModalExclusao(prod)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação no Rodapé */}
        <div className="w-full">
            <Pagination
                currentPage={pagina}
                totalPages={totalPaginas}
                onPageChange={setPagina}
                totalItems={totalItems}
                itemsPerPage={ITENS_POR_PAGINA}
            />
        </div>
      </div>

      {/* --- MODAIS --- */}
      <ProdutoFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchProdutos}
        produtoParaEditar={produtoEditando}
      />

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmarExclusao}
        title="Excluir Produto"
        description={`Tem certeza que deseja excluir "${produtoParaExcluir?.nome}"? Essa ação não pode ser desfeita.`}
        confirmText="Sim, excluir"
        variant="danger"
        loading={loadingExclusao}
      />

    </div>
  );
}