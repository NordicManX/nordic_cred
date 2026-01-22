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

// ... (outros tipos)

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