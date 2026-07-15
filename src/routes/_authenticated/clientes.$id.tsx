import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatBRL, formatDate } from "@/lib/format";
import { SERVICE_CATEGORIES } from "@/lib/categories";
import { useListOptions, type ListOption } from "@/lib/use-list-options";
import { ActivityInput } from "@/components/activity-input";
import { statusesForTipo, updatePublicationStatus, statusLabel, isPublished, isOverdue } from "@/lib/cronograma";
import { StageTab } from "@/components/operacao/StageTab";
import { ContractSelector, useClientContracts } from "@/components/operacao/ContractSelector";
import { EntregaveisSimples } from "@/components/operacao/EntregaveisSimples";
import { NotasFiscaisTab } from "@/components/operacao/NotasFiscaisTab";
import jsPDF from "jspdf";

import { useTeam } from "@/hooks/use-team";
import { ArrowLeft, Plus, Trash2, ExternalLink, Save, Search, Link as LinkIcon, Upload, FileText, Pencil, Download } from "lucide-react";
import { toast } from "sonner";
import { LogoUpload } from "@/components/logo-upload";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/clientes/$id")({
  component: ClientDetail,
});

function useClient(id: string) {
  return useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*").eq("id", id).single();
      return data;
    },
  });
}

function HealthBadge({ clientId }: { clientId: string }) {
  const { data } = useQuery({
    queryKey: ["health", clientId],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [nps, payments, posts] = await Promise.all([
        supabase.from("nps_records").select("nota").eq("client_id", clientId),
        supabase.from("payments").select("status, data_vencimento").eq("client_id", clientId),
        supabase.from("content_posts").select("entregue, data_post").eq("client_id", clientId),
      ]);
      const notas = (nps.data ?? []).map((n: any) => Number(n.nota));
      const npsAvg = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
      const latePayments = (payments.data ?? []).filter(
        (p: any) => p.status !== "pago" && p.data_vencimento && p.data_vencimento < today,
      ).length;
      const overduePosts = (posts.data ?? []).filter(
        (p: any) => !p.entregue && p.data_post && p.data_post < today,
      ).length;

      let score = 100;
      score -= overduePosts * 8;
      score -= latePayments * 15;
      if (npsAvg !== null) score -= Math.max(0, (8 - npsAvg)) * 6;
      score = Math.max(0, Math.min(100, Math.round(score)));
      return { score, npsAvg, latePayments, overduePosts };
    },
  });

  if (!data) return null;
  const { score, latePayments, overduePosts } = data;
  const color = score >= 75 ? "bg-primary" : score >= 50 ? "bg-warning" : "bg-destructive";
  const label = score >= 75 ? "Saudável" : score >= 50 ? "Atenção" : "Em risco";
  const tips: string[] = [];
  if (overduePosts > 0) tips.push(`${overduePosts} entrega(s) atrasada(s)`);
  if (latePayments > 0) tips.push(`${latePayments} pagamento(s) em atraso`);

  return (
    <div className="flex flex-col items-end gap-1">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white ${color}`}>
        Health Score: {score} • {label}
      </span>
      {tips.length > 0 && <span className="text-[11px] text-muted-foreground">{tips.join(" • ")}</span>}
    </div>
  );
}

function ClientDetail() {
  const { id } = useParams({ from: "/_authenticated/clientes/$id" });
  const { data: client } = useClient(id);
  const { canAccess } = useAuth();

  if (!client) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div>
      <Link to="/clientes" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border bg-muted">
            {client.logo_url ? (
              <img src={client.logo_url} alt={client.razao_social} className="h-full w-full object-contain" />
            ) : (
              <span className="text-lg font-bold text-muted-foreground">{client.razao_social?.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">{client.razao_social}</h1>
            <p className="text-sm text-muted-foreground">{client.documento ?? "Sem documento"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <HealthBadge clientId={id} />
          <Badge variant={client.tipo === "recorrente" ? "default" : "outline"} className="capitalize">
            {client.tipo}
          </Badge>
        </div>
      </div>

      <ShortcutsBar clientId={id} />

      <Tabs defaultValue="cadastro" className="mt-2">
        <TabsList className="mb-2 h-auto flex-wrap gap-1">
          <TabsTrigger value="cadastro" className="px-6 py-2 text-sm font-semibold">Cadastro</TabsTrigger>
          <TabsTrigger value="operacao" className="px-6 py-2 text-sm font-semibold">Operação</TabsTrigger>
          <TabsTrigger value="resultados" className="px-6 py-2 text-sm font-semibold">Resultados</TabsTrigger>
        </TabsList>

        <TabsContent value="cadastro">
          <Tabs defaultValue="dados">
            <TabsList className="flex-wrap">
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="contratos">Contratos</TabsTrigger>
              <TabsTrigger value="redes">Redes & Acessos</TabsTrigger>
              <TabsTrigger value="marca">Identidade de Marca</TabsTrigger>
            </TabsList>
            <TabsContent value="dados"><DadosTab client={client} /></TabsContent>
            <TabsContent value="contratos"><ContratosTab clientId={id} /></TabsContent>
            <TabsContent value="redes"><RedesTab clientId={id} client={client} /></TabsContent>
            <TabsContent value="marca"><IdentidadeMarcaTab client={client} /></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="operacao">
          <OperacaoSection clientId={id} />
        </TabsContent>


        <TabsContent value="resultados">
          <Tabs defaultValue="relatorios">
            <TabsList className="flex-wrap">
              <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
              {canAccess("base-dados") && <TabsTrigger value="base">Base de Dados</TabsTrigger>}
              <TabsTrigger value="nps">NPS</TabsTrigger>
              <TabsTrigger value="obs">Observações</TabsTrigger>
            </TabsList>
            <TabsContent value="relatorios"><RelatoriosTab clientId={id} /></TabsContent>
            {canAccess("base-dados") && <TabsContent value="base"><BaseDadosTab clientId={id} /></TabsContent>}
            <TabsContent value="nps"><NpsTab clientId={id} /></TabsContent>
            <TabsContent value="obs"><ObsTab client={client} /></TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DadosTab({ client }: { client: any }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    razao_social: client.razao_social,
    documento: client.documento ?? "",
    contato_responsavel: client.contato_responsavel ?? "",
    telefone: client.telefone ?? "",
    email: client.email ?? "",
    endereco: client.endereco ?? "",
    status: client.status,
    tipo: client.tipo,
    cor: client.cor ?? "#94a3b8",
    logo_url: client.logo_url ?? null,
  });

  async function save() {
    const { error } = await supabase.from("clients").update(f).eq("id", client.id);
    if (error) return toast.error(error.message);
    toast.success("Dados salvos");
    qc.invalidateQueries({ queryKey: ["client", client.id] });
    qc.invalidateQueries({ queryKey: ["clients"] });
  }

  // A foto é gravada imediatamente ao trocar/remover, para não se perder caso o usuário não clique em "Salvar".
  async function saveLogo(v: string | null) {
    setF((prev) => ({ ...prev, logo_url: v }));
    const { error } = await supabase.from("clients").update({ logo_url: v }).eq("id", client.id);
    if (error) return toast.error(error.message);
    toast.success(v ? "Foto atualizada" : "Foto removida");
    qc.invalidateQueries({ queryKey: ["client", client.id] });
    qc.invalidateQueries({ queryKey: ["clients"] });
  }

  return (
    <Card className="mt-4 p-6">
      <div className="mb-4">
        <LogoUpload
          label="Logo do cliente"
          shape="circle"
          value={f.logo_url}
          onChange={saveLogo}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome / Razão social" value={f.razao_social} onChange={(v) => setF({ ...f, razao_social: v })} />
        <Field label="CNPJ / CPF" value={f.documento} onChange={(v) => setF({ ...f, documento: v })} />
        <Field label="Contato responsável" value={f.contato_responsavel} onChange={(v) => setF({ ...f, contato_responsavel: v })} />
        <Field label="Telefone" value={f.telefone} onChange={(v) => setF({ ...f, telefone: v })} />
        <Field label="E-mail" value={f.email} onChange={(v) => setF({ ...f, email: v })} />
        <Field label="Endereço" value={f.endereco} onChange={(v) => setF({ ...f, endereco: v })} />
        <div className="space-y-1">
          <Label>Tipo</Label>
          <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recorrente">Recorrente</SelectItem>
              <SelectItem value="avulso">Avulso</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Cor de identificação</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={f.cor}
              onChange={(e) => setF({ ...f, cor: e.target.value })}
              className="h-9 w-14 cursor-pointer rounded border bg-background p-1"
              aria-label="Cor do cliente"
            />
            <span className="text-xs text-muted-foreground">Usada para destacar os itens deste cliente no Cronograma geral.</span>
          </div>
        </div>
      </div>
      <Button className="mt-4" onClick={save}><Save className="mr-2 h-4 w-4" /> Salvar</Button>
    </Card>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

const CONTRACT_STATUSES = [
  { value: "rascunho", label: "Rascunho" },
  { value: "enviado", label: "Enviado" },
  { value: "assinado", label: "Assinado" },
  { value: "vencido", label: "Vencido" },
  { value: "cancelado", label: "Cancelado" },
] as const;

const PAYMENT_METHODS = ["Pix", "Boleto", "Cartão", "Transferência", "Dinheiro", "Outro"];

async function openStorageFile(path: string) {
  const { data, error } = await supabase.storage.from("contracts").createSignedUrl(path, 3600);
  if (error || !data) return toast.error("Não foi possível abrir o arquivo");
  window.open(data.signedUrl, "_blank");
}

function OpenLinkButton({ url, label = "Abrir" }: { url: string | null | undefined; label?: string }) {
  if (!url) return null;
  let href = url.trim();
  if (!/^https?:\/\//i.test(href)) href = "https://" + href;
  return (
    <a href={href} target="_blank" rel="noreferrer">
      <Button type="button" variant="outline" size="sm">
        <ExternalLink className="mr-1 h-4 w-4" /> {label}
      </Button>
    </a>
  );
}

function ContratosTab({ clientId }: { clientId: string }) {
  const { data = [] } = useQuery({
    queryKey: ["client_contracts", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("contracts").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const contratos = data.filter((c: any) => (c.tipo ?? "contrato") !== "nf");
  const notas = data.filter((c: any) => c.tipo === "nf");

  return (
    <div className="mt-4 space-y-4">
      <Card className="p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Contratos</h3>
          <ContractDialog clientId={clientId} tipo="contrato" />
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Contratos deste cliente: arquivo (PDF/Word), link do Drive, status, vigência, valor e forma de pagamento.
        </p>
        <div className="space-y-3">
          {contratos.map((c: any) => <ContractCard key={c.id} contract={c} />)}
          {contratos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum contrato cadastrado.</p>}
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Notas Fiscais (NF)</h3>
          <ContractDialog clientId={clientId} tipo="nf" />
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Repositório das notas fiscais deste cliente, separado dos contratos.
        </p>
        <div className="space-y-3">
          {notas.map((c: any) => <ContractCard key={c.id} contract={c} />)}
          {notas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma nota fiscal cadastrada.</p>}
        </div>
      </Card>
    </div>
  );
}

const EMPTY_CONTRACT = {
  titulo: "",
  status: "rascunho",
  valor: "",
  forma_pagamento: "",
  data_inicio: "",
  data_fim: "",
  drive_url: "",
  arquivo_url: "",
};

function ContractDialog({ clientId, contract, tipo = "contrato" }: { clientId: string; contract?: any; tipo?: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const docTipo = contract?.tipo ?? tipo;
  const isNf = docTipo === "nf";
  const docLabel = isNf ? "Nota Fiscal" : "Contrato";
  const [f, setF] = useState({
    titulo: contract?.titulo ?? "",
    status: contract?.status ?? "rascunho",
    valor: contract?.valor != null ? String(contract.valor) : "",
    forma_pagamento: contract?.forma_pagamento ?? "",
    data_inicio: contract?.data_inicio ?? "",
    data_fim: contract?.data_fim ?? "",
    drive_url: contract?.drive_url ?? "",
    arquivo_url: contract?.arquivo_url ?? "",
  });

  async function handleFile(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const path = `${clientId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("contracts").upload(path, file, { upsert: true });
      if (error) throw error;
      setF((p) => ({ ...p, arquivo_url: path }));
      toast.success("Arquivo enviado");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao enviar arquivo");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!f.titulo.trim()) return toast.error(`Informe o título ${isNf ? "da nota fiscal" : "do contrato"}`);
    const payload = {
      client_id: clientId,
      tipo: docTipo,
      titulo: f.titulo.trim(),
      status: f.status,
      valor: f.valor ? Number(f.valor) : undefined,
      forma_pagamento: f.forma_pagamento || null,
      data_inicio: f.data_inicio || null,
      data_fim: f.data_fim || null,
      drive_url: f.drive_url || null,
      arquivo_url: f.arquivo_url || null,
    };
    const { error } = contract
      ? await supabase.from("contracts").update(payload).eq("id", contract.id)
      : await supabase.from("contracts").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(contract ? `${docLabel} atualizado` : `${docLabel} cadastrado`);
    setOpen(false);
    if (!contract) setF(EMPTY_CONTRACT);
    qc.invalidateQueries({ queryKey: ["client_contracts", clientId] });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {contract ? (
          <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm"><Plus className="mr-1 h-4 w-4" /> {isNf ? "Nova NF" : "Novo contrato"}</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{contract ? `Editar ${docLabel.toLowerCase()}` : `${isNf ? "Nova" : "Novo"} ${docLabel.toLowerCase()}`}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1">
            <Label>Título*</Label>
            <Input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder="Ex: Contrato de gestão de redes 2026" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTRACT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Valor (R$)</Label>
              <Input type="number" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Forma de pagamento</Label>
              <Select value={f.forma_pagamento || "none"} onValueChange={(v) => setF({ ...f, forma_pagamento: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Início da vigência</Label>
              <Input type="date" value={f.data_inicio} onChange={(e) => setF({ ...f, data_inicio: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Fim da vigência</Label>
              <Input type="date" value={f.data_fim} onChange={(e) => setF({ ...f, data_fim: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Link do Google Drive</Label>
            <div className="flex gap-2">
              <Input value={f.drive_url} onChange={(e) => setF({ ...f, drive_url: e.target.value })} placeholder="https://drive.google.com/..." />
              <OpenLinkButton url={f.drive_url} label="Abrir no Drive" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Arquivo do contrato (PDF/Word)</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
                <Upload className="mr-1 h-4 w-4" /> {busy ? "Enviando..." : "Enviar arquivo"}
              </Button>
              {f.arquivo_url && (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={() => openStorageFile(f.arquivo_url)}>
                    <FileText className="mr-1 h-4 w-4" /> Abrir arquivo
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setF({ ...f, arquivo_url: "" })}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={busy}><Save className="mr-2 h-4 w-4" /> Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContractCard({ contract }: { contract: any }) {
  const qc = useQueryClient();

  async function del() {
    if (!confirm("Excluir este contrato?")) return;
    const { error } = await supabase.from("contracts").delete().eq("id", contract.id);
    if (error) return toast.error(error.message);
    toast.success("Contrato excluído");
    qc.invalidateQueries({ queryKey: ["client_contracts", contract.client_id] });
  }

  const vigencia =
    contract.data_inicio || contract.data_fim
      ? `${formatDate(contract.data_inicio)} — ${contract.data_fim ? formatDate(contract.data_fim) : "sem término"}`
      : "Vigência não informada";

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{contract.titulo}</div>
          <div className="text-xs text-muted-foreground">
            {formatBRL(contract.valor)}
            {contract.forma_pagamento ? ` • ${contract.forma_pagamento}` : ""} • {vigencia}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="capitalize">{contract.status}</Badge>
          <ContractDialog clientId={contract.client_id} contract={contract} />
          <Button variant="ghost" size="icon" onClick={del}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <OpenLinkButton url={contract.drive_url} label="Abrir no Drive" />
        {contract.arquivo_url && (
          <Button type="button" variant="outline" size="sm" onClick={() => openStorageFile(contract.arquivo_url)}>
            <FileText className="mr-1 h-4 w-4" /> Abrir arquivo
          </Button>
        )}
      </div>
    </div>
  );
}




function RedesTab({ clientId, client }: { clientId: string; client: any }) {
  const qc = useQueryClient();
  const [nova, setNova] = useState({ plataforma: "", link: "", login: "", senha: "" });
  const [links, setLinks] = useState({ drive_url: client.drive_url ?? "", notion_url: client.notion_url ?? "" });

  const { data = [] } = useQuery({
    queryKey: ["socials", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("client_socials").select("*").eq("client_id", clientId);
      return data ?? [];
    },
  });

  async function add() {
    if (!nova.plataforma) return;
    const { error } = await supabase.from("client_socials").insert({ ...nova, client_id: clientId });
    if (error) return toast.error(error.message);
    setNova({ plataforma: "", link: "", login: "", senha: "" });
    qc.invalidateQueries({ queryKey: ["socials", clientId] });
  }
  async function del(id: string) {
    await supabase.from("client_socials").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["socials", clientId] });
  }
  async function saveLinks() {
    const { error } = await supabase.from("clients").update(links).eq("id", clientId);
    if (error) return toast.error(error.message);
    toast.success("Integrações salvas");
    qc.invalidateQueries({ queryKey: ["client", clientId] });
  }

  return (
    <div className="mt-4 space-y-4">
      <Card className="p-6">
        <h3 className="mb-3 font-semibold">Redes sociais e credenciais</h3>
        <div className="grid gap-2 sm:grid-cols-5">
          <Input placeholder="Plataforma" value={nova.plataforma} onChange={(e) => setNova({ ...nova, plataforma: e.target.value })} />
          <Input placeholder="Link" value={nova.link} onChange={(e) => setNova({ ...nova, link: e.target.value })} />
          <Input placeholder="Login" value={nova.login} onChange={(e) => setNova({ ...nova, login: e.target.value })} />
          <Input placeholder="Senha" value={nova.senha} onChange={(e) => setNova({ ...nova, senha: e.target.value })} />
          <Button onClick={add}><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="mt-4 space-y-2">
          {data.map((s: any) => (
            <div key={s.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
              <span className="w-28 font-medium">{s.plataforma}</span>
              {s.link && (
                <a href={s.link} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Link <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <span className="text-muted-foreground">login: {s.login || "—"}</span>
              <span className="text-muted-foreground">senha: {s.senha || "—"}</span>
              <Button variant="ghost" size="icon" className="ml-auto" onClick={() => del(s.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-3 font-semibold">Integrações (Drive / Notion / IA)</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Google Drive (link da pasta)</Label>
            <div className="flex gap-2">
              <Input value={links.drive_url} onChange={(e) => setLinks({ ...links, drive_url: e.target.value })} placeholder="https://drive.google.com/..." />
              <OpenLinkButton url={links.drive_url} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notion — gravações (link da página/pasta)</Label>
            <div className="flex gap-2">
              <Input value={links.notion_url} onChange={(e) => setLinks({ ...links, notion_url: e.target.value })} placeholder="https://notion.so/..." />
              <OpenLinkButton url={links.notion_url} />
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Resumos automáticos com Gemini serão gerados a partir destes dados em uma próxima fase.
        </p>
        <Button className="mt-3" onClick={saveLinks}><Save className="mr-2 h-4 w-4" /> Salvar integrações</Button>
      </Card>
    </div>
  );
}

const PERIODICIDADES = ["mensal", "quinzenal", "semanal", "trimestral", "único"];

function OperacaoSection({ clientId }: { clientId: string }) {
  const { data: contracts = [] } = useClientContracts(clientId);
  const [contractId, setContractId] = useState<string | null>(null);
  const contract = contracts.find((c: any) => c.id === contractId) ?? null;

  return (
    <div className="mt-4">
      <ContractSelector clientId={clientId} value={contractId} onChange={setContractId} />
      {!contract ? (
        <p className="text-sm text-muted-foreground">Selecione um contrato para trabalhar a operação.</p>
      ) : (
        <Tabs defaultValue="entregaveis">
          <TabsList className="flex-wrap">
            <TabsTrigger value="entregaveis">Entregáveis</TabsTrigger>
            <TabsTrigger value="producao">Produção</TabsTrigger>
            <TabsTrigger value="edicao">Edição</TabsTrigger>
            <TabsTrigger value="postagens">Postagens</TabsTrigger>
            <TabsTrigger value="nf">Notas Fiscais</TabsTrigger>
            <TabsTrigger value="reunioes">Reuniões</TabsTrigger>
            <TabsTrigger value="formularios">Formulários</TabsTrigger>
          </TabsList>
          <TabsContent value="entregaveis"><EntregaveisSimples clientId={clientId} contract={contract} /></TabsContent>
          <TabsContent value="producao"><StageTab clientId={clientId} stage="producao" contractId={contract.id} /></TabsContent>
          <TabsContent value="edicao"><StageTab clientId={clientId} stage="edicao" contractId={contract.id} /></TabsContent>
          <TabsContent value="postagens"><StageTab clientId={clientId} stage="postagem" contractId={contract.id} /></TabsContent>
          <TabsContent value="nf"><NotasFiscaisTab contract={contract} /></TabsContent>
          <TabsContent value="reunioes"><ReunioesTab clientId={clientId} /></TabsContent>
          <TabsContent value="formularios"><FormulariosClienteTab clientId={clientId} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}



const CRON_STATUSES: ListOption[] = [
  { value: "pendente", label: "Em edição" },
  { value: "agendado", label: "Agendado" },
  { value: "publicado", label: "Publicado" },
];

function weekOfMonth(dateStr: string) {
  const day = Number(String(dateStr).slice(8, 10));
  return Math.max(1, Math.ceil(day / 7));
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function CronogramaTab({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tipoTab, setTipoTab] = useState<string>("postagem");

  const { data: client } = useQuery({
    queryKey: ["client_name", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("razao_social").eq("id", clientId).maybeSingle();
      return data;
    },
  });

  const { data = [] } = useQuery({
    queryKey: ["posts", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("content_posts")
        .select("*, team_members(nome)")
        .eq("client_id", clientId)
        .order("data_post", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const months = useMemo(() => {
    const set = new Set<string>();
    data.forEach((p: any) => { if (p.data_post) set.add(String(p.data_post).slice(0, 7)); });
    return Array.from(set).sort().reverse();
  }, [data]);

  const filtered = useMemo(() => {
    return data.filter((p: any) => {
      if ((p.tipo || "postagem") !== tipoTab) return false;
      if (monthFilter !== "all" && String(p.data_post).slice(0, 7) !== monthFilter) return false;
      if (statusFilter === "all") return true;
      if (statusFilter === "atrasado") return isOverdue(p);
      if (statusFilter === "publicado") return isPublished(p);
      return !isPublished(p) && !isOverdue(p) && (p.status || "agendado") === statusFilter;
    });
  }, [data, monthFilter, statusFilter, tipoTab]);

  const tabStatuses = statusesForTipo(tipoTab);

  async function updateStatus(id: string, status: string) {
    const { error } = await updatePublicationStatus(id, status);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["posts", clientId] });
    qc.invalidateQueries({ queryKey: ["editions"] });
    qc.invalidateQueries({ queryKey: ["contract_deliveries"] });
    qc.invalidateQueries({ queryKey: ["deliverables", clientId] });
  }

  async function delPost(id: string) {
    if (!confirm("Excluir este item do cronograma?")) return;
    const { error } = await supabase.from("content_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Item excluído");
    qc.invalidateQueries({ queryKey: ["posts", clientId] });
    qc.invalidateQueries({ queryKey: ["editions"] });
    qc.invalidateQueries({ queryKey: ["deliverables", clientId] });
  }

  const clientName = client?.razao_social || "cliente";

  function exportExcel() {
    const header = ["Data", "Título/Atividade", "Categoria", "Tipo", "Responsável", "Status"];
    const rows = filtered.map((p: any) => [
      formatDate(p.data_post),
      p.atividade || p.tema || "",
      p.categoria || "",
      p.tipo || "",
      p.team_members?.nome || "",
      statusLabel(p),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cronograma-${clientName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    let y = 56;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Cronograma — ${clientName}`, margin, y);
    y += 24;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const cols = [margin, margin + 70, margin + 250, margin + 350, margin + 440];
    doc.text("Data", cols[0], y);
    doc.text("Atividade", cols[1], y);
    doc.text("Categoria", cols[2], y);
    doc.text("Responsável", cols[3], y);
    doc.text("Status", cols[4], y);
    y += 6;
    doc.setLineWidth(0.5);
    doc.line(margin, y, 555, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    filtered.forEach((p: any) => {
      if (y > 780) { doc.addPage(); y = 56; }
      doc.text(String(formatDate(p.data_post)), cols[0], y);
      doc.text(doc.splitTextToSize(p.atividade || p.tema || "", 170), cols[1], y);
      doc.text(doc.splitTextToSize(p.categoria || "", 90), cols[2], y);
      doc.text(doc.splitTextToSize(p.team_members?.nome || "—", 80), cols[3], y);
      doc.text(statusLabel(p), cols[4], y);
      y += 20;
    });
    doc.save(`cronograma-${clientName}.pdf`);
  }

  return (
    <Card className="mt-4 p-6">
      <Tabs value={tipoTab} onValueChange={(v) => { setTipoTab(v); setStatusFilter("all"); }}>
        <TabsList className="mb-4">
          <TabsTrigger value="postagem" className="px-6">Postagem</TabsTrigger>
          <TabsTrigger value="edicao" className="px-6">Edição</TabsTrigger>
        </TabsList>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Mês</Label>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-48 capitalize"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {months.map((m) => <SelectItem key={m} value={m} className="capitalize">{monthLabel(m)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {tabStatuses.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportPDF}><Download className="mr-1 h-4 w-4" /> PDF</Button>
            <Button variant="outline" size="sm" onClick={exportExcel}><Download className="mr-1 h-4 w-4" /> Excel</Button>
            <MonthlyScheduleDialog clientId={clientId} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Data</th>
                <th className="py-2 pr-3 font-medium">Título / Atividade</th>
                <th className="py-2 pr-3 font-medium">Categoria</th>
                <th className="py-2 pr-3 font-medium">Responsável</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p: any) => {
                const overdue = isOverdue(p);
                const published = isPublished(p);
                const currentStatus = published ? "publicado" : (p.status || "agendado");
                return (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{formatDate(p.data_post)}</td>
                    <td className="py-2 pr-3 font-medium">{p.atividade || p.tema}</td>
                    <td className="py-2 pr-3"><Badge variant="outline" className="text-[10px]">{p.categoria}</Badge></td>
                    <td className="py-2 pr-3 text-muted-foreground">{p.team_members?.nome || "—"}</td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <Select value={currentStatus} onValueChange={(v) => updateStatus(p.id, v)}>
                          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {tabStatuses.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {overdue && <Badge variant="destructive" className="text-[10px]">Atrasado</Badge>}
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => delPost(p.id)} title="Excluir">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum item no cronograma para este filtro.</p>}
        </div>
      </Tabs>
    </Card>
  );
}


type CronRow = { data_post: string; categoria: string; tipo: string; atividade: string; assignee_id: string; pauta: string };

const EMPTY_ROW: CronRow = { data_post: "", categoria: "Social Media", tipo: "postagem", atividade: "", assignee_id: "none", pauta: "" };

function MonthlyScheduleDialog({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const { data: team = [] } = useTeam();
  const serviceCats = useListOptions("service_categories", SERVICE_CATEGORIES.map((c) => ({ value: c, label: c })));
  const [open, setOpen] = useState(false);
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState<CronRow[]>([EMPTY_ROW]);

  const { data: activeContract } = useQuery({
    queryKey: ["active_contract", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("contracts")
        .select("id")
        .eq("client_id", clientId)
        .in("status", ["ativo", "assinado"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  function addRow() {
    setRows((r) => [...r, { ...EMPTY_ROW, data_post: `${mes}-01` }]);
  }
  function updateRow(i: number, patch: Partial<CronRow>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  async function save() {
    const valid = rows.filter((r) => r.data_post && r.atividade.trim());
    if (valid.length === 0) return toast.error("Preencha ao menos uma linha (data e atividade)");
    const payload = valid.map((r) => ({
      client_id: clientId,
      data_post: r.data_post,
      atividade: r.atividade.trim(),
      tema: r.atividade.trim(),
      pauta: r.pauta || null,
      categoria: r.categoria,
      tipo: r.tipo,
      status: "agendado",
      assignee_id: r.assignee_id === "none" ? null : r.assignee_id,
      contract_id: activeContract?.id ?? null,
    }));
    const { error } = await supabase.from("content_posts").insert(payload as any);
    if (error) return toast.error(error.message);
    toast.success(`${valid.length} item(ns) adicionados ao cronograma`);
    setRows([EMPTY_ROW]);
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["posts", clientId] });
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-1 h-4 w-4" /> Criar Cronograma Mensal</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader><DialogTitle>Criar cronograma mensal</DialogTitle></DialogHeader>
        <div className="mb-3 flex items-center gap-2">
          <Label>Mês de referência</Label>
          <Input type="month" className="w-44" value={mes} onChange={(e) => setMes(e.target.value)} />
        </div>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid items-center gap-2 sm:grid-cols-[130px_130px_1fr_1fr_1fr_1fr_40px]">
              <Input type="date" value={r.data_post} onChange={(e) => updateRow(i, { data_post: e.target.value })} />
              <Select value={r.tipo} onValueChange={(v) => updateRow(i, { tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="postagem">Postagem</SelectItem>
                  <SelectItem value="edicao">Edição</SelectItem>
                </SelectContent>
              </Select>
              <Select value={r.categoria} onValueChange={(v) => updateRow(i, { categoria: v, atividade: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {serviceCats.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <ActivityInput categoria={r.categoria} value={r.atividade} onChange={(v) => updateRow(i, { atividade: v })} />
              <Select value={r.assignee_id} onValueChange={(v) => updateRow(i, { assignee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem responsável</SelectItem>
                  {team.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Detalhe" value={r.pauta} onChange={(e) => updateRow(i, { pauta: e.target.value })} />
              <Button variant="ghost" size="icon" onClick={() => removeRow(i)} disabled={rows.length === 1}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="mt-2 w-fit" onClick={addRow}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar linha
        </Button>
        <DialogFooter>
          <Button onClick={save}><Save className="mr-2 h-4 w-4" /> Salvar cronograma</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}





function ReunioesTab({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["client_meetings", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("meetings").select("*").eq("client_id", clientId).order("data_evento", { ascending: false });
      return data ?? [];
    },
  });
  async function linkNotion(id: string, current: string | null) {
    const url = window.prompt("Cole o link da página do Notion (ata/gravação) desta reunião:", current ?? "");
    if (url === null) return;
    await supabase.from("meetings").update({ notion_url: url.trim() || null }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["client_meetings", clientId] });
  }
  return (
    <Card className="mt-4 p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Reuniões e gravações</h3>
        <Link to="/agenda"><Button variant="outline" size="sm">Ir para agenda</Button></Link>
      </div>
      <div className="space-y-2">
        {data.map((m: any) => (
          <div key={m.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
            <div className="flex-1">
              <div className="font-medium">{m.titulo}</div>
              <div className="text-xs text-muted-foreground capitalize">{m.tipo} • {formatDate(m.data_evento)}</div>
            </div>
            {m.gravacao_url && (
              <a href={m.gravacao_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                Gravação <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {m.notion_url && (
              <a href={m.notion_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                Notion <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <Button variant="ghost" size="sm" onClick={() => linkNotion(m.id, m.notion_url)}>
              {m.notion_url ? "Editar Notion" : "Vincular Notion"}
            </Button>
          </div>
        ))}
        {data.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma reunião.</p>}
      </div>
    </Card>
  );
}

function ShortcutsBar({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ nome: "", url: "" });
  const { data = [] } = useQuery({
    queryKey: ["client_shortcuts", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("client_shortcuts").select("*").eq("client_id", clientId).order("created_at");
      return data ?? [];
    },
  });
  async function add() {
    if (!f.nome || !f.url) return toast.error("Informe nome e link");
    let url = f.url.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    const { error } = await supabase.from("client_shortcuts").insert({ client_id: clientId, nome: f.nome, url });
    if (error) return toast.error(error.message);
    setF({ nome: "", url: "" });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["client_shortcuts", clientId] });
  }
  async function del(id: string) {
    await supabase.from("client_shortcuts").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["client_shortcuts", clientId] });
  }
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {data.map((s: any) => (
        <div key={s.id} className="group inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm">
          <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium hover:text-primary">
            <LinkIcon className="h-3.5 w-3.5" /> {s.nome}
          </a>
          <button onClick={() => del(s.id)} className="opacity-0 transition-opacity group-hover:opacity-100">
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </button>
        </div>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm"><Plus className="mr-1 h-3.5 w-3.5" /> Atalho</Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-2">
          <div className="space-y-1"><Label>Nome do atalho</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex: Gravações (Notion)" /></div>
          <div className="space-y-1"><Label>Link</Label><Input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://... (qualquer origem)" /></div>
          <Button size="sm" className="w-full" onClick={add}>Adicionar</Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function IdentidadeMarcaTab({ client }: { client: any }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    brand_historia: client.brand_historia ?? "",
    brand_objetivo: client.brand_objetivo ?? "",
    brand_publico: client.brand_publico ?? "",
    brand_tom_voz: client.brand_tom_voz ?? "",
    brand_valores: client.brand_valores ?? "",
    brand_logo_url: client.brand_logo_url ?? null as string | null,
    brand_fontes: (Array.isArray(client.brand_fontes) ? client.brand_fontes : []) as { nome: string; url: string }[],
    brand_paleta: (Array.isArray(client.brand_paleta) ? client.brand_paleta : []) as string[],
  });
  const [fonte, setFonte] = useState({ nome: "", url: "" });
  const [cor, setCor] = useState("#6d28d9");

  async function save() {
    const { error } = await supabase.from("clients").update({
      brand_historia: f.brand_historia || null,
      brand_objetivo: f.brand_objetivo || null,
      brand_publico: f.brand_publico || null,
      brand_tom_voz: f.brand_tom_voz || null,
      brand_valores: f.brand_valores || null,
      brand_logo_url: f.brand_logo_url,
      brand_fontes: f.brand_fontes,
      brand_paleta: f.brand_paleta,
    }).eq("id", client.id);
    if (error) return toast.error(error.message);
    toast.success("Identidade de marca salva");
    qc.invalidateQueries({ queryKey: ["client", client.id] });
  }

  return (
    <Card className="mt-4 space-y-4 p-6">
      <div>
        <LogoUpload label="Logo da marca (PNG/SVG)" value={f.brand_logo_url} onChange={(v) => setF({ ...f, brand_logo_url: v })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1"><Label>História da marca</Label><Textarea rows={3} value={f.brand_historia} onChange={(e) => setF({ ...f, brand_historia: e.target.value })} /></div>
        <div className="space-y-1"><Label>Objetivo / missão</Label><Textarea rows={3} value={f.brand_objetivo} onChange={(e) => setF({ ...f, brand_objetivo: e.target.value })} /></div>
        <div className="space-y-1"><Label>Público-alvo</Label><Textarea rows={3} value={f.brand_publico} onChange={(e) => setF({ ...f, brand_publico: e.target.value })} /></div>
        <div className="space-y-1"><Label>Tom de voz</Label><Textarea rows={3} value={f.brand_tom_voz} onChange={(e) => setF({ ...f, brand_tom_voz: e.target.value })} /></div>
        <div className="space-y-1 sm:col-span-2"><Label>Valores da marca</Label><Textarea rows={3} value={f.brand_valores} onChange={(e) => setF({ ...f, brand_valores: e.target.value })} /></div>
      </div>

      <div>
        <Label>Fontes utilizadas</Label>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Input placeholder="Nome da fonte" value={fonte.nome} onChange={(e) => setFonte({ ...fonte, nome: e.target.value })} />
          <Input placeholder="Link (Drive ou qualquer origem)" value={fonte.url} onChange={(e) => setFonte({ ...fonte, url: e.target.value })} />
          <Button type="button" onClick={() => { if (!fonte.nome) return; setF({ ...f, brand_fontes: [...f.brand_fontes, fonte] }); setFonte({ nome: "", url: "" }); }}><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="mt-2 space-y-1">
          {f.brand_fontes.map((ft, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
              <span className="font-medium">{ft.nome}</span>
              {ft.url && <a href={ft.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">link <ExternalLink className="h-3 w-3" /></a>}
              <button className="ml-auto" onClick={() => setF({ ...f, brand_fontes: f.brand_fontes.filter((_, j) => j !== i) })}><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Paleta de cores</Label>
        <div className="mt-2 flex items-center gap-2">
          <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-9 w-12 rounded border" />
          <Input className="w-32" value={cor} onChange={(e) => setCor(e.target.value)} placeholder="#000000" />
          <Button type="button" onClick={() => { if (!f.brand_paleta.includes(cor)) setF({ ...f, brand_paleta: [...f.brand_paleta, cor] }); }}><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {f.brand_paleta.map((c, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <button
                onClick={() => setF({ ...f, brand_paleta: f.brand_paleta.filter((_, j) => j !== i) })}
                title="Remover"
                className="h-12 w-12 rounded-lg border shadow-sm"
                style={{ backgroundColor: c }}
              />
              <span className="text-[10px] text-muted-foreground">{c}</span>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={save}><Save className="mr-2 h-4 w-4" /> Salvar identidade</Button>
    </Card>
  );
}

function FormulariosClienteTab({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ template_id: "", data_envio: new Date().toISOString().slice(0, 10), resposta_url: "" });
  const { data: templates = [] } = useQuery({
    queryKey: ["form_templates"],
    queryFn: async () => {
      const { data } = await supabase.from("form_templates").select("*").order("nome");
      return data ?? [];
    },
  });
  const { data = [] } = useQuery({
    queryKey: ["client_forms", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("client_forms").select("*, form_templates(nome, url)").eq("client_id", clientId).order("data_envio", { ascending: false });
      return data ?? [];
    },
  });
  async function add() {
    if (!f.template_id) return toast.error("Selecione o formulário");
    const tpl = templates.find((t: any) => t.id === f.template_id);
    const { error } = await supabase.from("client_forms").insert({
      client_id: clientId, template_id: f.template_id, nome: tpl?.nome ?? null,
      data_envio: f.data_envio, resposta_url: f.resposta_url || null,
    });
    if (error) return toast.error(error.message);
    setF({ template_id: "", data_envio: new Date().toISOString().slice(0, 10), resposta_url: "" });
    qc.invalidateQueries({ queryKey: ["client_forms", clientId] });
  }
  async function del(id: string) {
    await supabase.from("client_forms").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["client_forms", clientId] });
  }
  return (
    <Card className="mt-4 p-6">
      <h3 className="mb-1 font-semibold">Formulários enviados a este cliente</h3>
      <p className="mb-4 text-xs text-muted-foreground">Puxe do catálogo em Formulários & Modelos e registre o envio.</p>
      <div className="grid gap-2 sm:grid-cols-[1fr_150px_1fr_auto]">
        <Select value={f.template_id} onValueChange={(v) => setF({ ...f, template_id: v })}>
          <SelectTrigger><SelectValue placeholder="Formulário" /></SelectTrigger>
          <SelectContent>
            {templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={f.data_envio} onChange={(e) => setF({ ...f, data_envio: e.target.value })} />
        <Input placeholder="Link da resposta preenchida" value={f.resposta_url} onChange={(e) => setF({ ...f, resposta_url: e.target.value })} />
        <Button onClick={add}><Plus className="mr-1 h-4 w-4" /> Registrar</Button>
      </div>
      {templates.length === 0 && <p className="mt-2 text-xs text-muted-foreground">Nenhum formulário no catálogo ainda. Cadastre em Formulários & Modelos.</p>}
      <div className="mt-4 space-y-2">
        {data.map((r: any) => (
          <div key={r.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
            <div className="flex-1">
              <div className="font-medium">{r.form_templates?.nome ?? r.nome ?? "Formulário"}</div>
              <div className="text-xs text-muted-foreground">enviado em {formatDate(r.data_envio)}</div>
            </div>
            {r.form_templates?.url && (
              <a href={r.form_templates.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Formulário <ExternalLink className="h-3 w-3" /></a>
            )}
            {r.resposta_url && (
              <a href={r.resposta_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Resposta <ExternalLink className="h-3 w-3" /></a>
            )}
            <Button variant="ghost" size="icon" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
        {data.length === 0 && <p className="text-sm text-muted-foreground">Nenhum formulário registrado.</p>}
      </div>
    </Card>
  );
}

function NpsTab({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ nota: "9", comentario: "", data_avaliacao: new Date().toISOString().slice(0, 10) });
  const { data = [] } = useQuery({
    queryKey: ["nps", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("nps_records").select("*").eq("client_id", clientId).order("data_avaliacao", { ascending: false });
      return data ?? [];
    },
  });
  const avg = data.length ? (data.reduce((s: number, n: any) => s + n.nota, 0) / data.length).toFixed(1) : "—";

  // Série cronológica para o gráfico de evolução (mais antigo → mais recente).
  const chartData = useMemo(
    () =>
      [...data]
        .sort((a: any, b: any) => String(a.data_avaliacao).localeCompare(String(b.data_avaliacao)))
        .map((n: any) => ({ data: formatDate(n.data_avaliacao), nota: n.nota })),
    [data],
  );

  async function add() {
    const nota = Number(f.nota);
    if (Number.isNaN(nota) || nota < 0 || nota > 10) return toast.error("Nota deve ser entre 0 e 10");
    const { error } = await supabase.from("nps_records").insert({
      client_id: clientId,
      nota,
      comentario: f.comentario || null,
      data_avaliacao: f.data_avaliacao,
    });
    if (error) return toast.error(error.message);
    setF({ nota: "9", comentario: "", data_avaliacao: new Date().toISOString().slice(0, 10) });
    qc.invalidateQueries({ queryKey: ["nps", clientId] });
    qc.invalidateQueries({ queryKey: ["health", clientId] });
    toast.success("Feedback registrado");
  }
  async function del(id: string) {
    if (!confirm("Excluir este registro de NPS?")) return;
    await supabase.from("nps_records").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["nps", clientId] });
    qc.invalidateQueries({ queryKey: ["health", clientId] });
  }

  return (
    <Card className="mt-4 p-6">
      <div className="mb-4 text-sm text-muted-foreground">NPS médio: <span className="text-2xl font-extrabold text-primary">{avg}</span></div>

      {chartData.length >= 2 && (
        <div className="mb-6">
          <h4 className="mb-2 text-sm font-semibold">Evolução da satisfação</h4>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="data" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 10]} fontSize={11} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="nota" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-5">
        <div className="space-y-1">
          <Label className="text-xs">Nota (0-10)</Label>
          <Input type="number" min={0} max={10} value={f.nota} onChange={(e) => setF({ ...f, nota: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Data</Label>
          <Input type="date" value={f.data_avaliacao} onChange={(e) => setF({ ...f, data_avaliacao: e.target.value })} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Feedback da reunião / comentário</Label>
          <Input placeholder="Resumo do que o cliente falou" value={f.comentario} onChange={(e) => setF({ ...f, comentario: e.target.value })} />
        </div>
        <div className="flex items-end">
          <Button className="w-full" onClick={add}><Plus className="mr-1 h-4 w-4" /> Registrar</Button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {data.map((n: any) => (
          <div key={n.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">{n.nota}</span>
            <div className="flex-1">{n.comentario ?? "Sem comentário"}</div>
            <span className="text-xs text-muted-foreground">{formatDate(n.data_avaliacao)}</span>
            <Button variant="ghost" size="icon" onClick={() => del(n.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        {data.length === 0 && <p className="text-sm text-muted-foreground">Sem registros de NPS.</p>}
      </div>
    </Card>
  );
}

function ObsTab({ client }: { client: any }) {
  const qc = useQueryClient();
  const [obs, setObs] = useState(client.observacoes_internas ?? "");
  async function save() {
    const { error } = await supabase.from("clients").update({ observacoes_internas: obs }).eq("id", client.id);
    if (error) return toast.error(error.message);
    toast.success("Observações salvas");
    qc.invalidateQueries({ queryKey: ["client", client.id] });
  }
  return (
    <Card className="mt-4 p-6">
      <h3 className="mb-2 font-semibold">Observações internas</h3>
      <p className="mb-3 text-xs text-muted-foreground">Visível apenas para a equipe.</p>
      <Textarea rows={8} value={obs} onChange={(e) => setObs(e.target.value)} />
      <Button className="mt-3" onClick={save}><Save className="mr-2 h-4 w-4" /> Salvar</Button>
    </Card>
  );
}

function RelatoriosTab({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ titulo: "", periodo: "", data_envio: new Date().toISOString().slice(0, 10), resumo: "", arquivo_url: "" });
  const { data = [] } = useQuery({
    queryKey: ["client_reports", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_reports")
        .select("*")
        .eq("client_id", clientId)
        .order("data_envio", { ascending: false });
      return data ?? [];
    },
  });

  async function handleFile(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const path = `reports/${clientId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("contracts").upload(path, file, { upsert: true });
      if (error) throw error;
      setF((p) => ({ ...p, arquivo_url: path }));
      toast.success("Arquivo enviado");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao enviar arquivo");
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    if (!f.titulo) return toast.error("Informe o título do relatório");
    const { error } = await supabase.from("client_reports").insert({
      client_id: clientId,
      titulo: f.titulo,
      periodo: f.periodo || null,
      data_envio: f.data_envio,
      resumo: f.resumo || null,
      arquivo_url: f.arquivo_url || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Relatório registrado");
    setF({ titulo: "", periodo: "", data_envio: new Date().toISOString().slice(0, 10), resumo: "", arquivo_url: "" });
    qc.invalidateQueries({ queryKey: ["client_reports", clientId] });
  }
  async function del(id: string) {
    if (!confirm("Excluir este relatório?")) return;
    await supabase.from("client_reports").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["client_reports", clientId] });
  }

  const isUpload = f.arquivo_url && !/^https?:\/\//i.test(f.arquivo_url);

  return (
    <Card className="mt-4 p-6">
      <h3 className="mb-1 font-semibold">Relatórios entregues ao cliente</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Relatórios de performance enviados a este cliente (mensal, quinzenal ou por campanha). Diferente do relatório
        interno do módulo Financeiro.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Título do relatório" value={f.titulo} onChange={(v) => setF({ ...f, titulo: v })} />
        <Field label="Período de referência" value={f.periodo} onChange={(v) => setF({ ...f, periodo: v })} />
        <div className="space-y-1">
          <Label>Data de envio</Label>
          <Input type="date" value={f.data_envio} onChange={(e) => setF({ ...f, data_envio: e.target.value })} />
        </div>
        <Field label="Link (Slides / Canva / Looker / PDF)" value={isUpload ? "" : f.arquivo_url} onChange={(v) => setF({ ...f, arquivo_url: v })} />
        <div className="space-y-1 sm:col-span-2">
          <Label>Arquivo do relatório (upload)</Label>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
              <Upload className="mr-1 h-4 w-4" /> {busy ? "Enviando..." : "Enviar arquivo"}
            </Button>
            {isUpload && (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => openStorageFile(f.arquivo_url)}>
                  <FileText className="mr-1 h-4 w-4" /> Abrir arquivo
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setF({ ...f, arquivo_url: "" })}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*,application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label>Resumo / observações</Label>
          <Textarea rows={3} value={f.resumo} onChange={(e) => setF({ ...f, resumo: e.target.value })} />
        </div>
      </div>
      <Button className="mt-3" onClick={add}><Plus className="mr-2 h-4 w-4" /> Registrar relatório</Button>

      <div className="mt-6 space-y-2">
        {data.map((r: any) => (
          <div key={r.id} className="rounded-lg border p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium">{r.titulo}</div>
                <div className="text-xs text-muted-foreground">
                  {r.periodo ? `${r.periodo} • ` : ""}enviado em {formatDate(r.data_envio)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {r.arquivo_url && (/^https?:\/\//i.test(r.arquivo_url) ? (
                  <a href={r.arquivo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    Abrir <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => openStorageFile(r.arquivo_url)}>
                    <FileText className="mr-1 h-4 w-4" /> Abrir arquivo
                  </Button>
                ))}
                <Button variant="ghost" size="icon" onClick={() => del(r.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            {r.resumo && <p className="mt-2 text-muted-foreground">{r.resumo}</p>}
          </div>
        ))}
        {data.length === 0 && <p className="text-sm text-muted-foreground">Nenhum relatório registrado.</p>}
      </div>
    </Card>
  );
}

function BaseDadosTab({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [busca, setBusca] = useState("");
  const [f, setF] = useState({ data_registro: new Date().toISOString().slice(0, 10), resumo: "", tags: "" });

  const { data = [] } = useQuery({
    queryKey: ["client_knowledge", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_knowledge")
        .select("*")
        .eq("client_id", clientId)
        .order("data_registro", { ascending: false });
      return data ?? [];
    },
  });

  async function add() {
    if (!f.resumo.trim()) return toast.error("Descreva o que foi conversado/decidido");
    const tags = f.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const { error } = await supabase.from("client_knowledge").insert({
      client_id: clientId,
      data_registro: f.data_registro,
      resumo: f.resumo,
      tags,
      autor: user?.email ?? null,
      created_by: user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    setF({ data_registro: new Date().toISOString().slice(0, 10), resumo: "", tags: "" });
    qc.invalidateQueries({ queryKey: ["client_knowledge", clientId] });
  }
  async function del(id: string) {
    await supabase.from("client_knowledge").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["client_knowledge", clientId] });
  }

  const q = busca.trim().toLowerCase();
  const filtered = q
    ? data.filter(
        (r: any) =>
          r.resumo?.toLowerCase().includes(q) || (r.tags ?? []).some((t: string) => t.toLowerCase().includes(q)),
      )
    : data;

  return (
    <div className="mt-4 space-y-4">
      <Card className="p-6">
        <h3 className="mb-1 font-semibold">Base de Dados do Cliente</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Registro contínuo de reuniões e contatos importantes. Alimenta a IA do cliente. Use tags livres (ex: "tom de
          voz", "reclamação", "meta do cliente").
        </p>
        <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
          <Input type="date" value={f.data_registro} onChange={(e) => setF({ ...f, data_registro: e.target.value })} />
          <Input placeholder="Tags separadas por vírgula" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} />
        </div>
        <Textarea
          className="mt-2"
          rows={3}
          placeholder="Resumo do que foi dito/decidido..."
          value={f.resumo}
          onChange={(e) => setF({ ...f, resumo: e.target.value })}
        />
        <Button className="mt-3" onClick={add}><Plus className="mr-2 h-4 w-4" /> Adicionar registro</Button>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar na base de dados..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <div className="space-y-3">
        {filtered.map((r: any) => (
          <div key={r.id} className="relative rounded-lg border-l-4 border-l-primary bg-card p-4 pl-5 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between gap-2">
              <div className="text-xs font-semibold text-primary">{formatDate(r.data_registro)}</div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => del(r.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{r.resumo}</p>
            {r.tags?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {r.tags.map((t: string) => (
                  <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                ))}
              </div>
            )}
            {r.autor && <div className="mt-2 text-[10px] text-muted-foreground">por {r.autor}</div>}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">{q ? "Nenhum registro encontrado." : "Nenhum registro na base ainda."}</p>
        )}
      </div>
    </div>
  );
}
