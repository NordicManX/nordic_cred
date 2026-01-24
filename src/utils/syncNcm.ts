import { createClient } from "@/src/lib/supabase";

export async function importarTabelaNCM() {
  const supabase = createClient();
  console.log("⬇️ Iniciando download da tabela NCM da BrasilAPI...");

  try {
    const response = await fetch("https://brasilapi.com.br/api/ncm/v1");
    if (!response.ok) throw new Error(`Erro na API: ${response.statusText}`);
    
    const ncmsExternos = await response.json();
    
    if (!Array.isArray(ncmsExternos)) {
        throw new Error("A API não retornou uma lista. Formato inválido.");
    }

    // --- DEBUG: Mostra o primeiro item para gente ver a cara dele ---
    if (ncmsExternos.length > 0) {
        console.log("🔍 Exemplo de item recebido:", ncmsExternos[0]);
    }
    // ---------------------------------------------------------------

    // CORREÇÃO: Usando 'codigo' e 'descricao' (português) em vez de 'code'/'description'
    const linhas = ncmsExternos
      .filter((item: any) => item.codigo && item.descricao) 
      .map((item: any) => ({
        codigo: item.codigo,     // A propriedade correta é 'codigo'
        descricao: item.descricao // A propriedade correta é 'descricao'
      }));

    const total = linhas.length;
    console.log(`📦 Encontrados ${total} NCMs válidos para importação.`);

    if (total === 0) {
        throw new Error("A lista de NCMs está vazia após o filtro. Verifique o console para ver o exemplo do item.");
    }

    const batchSize = 1000;
    
    for (let i = 0; i < linhas.length; i += batchSize) {
      const fim = Math.min(i + batchSize, linhas.length);
      const lote = linhas.slice(i, fim);
      
      const { error } = await supabase
        .from("ncms")
        .upsert(lote, { onConflict: "codigo" });

      if (error) {
        console.error(`❌ Erro no lote ${i}:`, error);
      } else {
         console.log(`✅ Processado: ${fim} / ${total} (${Math.round((fim/total)*100)}%)`);
      }
    }

    return { success: true, total };

  } catch (error) {
    console.error("❌ Erro fatal na importação:", error);
    return { success: false, error };
  }
}