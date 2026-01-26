"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/lib/supabase";
import { criarUsuarioSistema, atualizarUsuarioSistema } from "@/src/actions/auth-admin"; // <--- Import novo
import { 
  UserPlus, Shield, Trash2, Loader2, CheckCircle, 
  XCircle, Edit, Ban, Lock, Unlock, X 
} from "lucide-react";
import { toast } from "sonner";

export default function GestaoUsuariosPage() {
  const supabase = createClient();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [meuPerfil, setMeuPerfil] = useState<any>(null);

  // Estado para edição (agora com campo password opcional)
  const [editingUser, setEditingUser] = useState<any>(null);
  const [novaSenha, setNovaSenha] = useState(""); // Estado separado para a senha na edição

  useEffect(() => {
    fetchUsuarios();
  }, []);

  async function fetchUsuarios() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        const { data: perfil } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setMeuPerfil(perfil);
    }

    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsuarios(data || []);
    setLoading(false);
  }

  // --- CRIAR NOVO USUÁRIO ---
  async function handleCriarUsuario(formData: FormData) {
    setFormLoading(true);
    const resultado = await criarUsuarioSistema(formData);

    if (resultado.success) {
      toast.success("Usuário criado com sucesso!");
      fetchUsuarios(); 
      (document.getElementById("form-usuario") as HTMLFormElement).reset();
    } else {
      toast.error(`Erro: ${resultado.error}`);
    }
    setFormLoading(false);
  }

  // --- ATUALIZAR USUÁRIO COMPLETO (SERVER ACTION) ---
  async function handleUpdateUsuario(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setFormLoading(true);

    // Monta o FormData manualmente para enviar para a Server Action
    const formData = new FormData();
    formData.append("id", editingUser.id);
    formData.append("nome", editingUser.nome);
    formData.append("email", editingUser.email);
    formData.append("cargo", editingUser.cargo);
    
    // Só envia senha se tiver sido digitada
    if (novaSenha) {
        formData.append("password", novaSenha);
    }

    const resultado = await atualizarUsuarioSistema(formData);

    if (resultado.success) {
        toast.success("Perfil atualizado com sucesso!");
        setEditingUser(null);
        setNovaSenha(""); // Limpa senha
        fetchUsuarios();
    } else {
        toast.error(`Erro: ${resultado.error}`);
    }
    setFormLoading(false);
  }

  // --- BLOQUEAR/DESBLOQUEAR ---
  async function toggleStatus(id: string, currentStatus: boolean) {
    if (meuPerfil?.id === id) {
        toast.error("Você não pode bloquear a si mesmo.");
        return;
    }

    const novoStatus = !currentStatus;
    const { error } = await supabase
        .from('profiles')
        .update({ ativo: novoStatus })
        .eq('id', id);

    if (error) {
        toast.error("Erro ao alterar status.");
    } else {
        toast.success(novoStatus ? "Usuário desbloqueado!" : "Usuário bloqueado!");
        fetchUsuarios();
    }
  }

  if (!loading && meuPerfil?.cargo !== 'superadmin') {
    return (
        <div className="flex h-[80vh] items-center justify-center text-gray-500 flex-col gap-2">
            <Shield size={48} className="text-red-500" />
            <h2 className="text-xl font-bold">Acesso Restrito</h2>
            <p>Apenas Superadmins podem gerenciar usuários.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestão de Equipe</h1>
        <p className="text-gray-500 text-sm">Crie usuários e defina níveis de acesso.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Formulário Cadastro */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <UserPlus size={20} className="text-blue-600" /> Novo Usuário
          </h3>
          
          <form id="form-usuario" action={handleCriarUsuario} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <input name="nome" type="text" required className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: João Silva" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input name="email" type="email" required className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="joao@nordic.com" />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha Inicial</label>
                    <input name="password" type="text" required className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="123456" minLength={6} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                    <select name="cargo" className="w-full p-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="vendedor">Vendedor</option>
                        <option value="gerente">Gerente</option>
                        <option value="superadmin">Superadmin</option>
                    </select>
                </div>
            </div>

            <button type="submit" disabled={formLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 mt-2 transition-colors">
                {formLoading ? <Loader2 className="animate-spin" /> : "Cadastrar Usuário"}
            </button>
          </form>
        </div>

        {/* Lista de Usuários */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-700">Membros da Equipe</h3>
                <span className="text-xs text-gray-400">{usuarios.length} usuários</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="text-gray-500 border-b bg-gray-50/50">
                        <tr>
                            <th className="px-6 py-3 font-medium">Nome</th>
                            <th className="px-6 py-3 font-medium">Cargo</th>
                            <th className="px-6 py-3 font-medium">Status</th>
                            <th className="px-6 py-3 text-right font-medium">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={4} className="p-6 text-center text-gray-400"><Loader2 className="animate-spin mx-auto"/></td></tr>
                        ) : usuarios.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-3">
                                    <p className={`font-bold ${!user.ativo ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{user.nome}</p>
                                    <p className="text-xs text-gray-500">{user.email}</p>
                                </td>
                                <td className="px-6 py-3">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${
                                        user.cargo === 'superadmin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                        user.cargo === 'gerente' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                        'bg-gray-50 text-gray-600 border-gray-200'
                                    }`}>
                                        {user.cargo}
                                    </span>
                                </td>
                                <td className="px-6 py-3">
                                    {user.ativo ? (
                                        <span className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-full w-fit"><CheckCircle size={12}/> Ativo</span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded-full w-fit"><XCircle size={12}/> Bloqueado</span>
                                    )}
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button 
                                            onClick={() => { setEditingUser(user); setNovaSenha(""); }}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                                            title="Editar"
                                        >
                                            <Edit size={16}/>
                                        </button>
                                        <button 
                                            onClick={() => toggleStatus(user.id, user.ativo)}
                                            className={`p-1.5 rounded-lg transition-colors ${
                                                user.ativo ? "text-gray-400 hover:text-red-600 hover:bg-red-50" : "text-red-500 bg-red-50 hover:bg-green-100 hover:text-green-600"
                                            }`}
                                            title={user.ativo ? "Bloquear" : "Desbloquear"}
                                        >
                                            {user.ativo ? <Lock size={16}/> : <Unlock size={16}/>}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* --- MODAL DE EDIÇÃO COMPLETA --- */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200">
                <button onClick={() => setEditingUser(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
                
                <h2 className="text-xl font-bold text-gray-900 mb-1">Editar Usuário</h2>
                <p className="text-sm text-gray-500 mb-6">Atualize os dados de acesso de {editingUser.nome}</p>

                <form onSubmit={handleUpdateUsuario} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                        <input 
                            type="text" required 
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={editingUser.nome}
                            onChange={(e) => setEditingUser({...editingUser, nome: e.target.value})}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">E-mail de Acesso</label>
                        <input 
                            type="email" required 
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={editingUser.email}
                            onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nova Senha <span className="text-gray-400 font-normal">(Opcional)</span>
                        </label>
                        <input 
                            type="text" 
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                            placeholder="Deixe em branco para manter a atual"
                            minLength={6}
                            value={novaSenha}
                            onChange={(e) => setNovaSenha(e.target.value)}
                        />
                        <p className="text-[10px] text-gray-500 mt-1">Preencha apenas se quiser redefinir a senha do usuário.</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                        <select 
                            className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            value={editingUser.cargo}
                            onChange={(e) => setEditingUser({...editingUser, cargo: e.target.value})}
                        >
                            <option value="vendedor">Vendedor</option>
                            <option value="gerente">Gerente</option>
                            <option value="superadmin">Superadmin</option>
                        </select>
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors">Cancelar</button>
                        <button type="submit" disabled={formLoading} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors">
                            {formLoading ? <Loader2 className="animate-spin" size={18} /> : "Salvar Alterações"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}