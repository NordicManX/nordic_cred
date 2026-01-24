export function generateEAN13(): string {
  // 1. Prefixo Brasil (789) + 9 dígitos aleatórios
  let code = "789";
  for (let i = 0; i < 9; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }

  // 2. Calcular Dígito Verificador (Algoritmo EAN-13)
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  
  const remainder = sum % 10;
  const checkDigit = remainder === 0 ? 0 : 10 - remainder;

  return code + checkDigit;
}