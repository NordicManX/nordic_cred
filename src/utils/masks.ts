// src/utils/masks.ts

export const maskCPF = (value: string) => {
  return value
    .replace(/\D/g, "") // Remove tudo que não é dígito
    .replace(/(\d{3})(\d)/, "$1.$2") // Coloca ponto após o 3º dígito
    .replace(/(\d{3})(\d)/, "$1.$2") // Coloca ponto após o 6º dígito
    .replace(/(\d{3})(\d{1,2})/, "$1-$2") // Coloca traço antes dos últimos 2
    .replace(/(-\d{2})\d+?$/, "$1"); // Impede digitar mais que o necessário
};

export const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2") // DDD
    .replace(/(\d{1})(\d{4})(\d{4})/, "$1 $2-$3") // 9 + 4 dígitos + 4 dígitos
    .replace(/(-\d{4})\d+?$/, "$1");
};

export const maskRG = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1})/, "$1-$2")
    .replace(/(-\d{1})\d+?$/, "$1"); // RG padrão SSP
};

export const maskMoney = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d)(\d{2})$/, "$1,$2") // Coloca virgula antes dos ultimos 2 digitos
    .replace(/(?=(\d{3})+(\D))\B/g, "."); // Coloca ponto nos milhares
};

// Função auxiliar para limpar a máscara antes de salvar no banco (Opcional, mas recomendado)
export const unmask = (value: string) => {
  return value.replace(/\D/g, "");
};