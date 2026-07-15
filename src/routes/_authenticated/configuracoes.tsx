import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createUser, setUserRole, deleteUser, listUsers, setUserModules } from "@/lib/users.functions";
import { getAiSettings, saveAiSettings, testAiKey } from "@/lib/ai.functions";
import { MODULES, defaultModulesForRoles, type ModuleKey } from "@/lib/modules";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LogoUpload } from "@/components/logo-upload";
import { Plus, Trash2, Save, SlidersHorizontal, Bot, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: Configuracoes,
});

const ROLES = ["admin", "comercial", "atendimento", "financeiro"] as const;

function Configuracoes() {
  return (
    <div>
      <PageHeader title="Configurações" description="Administração da plataforma" />
      <Tabs defaultValue="usuarios">
        <TabsList className="flex-wrap">
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="ia">Integrações de IA</TabsTrigger>
          <TabsTrigger value="funil">Funil CRM</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="listas">Listas</TabsTrigger>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
        </TabsList>
        <TabsContent value="usuarios"><UsuariosTab /></TabsContent>
        <TabsContent value="ia"><IaTab /></TabsContent>
        <TabsContent value="funil"><FunilTab /></TabsContent>
        <TabsContent value="categorias"><CategoriasTab /></TabsContent>
        <TabsContent value="listas"><ListasTab /></TabsContent>
        <TabsContent value="empresa"><EmpresaTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function UsuariosTab() {
  const qc = useQueryClient();
  const fnCreate = useServerFn(createUser);
  const fnRole = useServerFn(setUserRole);
  const fnDelete = useServerFn(deleteUser);
  const fnList = useServerFn(listUsers);
  const [f, setF] = useState({ nome: "", email: "", password: "", role: "atendimento" as (typeof ROLES)[number] });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => fnList(),
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fnCreate({ data: f });
      toast.success("Usuário criado");
      setF({ nome: "", email: "", password: "", role: "atendimento" });
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  }
  async function changeRole(userId: string, role: string) {
    try {
      await fnRole({ data: { userId, role: role as any } });
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  }
  async function remove(userId: string) {
    try {
      await fnDelete({ data: { userId } });
      toast.success("Usuário removido");
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <Card className="p-6">
        <h3 className="mb-3 font-semibold">Adicionar usuário</h3>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-5">
          <Input placeholder="Nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} required />
          <Input type="email" placeholder="E-mail" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
          <Input type="password" placeholder="Senha" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={6} />
          <Select value={f.role} onValueChange={(v) => setF({ ...f, role: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
          </Select>
          <Button type="submit"><Plus className="mr-1 h-4 w-4" /> Criar</Button>
        </form>
      </Card>

      <Card className="p-2">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Perfil</TableHead><TableHead>Acesso</TableHead><TableHead></TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u: any) => (
              <TableRow key={u.user_id}>
                <TableCell className="font-medium">{u.nome}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Select value={u.role} onValueChange={(v) => changeRole(u.user_id, v)}>
                    <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <ModulesDialog user={u} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => remove(u.user_id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function ModulesDialog({ user }: { user: any }) {
  const qc = useQueryClient();
  const fnSet = useServerFn(setUserModules);
  const [open, setOpen] = useState(false);
  const roleDefault = defaultModulesForRoles([user.role]);
  const custom: ModuleKey[] | null = Array.isArray(user.modulos) ? user.modulos : null;
  const [checked, setChecked] = useState<ModuleKey[]>(custom ?? roleDefault);

  useEffect(() => {
    if (open) setChecked(custom ?? roleDefault);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggle(key: ModuleKey) {
    setChecked((c) => (c.includes(key) ? c.filter((k) => k !== key) : [...c, key]));
  }

  async function save(modules: ModuleKey[] | null) {
    try {
      await fnSet({ data: { userId: user.user_id, modules } });
      toast.success("Acesso atualizado");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontal className="mr-1 h-3.5 w-3.5" />
          {custom ? "Personalizado" : "Padrão"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Acesso por módulo — {user.nome}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">
          O perfil <span className="font-semibold capitalize">{user.role}</span> define os módulos padrão. Marque ou
          desmarque para personalizar o acesso deste usuário.
        </p>
        <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
          {MODULES.map((m) => (
            <label key={m.key} className="flex items-center gap-2 rounded-md border p-2 text-sm">
              <Checkbox checked={checked.includes(m.key)} onCheckedChange={() => toggle(m.key)} />
              {m.label}
            </label>
          ))}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => save(null)}>Usar padrão do perfil</Button>
          <Button onClick={() => save(checked)}><Save className="mr-2 h-4 w-4" /> Salvar acesso</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const PROVIDERS = [
  { key: "gemini", label: "Google Gemini", placeholder: "AIza..." },
  { key: "openai", label: "OpenAI (ChatGPT)", placeholder: "sk-..." },
  { key: "anthropic", label: "Anthropic (Claude)", placeholder: "sk-ant-..." },
] as const;

function IaTab() {
  const qc = useQueryClient();
  const fnGet = useServerFn(getAiSettings);
  const fnSave = useServerFn(saveAiSettings);
  const fnTest = useServerFn(testAiKey);
  const [status, setStatus] = useState<Record<string, { ok: boolean; msg: string } | "loading" | undefined>>({});

  const { data } = useQuery({ queryKey: ["ai_settings"], queryFn: () => fnGet() });

  const [provider, setProvider] = useState("gemini");
  const [keys, setKeys] = useState<Record<string, string>>({ gemini: "", openai: "", anthropic: "", notion: "" });

  useEffect(() => {
    if (data) {
      setProvider(data.default_provider ?? "gemini");
      setKeys({ gemini: data.gemini ?? "", openai: data.openai ?? "", anthropic: data.anthropic ?? "", notion: (data as any).notion ?? "" });
    }
  }, [data]);

  async function save() {
    try {
      await fnSave({ data: { default_provider: provider as any, gemini: keys.gemini, openai: keys.openai, anthropic: keys.anthropic, notion: keys.notion } });
      toast.success("Integrações salvas");
      qc.invalidateQueries({ queryKey: ["ai_settings"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function test(p: string) {
    setStatus((s) => ({ ...s, [p]: "loading" }));
    try {
      const r = await fnTest({ data: { provider: p as any } });
      setStatus((s) => ({ ...s, [p]: { ok: r.ok, msg: r.message } }));
    } catch (err: any) {
      setStatus((s) => ({ ...s, [p]: { ok: false, msg: "Erro ao testar" } }));
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <Card className="flex items-start gap-3 border-primary/30 bg-primary/5 p-4">
        <Bot className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          Conecte os provedores de IA usados na aba <span className="font-medium">IA dos Clientes</span>. As chaves são
          armazenadas com segurança e visíveis apenas para administradores — após salvas, aparecem mascaradas.
        </p>
      </Card>

      <Card className="p-6">
        <div className="mb-4 max-w-xs space-y-1">
          <Label>Provedor padrão</Label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {PROVIDERS.map((p) => {
            const st = status[p.key];
            return (
              <div key={p.key} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-1">
                  <Label>{p.label}</Label>
                  <Input
                    type="password"
                    placeholder={p.placeholder}
                    value={keys[p.key]}
                    onChange={(e) => setKeys({ ...keys, [p.key]: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => test(p.key)} disabled={st === "loading"}>
                    {st === "loading" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                    Testar chave
                  </Button>
                  {st && st !== "loading" && (
                    <span className={`inline-flex items-center gap-1 text-xs ${st.ok ? "text-success" : "text-destructive"}`}>
                      {st.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      {st.msg}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 border-t pt-5">
          <Label>Token de integração do Notion (opcional)</Label>
          <p className="mb-2 text-xs text-muted-foreground">
            Para uso futuro mais avançado (leitura de páginas/atas). Armazenado com segurança e mascarado após salvo.
          </p>
          <Input
            type="password"
            className="max-w-md"
            placeholder="secret_..."
            value={keys.notion}
            onChange={(e) => setKeys({ ...keys, notion: e.target.value })}
          />
        </div>

        <Button className="mt-5" onClick={save}><Save className="mr-2 h-4 w-4" /> Salvar integrações</Button>
      </Card>
    </div>
  );
}

function FunilTab() {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["stages"],
    queryFn: async () => {
      const { data } = await supabase.from("funnel_stages").select("*").order("ordem");
      return data ?? [];
    },
  });
  async function add() {
    if (!nome) return;
    const { error } = await supabase.from("funnel_stages").insert({ nome, ordem: data.length });
    if (error) return toast.error(error.message);
    setNome("");
    qc.invalidateQueries({ queryKey: ["stages"] });
  }
  async function del(id: string) {
    await supabase.from("funnel_stages").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["stages"] });
  }
  return (
    <Card className="mt-4 p-6">
      <h3 className="mb-3 font-semibold">Etapas do funil</h3>
      <div className="mb-4 flex gap-2">
        <Input placeholder="Nova etapa" value={nome} onChange={(e) => setNome(e.target.value)} className="max-w-xs" />
        <Button onClick={add}><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
      </div>
      <div className="space-y-2">
        {data.map((s: any) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
            <span>{s.nome}{s.is_won && " (ganho)"}{s.is_lost && " (perdido)"}</span>
            <Button variant="ghost" size="icon" onClick={() => del(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CategoriasTab() {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["dcats"],
    queryFn: async () => {
      const { data } = await supabase.from("deliverable_categories").select("*").order("nome");
      return data ?? [];
    },
  });
  async function add() {
    if (!nome) return;
    const { error } = await supabase.from("deliverable_categories").insert({ nome });
    if (error) return toast.error(error.message);
    setNome("");
    qc.invalidateQueries({ queryKey: ["dcats"] });
  }
  async function del(id: string) {
    await supabase.from("deliverable_categories").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["dcats"] });
  }
  return (
    <Card className="mt-4 p-6">
      <h3 className="mb-3 font-semibold">Categorias de entregáveis</h3>
      <div className="mb-4 flex gap-2">
        <Input placeholder="Nova categoria" value={nome} onChange={(e) => setNome(e.target.value)} className="max-w-xs" />
        <Button onClick={add}><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {data.map((c: any) => (
          <div key={c.id} className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
            {c.nome}
            <button onClick={() => del(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "opcao";
}

function ListEditor({
  listKey,
  title,
  description,
  slugValue,
}: {
  listKey: string;
  title: string;
  description?: string;
  slugValue?: boolean;
}) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const key = ["list_options", listKey];
  const { data = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("list_options")
        .select("*")
        .eq("list_key", listKey)
        .order("ordem");
      return (data ?? []) as any[];
    },
  });
  async function add() {
    const label = nome.trim();
    if (!label) return;
    const value = slugValue ? slugify(label) : label;
    const { error } = await (supabase as any)
      .from("list_options")
      .insert({ list_key: listKey, value, label, ordem: data.length });
    if (error) return toast.error(error.message);
    setNome("");
    qc.invalidateQueries({ queryKey: key });
  }
  async function rename(id: string, label: string) {
    const { error } = await (supabase as any).from("list_options").update({ label }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: key });
  }
  async function del(id: string) {
    const { error } = await (supabase as any).from("list_options").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: key });
  }
  return (
    <Card className="p-6">
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="mb-3 mt-1 text-xs text-muted-foreground">{description}</p>}
      <div className="mb-4 mt-3 flex gap-2">
        <Input
          placeholder="Nova opção"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="max-w-xs"
        />
        <Button onClick={add}><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
      </div>
      <div className="space-y-2">
        {data.map((o: any) => (
          <div key={o.id} className="flex items-center gap-2 rounded-lg border p-2">
            <Input
              defaultValue={o.label}
              className="h-8 max-w-xs"
              onBlur={(e) => e.target.value.trim() && e.target.value !== o.label && rename(o.id, e.target.value.trim())}
            />
            <Button variant="ghost" size="icon" className="ml-auto" onClick={() => del(o.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        {data.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma opção. Adicione a primeira.</p>}
      </div>
    </Card>
  );
}

function ListasTab() {
  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-muted-foreground">
        Edite as listas usadas nos menus suspensos da plataforma. As alterações aparecem automaticamente onde essas
        opções são usadas.
      </p>
      <ListEditor
        listKey="service_categories"
        title="Categorias de serviço"
        description="Usadas no Cronograma, Entregáveis e Catálogo de serviços."
      />
      <ListEditor
        listKey="edition_statuses"
        title="Status do Cronograma"
        description="Etapas do fluxo de produção (ex.: Em edição, Agendado, Publicado)."
        slugValue
      />
    </div>
  );
}



function EmpresaTab() {
  const qc = useQueryClient();
  const { data: company } = useQuery({
    queryKey: ["company"],
    queryFn: async () => {
      const { data } = await supabase.from("company_settings").select("*").eq("id", 1).single();
      return data;
    },
  });
  const [f, setF] = useState<any>(null);
  const cur = f ?? company ?? { nome: "", cnpj: "", logo_url: "", info_fiscal: "" };
  async function save() {
    const { error } = await supabase.from("company_settings").update({
      nome: cur.nome, cnpj: cur.cnpj, logo_url: cur.logo_url, info_fiscal: cur.info_fiscal,
    }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Dados da empresa salvos");
    qc.invalidateQueries({ queryKey: ["company"] });
    qc.invalidateQueries({ queryKey: ["company_settings"] });
  }
  return (
    <Card className="mt-4 p-6">
      <h3 className="mb-3 font-semibold">Dados da empresa</h3>
      <div className="mb-4">
        <LogoUpload label="Logo da Rhema (usado nos PDFs)" value={cur.logo_url} onChange={(v) => setF({ ...cur, logo_url: v })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1"><Label>Nome</Label><Input value={cur.nome ?? ""} onChange={(e) => setF({ ...cur, nome: e.target.value })} /></div>
        <div className="space-y-1"><Label>CNPJ</Label><Input value={cur.cnpj ?? ""} onChange={(e) => setF({ ...cur, cnpj: e.target.value })} /></div>
        <div className="space-y-1 sm:col-span-2"><Label>Info fiscal (contratos)</Label><Input value={cur.info_fiscal ?? ""} onChange={(e) => setF({ ...cur, info_fiscal: e.target.value })} /></div>
      </div>
      <Button className="mt-4" onClick={save}><Save className="mr-2 h-4 w-4" /> Salvar</Button>
    </Card>
  );
}
