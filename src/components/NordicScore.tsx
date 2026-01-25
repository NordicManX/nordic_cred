import { Gauge, TrendingUp, AlertTriangle, ShieldCheck } from "lucide-react";

interface NordicScoreProps {
  score: number;
  compact?: boolean; // Para usar no PDV versão mini
}

export function NordicScore({ score, compact = false }: NordicScoreProps) {
  // Define cor e status baseado no score
  let cor = "text-red-600";
  let bg = "bg-red-100";
  let texto = "Risco Alto";
  let Icone = AlertTriangle;
  let larguraBarra = `${(score / 1000) * 100}%`;

  if (score >= 800) {
    cor = "text-green-600";
    bg = "bg-green-100";
    texto = "Excelente";
    Icone = ShieldCheck;
  } else if (score >= 500) {
    cor = "text-blue-600";
    bg = "bg-blue-100";
    texto = "Bom";
    Icone = TrendingUp;
  } else if (score >= 300) {
    cor = "text-yellow-600";
    bg = "bg-yellow-100";
    texto = "Regular";
    Icone = Gauge;
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-2 py-1 rounded-lg border ${bg} border-opacity-50`}>
        <Icone size={14} className={cor} />
        <span className={`text-xs font-bold ${cor}`}>{score} • {texto}</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-1">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nordic Score</span>
        <span className={`text-lg font-bold ${cor}`}>{score}</span>
      </div>
      
      {/* Barra de Progresso Customizada */}
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ease-out ${score >= 800 ? 'bg-green-500' : score >= 500 ? 'bg-blue-500' : score >= 300 ? 'bg-yellow-500' : 'bg-red-500'}`} 
          style={{ width: larguraBarra }}
        />
      </div>
      
      <p className={`text-[10px] mt-1 text-right font-medium ${cor}`}>
        {texto === "Excelente" ? "Crédito Liberado" : texto === "Risco Alto" ? "Venda à Vista" : "Analise o histórico"}
      </p>
    </div>
  );
}