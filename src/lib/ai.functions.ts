import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Provider = "gemini" | "openai" | "anthropic";

async function assertAdmin(context: any) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Acesso negado: apenas administradores.");
}

function mask(key: string | null | undefined) {
  if (!key) return null;
  const last = key.slice(-4);
  return `••••••••${last}`;
}

async function loadKeys() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("ai_settings").select("*").eq("id", 1).maybeSingle();
  return (data ?? { default_provider: "gemini" }) as any;
}

// Faz uma chamada de chat para o provedor selecionado. Retorna o texto de resposta.
async function callProvider(
  provider: Provider,
  key: string,
  system: string,
  messages: { role: string; content: string }[],
): Promise<string> {
  if (provider === "gemini") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini: ${res.status} ${(await res.text()).slice(0, 1000)}`);
    const json = await res.json();
    return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "(sem resposta)";
  }

  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI: ${res.status} ${(await res.text()).slice(0, 1000)}`);
    const json = await res.json();
    return json?.choices?.[0]?.message?.content ?? "(sem resposta)";
  }

  // anthropic
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system,
      messages: messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    }),
  });
  if (!res.ok) throw new Error(`Claude: ${res.status} ${(await res.text()).slice(0, 1000)}`);
  const json = await res.json();
  return json?.content?.[0]?.text ?? "(sem resposta)";
}

export const getAiSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const s = await loadKeys();
    return {
      default_provider: s.default_provider ?? "gemini",
      gemini: mask(s.gemini_key),
      openai: mask(s.openai_key),
      anthropic: mask(s.anthropic_key),
      notion: mask(s.notion_token),
    };
  });

export const saveAiSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { default_provider: Provider; gemini?: string; openai?: string; anthropic?: string; notion?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: any = { default_provider: data.default_provider, updated_at: new Date().toISOString() };
    // Só sobrescreve a chave quando um novo valor não-mascarado é enviado.
    if (data.gemini && !data.gemini.includes("•")) patch.gemini_key = data.gemini.trim();
    if (data.openai && !data.openai.includes("•")) patch.openai_key = data.openai.trim();
    if (data.anthropic && !data.anthropic.includes("•")) patch.anthropic_key = data.anthropic.trim();
    if (data.notion && !data.notion.includes("•")) patch.notion_token = data.notion.trim();
    const { error } = await supabaseAdmin.from("ai_settings").update(patch).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testAiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provider: Provider }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const s = await loadKeys();
    const key = data.provider === "gemini" ? s.gemini_key : data.provider === "openai" ? s.openai_key : s.anthropic_key;
    if (!key) return { ok: false, message: "Nenhuma chave salva para este provedor." };
    try {
      await callProvider(data.provider, key, "Você é um assistente de teste.", [
        { role: "user", content: "Responda apenas: ok" },
      ]);
      return { ok: true, message: "Conectado" };
    } catch (err: any) {
      return { ok: false, message: err?.message ? String(err.message) : String(err) };
    }
  });

export const askClientAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clientId: string; messages: { role: string; content: string }[]; provider?: Provider }) => d)
  .handler(async ({ data, context }) => {
    const s = await loadKeys();
    const provider: Provider = data.provider ?? (s.default_provider as Provider) ?? "gemini";
    const key = provider === "gemini" ? s.gemini_key : provider === "openai" ? s.openai_key : s.anthropic_key;
    if (!key) throw new Error("Nenhuma chave de API configurada para o provedor selecionado. Configure em Configurações → Integrações de IA.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: client }, { data: knowledge }] = await Promise.all([
      supabaseAdmin.from("clients").select("*").eq("id", data.clientId).maybeSingle(),
      supabaseAdmin
        .from("client_knowledge")
        .select("data_registro, resumo, tags")
        .eq("client_id", data.clientId)
        .order("data_registro", { ascending: false })
        .limit(50),
    ]);

    const c: any = client ?? {};
    const kn = (knowledge ?? []) as any[];
    const contexto = [
      `# Dados do cliente`,
      `Nome / Razão social: ${c.razao_social ?? "—"}`,
      `Documento: ${c.documento ?? "—"}`,
      `Nicho: ${c.nicho ?? "—"} | Porte: ${c.porte ?? "—"} | Tipo: ${c.tipo ?? "—"}`,
      `Contato: ${c.contato_responsavel ?? "—"} | ${c.email ?? "—"} | ${c.telefone ?? "—"}`,
      `Pacote atual: ${c.pacote_atual ?? "—"}`,
      c.observacoes_internas ? `\n# Observações internas\n${c.observacoes_internas}` : "",
      c.ai_notes ? `\n# Notas de contexto para IA\n${c.ai_notes}` : "",
      kn.length
        ? `\n# Base de Dados (histórico de reuniões e contatos)\n${kn
            .map((k) => `- [${k.data_registro}] ${k.resumo}${k.tags?.length ? ` (tags: ${k.tags.join(", ")})` : ""}`)
            .join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const system = `Você é a assistente de IA da agência Rhema Estratégia para o cliente "${c.razao_social ?? ""}".
Responda em português do Brasil, de forma prática e objetiva, usando exclusivamente o contexto abaixo sobre o cliente.
Se algo não estiver no contexto, diga que ainda não há esse dado registrado.

${contexto}`;

    const text = await callProvider(provider, key, system, data.messages);
    return { text, provider };
  });
