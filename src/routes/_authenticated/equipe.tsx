import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, UserCheck, Clock } from "lucide-react";
import { toast } from "sonner";

const PERFIS = ["admin", "comercial", "atendimento", "financeiro"] as const;

export const Route = createFileRoute("/_authenticated/equipe")({
  component: EquipePage,
});

function EquipePage() {
  const { data: members = [] } = useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      const { data } = await supabase.from("team_members").select("*").order("nome");
      return data ?? [];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["team_posts_workload"],
    queryFn: async () => {
      const { data } = await supabase
        .from("content_posts")
        .select("id, assignee_id, entregue, data_post, client_id")
        .eq("entregue", false);
      return data ?? [];
    },
  });

  const workload = useMemo(() => {
    const map: Record<string, { abertas: number; atrasadas: number; clientes: Set<string> }> = {};
    const now = Date.now();
    for (const t of tasks) {
      if (!t.assignee_id) continue;
      const w = (map[t.assignee_id] ??= { abertas: 0, atrasadas: 0, clientes: new Set() });
      w.abertas++;
      if (t.data_post && new Date(t.data_post + "T00:00:00").getTime() < now) w.atrasadas++;
      if (t.client_id) w.clientes.add(t.client_id);
    }
    return map;
  }, [tasks]);

  return (
    <div>
      <PageHeader
        title="Equipe"
        description="Gestão do time interno: função, clientes atribuídos e carga de trabalho atual."
        action={<MemberDialog />}
      />
      <AccessRequests />

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum membro cadastrado.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => {
            const w = workload[m.id] ?? { abertas: 0, atrasadas: 0, clientes: new Set() };
            return (
              <Card key={m.id} className="p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {m.nome.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-bold">{m.nome}</div>
                      <div className="text-xs text-muted-foreground">{m.funcao || "—"}</div>
                      {m.capacidade && <div className="text-[11px] text-muted-foreground">Capacidade: {m.capacidade}</div>}
                      <Badge variant="outline" className="mt-1 text-[10px] capitalize">{m.perfil ?? "atendimento"}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <MemberDialog member={m} />
                    <DeleteMember id={m.id} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="Abertas" value={w.abertas} />
                  <Stat label="Atrasadas" value={w.atrasadas} danger={w.atrasadas > 0} />
                  <Stat label="Clientes" value={w.clientes.size} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/50 py-2">
      <div className={`text-xl font-extrabold ${danger ? "text-destructive" : "text-foreground"}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function DeleteMember({ id }: { id: string }) {
  const qc = useQueryClient();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={async () => {
        if (!confirm("Remover membro?")) return;
        await supabase.from("team_members").delete().eq("id", id);
        qc.invalidateQueries({ queryKey: ["team_members"] });
      }}
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}

function MemberDialog({ member }: { member?: any }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    nome: member?.nome ?? "",
    funcao: member?.funcao ?? "",
    capacidade: member?.capacidade ?? "",
    email: member?.email ?? "",
    perfil: member?.perfil ?? "atendimento",
  });

  async function save() {
    if (!f.nome) return toast.error("Informe o nome");
    const payload = { nome: f.nome, funcao: f.funcao || null, capacidade: f.capacidade || null, email: f.email || null, perfil: f.perfil };
    const { error } = member
      ? await supabase.from("team_members").update(payload).eq("id", member.id)
      : await supabase.from("team_members").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["team_members"] });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {member ? (
          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button><Plus className="mr-2 h-4 w-4" /> Novo membro</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{member ? "Editar" : "Novo"} membro</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Função / especialidade</Label>
            <Input placeholder="ex: editor de vídeo, designer, gestor de tráfego" value={f.funcao} onChange={(e) => setF({ ...f, funcao: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Capacidade de entrega</Label>
            <Input placeholder="ex: 5 edições por semana" value={f.capacidade} onChange={(e) => setF({ ...f, capacidade: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Perfil de acesso</Label>
            <Select value={f.perfil} onValueChange={(v) => setF({ ...f, perfil: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERFIS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Comercial e Admin aparecem como vendedores no CRM.</p>
          </div>
          <div className="space-y-1">
            <Label>E-mail</Label>
            <Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </div>
        </div>
        <DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AccessRequests() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: pending = [] } = useQuery({
    queryKey: ["access_requests"],
    enabled: isAdmin,
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("user_id, nome, email, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id"),
      ]);
      const withRole = new Set((roles ?? []).map((r) => r.user_id));
      return (profiles ?? []).filter((p) => !withRole.has(p.user_id));
    },
  });

  if (!isAdmin || pending.length === 0) return null;

  return (
    <Card className="mb-6 border-primary/30 bg-primary/5 p-5">
      <div className="mb-3 flex items-center gap-2 font-bold text-primary">
        <Clock className="h-4 w-4" /> Solicitações de acesso
        <Badge variant="secondary">{pending.length}</Badge>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Novos cadastros ficam bloqueados até você aprovar e definir um perfil de acesso.
      </p>
      <div className="grid gap-3">
        {pending.map((p) => (
          <PendingRow key={p.user_id} p={p} onDone={() => qc.invalidateQueries({ queryKey: ["access_requests"] })} />
        ))}
      </div>
    </Card>
  );
}

function PendingRow({ p, onDone }: { p: any; onDone: () => void }) {
  const [perfil, setPerfil] = useState<string>("atendimento");
  const [busy, setBusy] = useState(false);

  async function approve() {
    setBusy(true);
    const { error } = await supabase.from("user_roles").insert({ user_id: p.user_id, role: perfil as any });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${p.nome} aprovado como ${perfil}`);
    onDone();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-background p-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-muted text-foreground">
            {(p.nome ?? "?").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="text-sm font-semibold">{p.nome}</div>
          <div className="text-xs text-muted-foreground">{p.email}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Select value={perfil} onValueChange={setPerfil}>
          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERFIS.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={approve} disabled={busy} className="gap-1">
          <UserCheck className="h-4 w-4" /> Aprovar
        </Button>
      </div>
    </div>
  );
}
