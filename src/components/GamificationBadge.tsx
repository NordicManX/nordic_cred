import { Trophy, Medal, Crown } from "lucide-react";

interface GamificationBadgeProps {
  pontos: number;
}

export function GamificationBadge({ pontos }: GamificationBadgeProps) {
  // LÓGICA DOS NÍVEIS
  let nivel = "Iniciante";
  let corBg = "bg-gray-100";
  let corTexto = "text-gray-600";
  let Icone = Medal;

  if (pontos >= 5000) {
    nivel = "Lendário";
    corBg = "bg-purple-100 border-purple-200";
    corTexto = "text-purple-700";
    Icone = Crown;
  } else if (pontos >= 2000) {
    nivel = "Ouro";
    corBg = "bg-yellow-100 border-yellow-200";
    corTexto = "text-yellow-700";
    Icone = Trophy;
  } else if (pontos >= 500) {
    nivel = "Prata";
    corBg = "bg-slate-200 border-slate-300";
    corTexto = "text-slate-700";
    Icone = Medal;
  } else if (pontos > 0) {
    nivel = "Bronze";
    corBg = "bg-orange-100 border-orange-200";
    corTexto = "text-orange-700";
    Icone = Medal;
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${corBg} ${corTexto} w-fit`}>
      <Icone size={14} className="shrink-0" />
      <div className="flex flex-col leading-none">
        <span className="text-[10px] uppercase font-bold opacity-70">Nível</span>
        <span className="text-xs font-bold">{nivel}</span>
      </div>
      <div className="w-[1px] h-4 bg-current opacity-20 mx-1"></div>
      <span className="text-xs font-bold">{pontos} pts</span>
    </div>
  );
}