"use client";

import { useState } from "react";
import { createClient } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Lock, Mail, User, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false); // Alterna entre Login e Cadastro
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState(""); // Novo campo para Cadastro
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // --- MODO CADASTRO ---
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nome: nome, // Manda o nome para salvar no perfil
              cargo: 'vendedor' // Padrão de segurança: todo mundo começa baixo
            }
          }
        });

        if (error) throw error;
        
        toast.success("Conta criada! Verifique seu e-mail ou entre agora.");
        setIsSignUp(false); // Volta para o login
      } else {
        // --- MODO LOGIN ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast.success("Bem-vindo ao NordicCred!");
        router.push("/");
        router.refresh();
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro na autenticação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 animate-in fade-in zoom-in-95 duration-300">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tighter">
            Nordic<span className="text-blue-600">Cred</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            {isSignUp ? "Crie sua conta para começar" : "Gestão Inteligente de Crediário"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* Campo Nome (Só aparece no cadastro) */}
          {isSignUp && (
            <div className="animate-in slide-in-from-top-2 fade-in duration-300">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  required={isSignUp}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Seu nome"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : isSignUp ? (
              <>Criar Conta <ArrowRight size={18} /></>
            ) : (
              "Entrar no Sistema"
            )}
          </button>
        </form>

        {/* Botão de Alternância */}
        <div className="mt-6 text-center pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            {isSignUp ? "Já tem uma conta?" : "Ainda não tem acesso?"}
          </p>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-600 font-bold text-sm hover:underline mt-1 transition-colors"
          >
            {isSignUp ? "Fazer Login" : "Criar nova conta"}
          </button>
        </div>

      </div>
    </div>
  );
}