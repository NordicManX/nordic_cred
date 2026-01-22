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