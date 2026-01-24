export interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  telefone: string | null;
  status: 'ativo' | 'bloqueado';
  limite_credito: number;
  pontos_acumulados: number;
  // Vamos adicionar essa propriedade opcional para controle visual futuro
  possui_pendencia?: boolean; 
}

export interface Produto {
  id: string;
  nome: string;
  preco: number;
  imagem?: string; // Opcional
}

export interface ItemCarrinho extends Produto {
  quantidade: number;
}

export interface Parcela {
  id: string;
  venda_id: string;
  cliente_id: string;
  numero_parcela: number;
  data_vencimento: string;
  data_pagamento: string | null;
  valor: number;
  status: 'pendente' | 'pago' | 'atrasado';
  clientes?: { // O Supabase traz assim quando fazemos JOIN
    nome: string;
    cpf: string;
  }; 
}

export interface Despesa {
  id: string;
  descricao: string;
  categoria: 'fixa' | 'variavel' | 'fornecedor';
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: 'pendente' | 'pago';
}

export interface Produto {
  id: string;
  nome: string;
  preco: number;       // Preço de Venda
  estoque?: number;
  // Novos campos
  codigo_barras?: string;
  custo?: number;
  margem_lucro?: number;
  ncm?: string;
  unidade?: string;
  estoque_minimo?: number;
  tipo_produto?: 'revenda' | 'servico' | 'fabricacao';
}