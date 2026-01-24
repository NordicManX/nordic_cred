"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/src/lib/supabase";
import { Search, Check, Loader2, AlertCircle } from "lucide-react";

interface NcmSelectProps {
  value: string;
  onChange: (codigo: string) => void;
}

export function NcmSelect({ value, onChange }: NcmSelectProps) {
  const supabase = createClient();
  const [query, setQuery] = useState(value || "");
  const [resultados, setResultados] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);
  
  // Ref para detectar clique fora
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      // Só busca se tiver 2 ou mais caracteres
      if (query.length < 2) {
        setResultados([]);
        return;
      }

      setLoading(true);
      
      // BUSCA HÍBRIDA: Procura no código OU na descrição ao mesmo tempo
      // .ilike é "insensitivo" (ignora maiúsculas/minúsculas)
      const { data, error } = await supabase
        .from("ncms")
        .select("*")
        .or(`codigo.ilike.%${query}%,descricao.ilike.%${query}%`)
        .limit(20); // Limite de 20 para ser rápido

      if (!error && data) {
        setResultados(data);
      } else {
        setResultados([]);
      }
      
      setLoading(false);
      setShowList(true);
    }, 500); // Espera 0.5s após parar de digitar para buscar

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // Se o valor externo mudar (ex: ao editar um produto), atualiza o input
  useEffect(() => {
    if (value && value !== query) {
        setQuery(value);
    }
  }, [value]);

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            // Se o usuário limpar, avisa o pai que limpou
            if (e.target.value === "") onChange("");
          }}
          onFocus={() => query.length >= 2 && setShowList(true)}
          placeholder="Digite código (ex: 8471) ou nome (ex: Teclado)"
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        </div>
      </div>

      {/* LISTA DE SUGESTÕES */}
      {showList && (
        <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto z-[9999]">
            {resultados.length > 0 ? (
                resultados.map((ncm) => (
                    <li 
                    key={ncm.codigo}
                    onClick={() => {
                        setQuery(ncm.codigo); // Mostra o código no input visual
                        onChange(ncm.codigo); // Envia o código para o formulário
                        setShowList(false);
                    }}
                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 text-sm group transition-colors"
                    >
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-blue-700 font-mono group-hover:text-blue-900">{ncm.codigo}</span>
                        {ncm.codigo === value && <Check size={14} className="text-green-600"/>}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-1 group-hover:text-gray-900">{ncm.descricao}</p>
                    </li>
                ))
            ) : (
                // Feedback quando não encontra nada
                !loading && query.length >= 2 && (
                    <li className="px-4 py-3 text-center text-gray-500 text-sm flex flex-col items-center gap-1">
                        <AlertCircle size={16} />
                        Nenhum NCM encontrado.
                    </li>
                )
            )}
        </ul>
      )}
    </div>
  );
}