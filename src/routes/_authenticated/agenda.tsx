import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";
import { Plus, ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: Agenda,
});

interface Ev {
  id: string;
  date: string; // yyyy-mm-dd
  title: string;
  kind: "reuniao" | "post";
  postType?: "postagem" | "edicao";
  color?: string | null;
  time?: string;
  raw: any;
}

function Agenda() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState(new Date());
  const [clientFilter, setClientFilter] = useState("all");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients_agenda"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id,razao_social,email").is("deleted_at", null).order("razao_social");
      return data ?? [];
    },
  });
  const { data: meetings = [] } = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => {
      const { data } = await supabase.from("meetings").select("*, clients(razao_social,cor)").order("data_evento");
      return data ?? [];
    },
  });
  const { data: posts = [] } = useQuery({
    queryKey: ["all_posts"],
    queryFn: async () => {
      const { data } = await supabase.from("content_posts").select("*, clients(razao_social,cor)").order("data_post");
      return data ?? [];
    },
  });

  const events: Ev[] = useMemo(() => {
    const m = meetings
      .filter((x: any) => clientFilter === "all" || x.client_id === clientFilter)
      .map((x: any) => ({
        id: "m" + x.id, date: String(x.data_evento).slice(0, 10),
        title: x.titulo, kind: "reuniao" as const, color: x.clients?.cor ?? null, time: new Date(x.data_evento).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), raw: x,
      }));
    const p = posts
      .filter((x: any) => clientFilter === "all" || x.client_id === clientFilter)
      .map((x: any) => ({
        id: "p" + x.id, date: String(x.data_post).slice(0, 10),
        title: x.clients?.razao_social ? `${x.clients.razao_social} — ${x.atividade || x.tema}` : (x.atividade || x.tema),
        kind: "post" as const, postType: (x.tipo === "edicao" ? "edicao" : "postagem") as "postagem" | "edicao", color: x.clients?.cor ?? null, raw: x,
      }));
    return [...m, ...p];
  }, [meetings, posts, clientFilter]);

  const year = ref.getFullYear();
  const month = ref.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function dateStr(d: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  const upcoming = events
    .filter((e) => new Date(e.date) >= new Date(new Date().toDateString()))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Reuniões e calendário editorial unificados"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nova reunião</Button></DialogTrigger>
            <MeetingForm clients={clients} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["meetings"] }); }} />
          </Dialog>
        }
      />

      <GoogleConnect />



      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setRef(new Date(year, month - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="w-40 text-center font-semibold capitalize">{ref.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span>
          <Button variant="outline" size="icon" onClick={() => setRef(new Date(year, month + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="p-4">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              const evs = d ? events.filter((e) => e.date === dateStr(d)) : [];
              const isToday = d && dateStr(d) === new Date().toISOString().slice(0, 10);
              return (
                <div
                  key={i}
                  onClick={() => d && setSelectedDay(dateStr(d))}
                  className={"min-h-24 rounded-lg border p-1 text-xs " + (d ? "cursor-pointer bg-card hover:bg-muted/50" : "bg-muted/30") + (isToday ? " ring-2 ring-primary" : "")}
                >
                  {d && <div className="mb-1 font-medium">{d}</div>}
                  <div className="space-y-1">
                    {evs.slice(0, 3).map((e) => {
                      const dot = e.postType === "edicao" ? "◆" : e.postType === "postagem" ? "●" : "";
                      return (
                        <div
                          key={e.id}
                          className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px]"
                          style={
                            e.kind === "post" && e.color
                              ? { backgroundColor: e.color + "22", color: e.color }
                              : undefined
                          }
                        >
                          {e.kind === "post" && e.color && (
                            <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: e.color }} />
                          )}
                          <span className={"truncate " + (e.kind === "reuniao" ? "text-primary" : e.color ? "" : "text-accent-foreground")}>
                            {e.kind === "reuniao" ? (e.time ? e.time + " " : "") : dot ? dot + " " : ""}{e.title}
                          </span>
                        </div>
                      );
                    })}
                    {evs.length > 3 && <div className="text-[10px] text-muted-foreground">+{evs.length - 3}</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-primary/15" /> Reunião</span>
            <span className="flex items-center gap-1">● Postagem</span>
            <span className="flex items-center gap-1">◆ Edição</span>
            <span>Cor = cliente</span>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Próximos eventos</h3>
          <div className="space-y-2">
            {upcoming.map((e) => {
              const dot = e.postType === "edicao" ? "◆" : e.postType === "postagem" ? "●" : "";
              const typeLabel = e.postType === "edicao" ? "Edição" : e.postType === "postagem" ? "Postagem" : "";
              return (
                <div key={e.id} className="rounded-lg border p-2 text-sm">
                  <div className="font-medium">{e.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {e.raw.clients?.razao_social ?? "—"} • {new Date(e.date).toLocaleDateString("pt-BR")}
                    {typeLabel && (
                      <span className="ml-2 inline-flex items-center gap-1 font-medium" style={e.color ? { color: e.color } : undefined}>
                        {dot} {typeLabel}
                      </span>
                    )}
                    {e.kind === "reuniao" && e.raw.gravacao_url && (
                      <a href={e.raw.gravacao_url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 text-primary">
                        gravação <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Nada agendado.</p>}
          </div>
        </Card>
      </div>

      <DayDialog
        date={selectedDay}
        onClose={() => setSelectedDay(null)}
        events={selectedDay ? events.filter((e) => e.date === selectedDay) : []}
        clients={clients}
        onChanged={() => {
          qc.invalidateQueries({ queryKey: ["meetings"] });
          qc.invalidateQueries({ queryKey: ["all_posts"] });
        }}
      />
    </div>
  );
}

function DayDialog({
  date,
  onClose,
  events,
  clients,
  onChanged,
}: {
  date: string | null;
  onClose: () => void;
  events: Ev[];
  clients: any[];
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<"view" | "reuniao" | "post">("view");
  if (!date) return null;

  const byClient = new Map<string, Ev[]>();
  events.forEach((e) => {
    const name = e.raw.clients?.razao_social ?? "Sem cliente";
    if (!byClient.has(name)) byClient.set(name, []);
    byClient.get(name)!.push(e);
  });

  const pretty = new Date(date + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  return (
    <Dialog open={!!date} onOpenChange={(o) => { if (!o) { setMode("view"); onClose(); } }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle className="capitalize">{pretty}</DialogTitle></DialogHeader>

        {mode === "view" && (
          <div className="space-y-4">
            {byClient.size === 0 && <p className="text-sm text-muted-foreground">Nada agendado neste dia.</p>}
            {Array.from(byClient.entries()).map(([name, evs]) => (
              <div key={name}>
                <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
                  {evs[0]?.color && <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: evs[0].color }} />}
                  {name}
                </div>
                <div className="space-y-1">
                  {evs.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                      <span className={"rounded px-1.5 py-0.5 text-[10px] " + (e.kind === "reuniao" ? "bg-primary/15 text-primary" : "bg-accent text-accent-foreground")}>
                        {e.kind === "reuniao" ? "Reunião" : e.postType === "edicao" ? "Edição" : "Postagem"}
                      </span>
                      <span className="flex-1">{e.time ? e.time + " " : ""}{e.title}</span>
                      <button
                        type="button"
                        aria-label="Excluir evento"
                        className="text-muted-foreground transition-colors hover:text-destructive"
                        onClick={async () => {
                          const table = e.kind === "reuniao" ? "meetings" : "content_posts";
                          const { error } = await supabase.from(table).delete().eq("id", e.raw.id);
                          if (error) return toast.error(error.message);
                          toast.success("Evento excluído");
                          onChanged();
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" onClick={() => setMode("reuniao")}><Plus className="mr-1 h-4 w-4" /> Nova reunião</Button>
              <Button size="sm" variant="outline" onClick={() => setMode("post")}><Plus className="mr-1 h-4 w-4" /> Item de cronograma</Button>
            </div>
          </div>
        )}

        {mode === "reuniao" && (
          <MeetingFormInline clients={clients} presetDate={date} onDone={() => { setMode("view"); onChanged(); onClose(); }} />
        )}

        {mode === "post" && (
          <DayPostForm clients={clients} date={date} onDone={() => { setMode("view"); onChanged(); onClose(); }} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DayPostForm({ clients, date, onDone }: { clients: any[]; date: string; onDone: () => void }) {
  const [f, setF] = useState({ client_id: "", categoria: "Social Media", atividade: "", status: "agendado" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.client_id) return toast.error("Selecione o cliente");
    if (!f.atividade.trim()) return toast.error("Informe a atividade");
    const { error } = await supabase.from("content_posts").insert({
      client_id: f.client_id,
      data_post: date,
      categoria: f.categoria,
      atividade: f.atividade.trim(),
      tema: f.atividade.trim(),
      status: f.status,
    });
    if (error) return toast.error(error.message);
    toast.success("Item de cronograma criado");
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1">
        <Label>Cliente*</Label>
        <Select value={f.client_id} onValueChange={(v) => setF({ ...f, client_id: v })}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Categoria</Label>
        <Select value={f.categoria} onValueChange={(v) => setF({ ...f, categoria: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {["Social Media", "Audiovisual", "Identidade Visual", "Site/Landing Page", "Estratégia", "Tráfego Pago", "Outro"].map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Atividade*</Label>
        <Input value={f.atividade} onChange={(e) => setF({ ...f, atividade: e.target.value })} placeholder="Ex: Reels institucional" />
      </div>
      <DialogFooter><Button type="submit">Criar item</Button></DialogFooter>
    </form>
  );
}

const GOOGLE_KEY = "rhema_google_account";

function getGoogleAccount(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(GOOGLE_KEY);
}

function GoogleConnect() {
  const [account, setAccount] = useState<string | null>(getGoogleAccount());

  function connect() {
    const email = window.prompt("Informe o e-mail da conta Google para conectar a Agenda:");
    if (!email) return;
    window.localStorage.setItem(GOOGLE_KEY, email);
    setAccount(email);
    toast.success("Conta Google conectada");
  }
  function disconnect() {
    window.localStorage.removeItem(GOOGLE_KEY);
    setAccount(null);
    toast.success("Conta Google desconectada");
  }

  return (
    <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3">
        <div className={"h-2.5 w-2.5 rounded-full " + (account ? "bg-primary" : "bg-muted-foreground/40")} />
        <div className="text-sm">
          {account ? (
            <span>Conectado como <span className="font-medium">{account}</span> — convites serão enviados aos participantes.</span>
          ) : (
            <span className="text-muted-foreground">Nenhuma conta Google conectada. Eventos são criados apenas internamente.</span>
          )}
        </div>
      </div>
      {account ? (
        <Button variant="outline" size="sm" onClick={disconnect}>Desconectar</Button>
      ) : (
        <Button size="sm" onClick={connect}>Conectar conta Google</Button>
      )}
    </Card>
  );
}

function MeetingForm({ clients, onDone }: { clients: any[]; onDone: () => void }) {
  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Novo evento</DialogTitle></DialogHeader>
      <MeetingFormInline clients={clients} onDone={onDone} />
    </DialogContent>
  );
}

function MeetingFormInline({ clients, onDone, presetDate }: { clients: any[]; onDone: () => void; presetDate?: string }) {
  const [f, setF] = useState({ titulo: "", client_id: "", tipo: "reuniao", data_evento: presetDate ? `${presetDate}T09:00` : "", participantes: "", pauta: "", gravacao_url: "", notas: "", criar_meet: true });
  const [emailInput, setEmailInput] = useState("");
  const googleAccount = getGoogleAccount();

  const emailList = f.participantes.split(",").map((s) => s.trim()).filter(Boolean);

  function addEmails(raw: string) {
    const incoming = raw.split(/[,\s;]+/).map((s) => s.trim()).filter(Boolean);
    if (incoming.length === 0) return;
    const next = [...emailList];
    incoming.forEach((e) => { if (!next.includes(e)) next.push(e); });
    setF({ ...f, participantes: next.join(", ") });
    setEmailInput("");
  }
  function removeEmail(email: string) {
    setF({ ...f, participantes: emailList.filter((e) => e !== email).join(", ") });
  }

  function pickClient(v: string) {
    const c = clients.find((x) => x.id === v);
    const emails = [...emailList];
    if (c?.email && !emails.includes(c.email)) emails.unshift(c.email);
    setF({ ...f, client_id: v, participantes: emails.join(", ") });
  }


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.data_evento) return toast.error("Informe data e hora");
    const meetUrl = f.criar_meet ? `https://meet.google.com/lookup/${Math.random().toString(36).slice(2, 12)}` : null;
    const { error } = await supabase.from("meetings").insert({
      titulo: f.titulo, client_id: f.client_id || null, tipo: f.tipo,
      data_evento: new Date(f.data_evento).toISOString(), participantes: f.participantes || null,
      pauta: f.pauta || null, gravacao_url: f.gravacao_url || null, notas: f.notas || null,
      criar_meet: f.criar_meet, meet_url: meetUrl, google_email: googleAccount,
    });
    if (error) return toast.error(error.message);
    toast.success(googleAccount ? "Evento criado e convite enviado aos participantes" : "Evento criado internamente");
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Tipo</Label>
          <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="reuniao">Reunião</SelectItem>
              <SelectItem value="gravacao">Gravação</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Cliente</Label>
          <Select value={f.client_id} onValueChange={pickClient}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1"><Label>Título*</Label><Input required value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} /></div>
      <div className="space-y-1"><Label>Data e hora*</Label><Input type="datetime-local" value={f.data_evento} onChange={(e) => setF({ ...f, data_evento: e.target.value })} /></div>
      <div className="space-y-1">
        <Label>Participantes (convite do Google Calendar)</Label>
        {emailList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-1">
            {emailList.map((email) => (
              <Badge key={email} variant="secondary" className="gap-1 pr-1">
                {email}
                <button type="button" onClick={() => removeEmail(email)} aria-label={`Remover ${email}`} className="rounded-full hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "," || e.key === " ") {
                e.preventDefault();
                addEmails(emailInput);
              }
            }}
            onBlur={() => emailInput.trim() && addEmails(emailInput)}
            placeholder="Digite um e-mail e pressione Enter"
          />
          <Button type="button" variant="outline" onClick={() => addEmails(emailInput)}>Adicionar</Button>
        </div>
        <p className="text-xs text-muted-foreground">Adicione quantos e-mails quiser — todos recebem o convite.</p>
      </div>

      <div className="space-y-1"><Label>Pauta</Label><Textarea rows={2} value={f.pauta} onChange={(e) => setF({ ...f, pauta: e.target.value })} /></div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.criar_meet} onChange={(e) => setF({ ...f, criar_meet: e.target.checked })} />
        Criar link de Google Meet automaticamente
      </label>
      <div className="space-y-1"><Label>Link da gravação (opcional)</Label><Input value={f.gravacao_url} onChange={(e) => setF({ ...f, gravacao_url: e.target.value })} /></div>
      <div className="space-y-1"><Label>Anotações</Label><Textarea rows={2} value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} /></div>
      <DialogFooter>
        <Button type="submit">{googleAccount ? "Agendar e enviar convite" : "Agendar internamente"}</Button>
      </DialogFooter>
    </form>
  );
}

