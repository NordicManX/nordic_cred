"use server";

import { createClient } from "@supabase/supabase-js";

// Usamos a chave SERVICE ROLE para ter poder administrativo total
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function criarUsuarioSistema(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const nome = formData.get("nome") as string;
  const cargo = formData.get("cargo") as string;

  // 1. Cria o usuário no sistema de Auth do Supabase
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Já confirma o e-mail
    user_metadata: { nome, cargo }, // Passa meta dados para o gatilho
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// ... (mantenha os imports e a função criarUsuarioSistema existentes)

export async function atualizarUsuarioSistema(formData: FormData) {
  const id = formData.get("id") as string;
  const nome = formData.get("nome") as string;
  const cargo = formData.get("cargo") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // 1. Atualizar Auth (Email, Senha e Metadados)
  // Usamos 'any' para montar o objeto dinamicamente
  const updateData: any = {
    email: email,
    user_metadata: { nome, cargo },
    email_confirm: true // Força a confirmação do novo e-mail
  };

  // Só atualiza a senha se o usuário digitou algo
  if (password && password.trim().length > 0) {
    updateData.password = password;
  }

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, updateData);

  if (authError) {
    return { success: false, error: "Erro Auth: " + authError.message };
  }

  // 2. Atualizar Tabela Pública de Perfis (Sincronizar)
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ nome, cargo, email }) 
    .eq("id", id);

  if (profileError) {
    return { success: false, error: "Erro Perfil: " + profileError.message };
  }

  return { success: true };
}