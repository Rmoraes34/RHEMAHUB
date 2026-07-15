import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useTeam } from "@/hooks/use-team";
import { formatDate } from "@/lib/format";
import {
  WEEKDAYS,
  weekdayLabels,
  planejarConteudos,
  gerarCronograma,
  type PlanoItem,
  type EquipeOp,
} from "@/lib/operacao";

type Periodo = "primeiro_mes" | "vigencia" | "personalizado";

export function GerarCronogramaWizard({
  clientId,
  contract,
  itens,
  plan,
}: {
  clientId: string;
  contract: any;
  itens: PlanoItem[];
  plan: any | null;
}) {
  const qc = useQueryClient();
  const { data: team = [] } = useTeam();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const [periodo, setPeriodo] = useState<Periodo>("primeiro_mes");
  const [inicio, setInicio] = useState<string>(contract.data_inicio ?? "");
  const [fim, setFim] = useState<string>(contract.data_fim ?? "");

  const [prod, setProd] = useState<number[]>(plan?.dias_producao ?? [1, 2]);
  const [ed, setEd] = useState<number[]>(plan?.dias_edicao ?? [3]);
  const [pub, setPub] = useState<number[]>(plan?.dias_publicacao ?? [1, 3, 5]);
  const [equipe, setEquipe] = useState<EquipeOp>(plan?.equipe ?? {});

  useEffect(() => {
    if (!open) {
      setStep(0);
      setPeriodo("primeiro_mes");
      setInicio(contract.data_inicio ?? "");
      setFim(contract.data_fim ?? "");
      setProd(plan?.dias_producao ?? [1, 2]);
      setEd(plan?.dias_edicao ?? [3]);
      setPub(plan?.dias_publicacao ?? [1, 3, 5]);
      setEquipe(plan?.equipe ?? {});
    }
  }, [open, plan?.id]);

  function resolvePeriodo(): { start: Date; end: Date } | null {
    if (!contract.data_inicio) {
      toast.error("O contrato não tem data de início.");
      return null;
    }
    const cInicio = new Date(contract.data_inicio + "T00:00:00");
    const cFim = contract.data_fim ? new Date(contract.data_fim + "T00:00:00") : new Date(cInicio.getFullYear() + 1, cInicio.getMonth(), cInicio.getDate());
    if (periodo === "primeiro_mes") {
      const end = new Date(cInicio);
      end.setMonth(end.getMonth() + 1);
      end.setDate(end.getDate() - 1);
      return { start: cInicio, end: end > cFim ? cFim : end };
    }
    if (periodo === "vigencia") {
      return { start: cInicio, end: cFim };
    }
    if (!inicio || !fim) {
      toast.error("Informe as datas do período personalizado.");
      return null;
    }
    return { start: new Date(inicio + "T00:00:00"), end: new Date(fim + "T00:00:00") };
  }

  const range = resolvePeriodo();
  const previewRows = range
    ? planejarConteudos({ itens, diasProducao: prod, diasEdicao: ed, diasPublicacao: pub, dataInicio: range.start, dataFim: range.end })
    : [];

  async function confirmar() {
    if (!range) return;
    if (!itens.length) return toast.error("Cadastre entregáveis antes.");
    if (!pub.length) return toast.error("Selecione ao menos um dia de publicação.");
    setBusy(true);
    // Salva plano com dias + equipe.
    const planPayload = {
      client_id: clientId,
      contract_id: contract.id,
      itens,
      dias_producao: prod,
      dias_edicao: ed,
      dias_publicacao: pub,
      equipe,
    };
    if (plan) {
      await supabase.from("deliverables_plan").update(planPayload).eq("id", plan.id);
    } else {
      await supabase.from("deliverables_plan").insert(planPayload);
    }
    const { count, error } = await gerarCronograma({
      clientId,
      contractId: contract.id,
      itens,
      equipe,
      diasProducao: prod,
      diasEdicao: ed,
      diasPublicacao: pub,
      dataInicio: range.start,
      dataFim: range.end,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${count} conteúdo(s) gerado(s)`);
    setOpen(false);
    qc.invalidateQueries();
  }

  const disabledNext =
    (step === 0 && periodo === "personalizado" && (!inicio || !fim)) ||
    (step === 1 && (!prod.length || !ed.length || !pub.length));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Wand2 className="mr-2 h-4 w-4" /> Gerar Cronograma</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar cronograma — {contract.titulo}</DialogTitle>
        </DialogHeader>

        <Stepper step={step} labels={["Período", "Dias da semana", "Equipe", "Prévia"]} />

        {step === 0 && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Vigência do contrato: {formatDate(contract.data_inicio)} — {contract.data_fim ? formatDate(contract.data_fim) : "sem término"}
            </p>
            <RadioGroup value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)} className="space-y-2">
              <Radio value="primeiro_mes" label="Gerar apenas o primeiro mês do contrato" />
              <Radio value="vigencia" label="Gerar toda a vigência do contrato" />
              <Radio value="personalizado" label="Período personalizado (dentro da vigência)" />
            </RadioGroup>
            {periodo === "personalizado" && (
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Início</Label><Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
                <div><Label className="text-xs">Fim</Label><Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <WeekdayPicker label="Dias de Produção" value={prod} onChange={setProd} />
            <WeekdayPicker label="Dias de Edição" value={ed} onChange={setEd} />
            <WeekdayPicker label="Dias de Publicação" value={pub} onChange={setPub} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Colaboradores carregados do módulo Equipe. Serão o padrão para todos os conteúdos deste cronograma — podem ser alterados individualmente depois.
            </p>
            <Section title="Produção">
              <PersonSelect team={team} label="Copywriter" value={equipe.copywriter} onChange={(v) => setEquipe({ ...equipe, copywriter: v })} />
              <PersonSelect team={team} label="Videomaker" value={equipe.videomaker} onChange={(v) => setEquipe({ ...equipe, videomaker: v })} />
              <PersonSelect team={team} label="Designer" value={equipe.designer} onChange={(v) => setEquipe({ ...equipe, designer: v })} />
            </Section>
            <Section title="Edição">
              <PersonSelect team={team} label="Editor" value={equipe.editor} onChange={(v) => setEquipe({ ...equipe, editor: v })} />
            </Section>
            <Section title="Postagens">
              <PersonSelect team={team} label="Social Media" value={equipe.social_media} onChange={(v) => setEquipe({ ...equipe, social_media: v })} />
            </Section>
          </div>
        )}

        {step === 3 && range && (
          <Preview
            contract={contract}
            range={range}
            itens={itens}
            equipe={equipe}
            team={team}
            prod={prod}
            ed={ed}
            pub={pub}
            total={previewRows.length}
          />
        )}

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={disabledNext}>
              Avançar <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={confirmar} disabled={busy}>
              {busy ? "Gerando..." : "Confirmar e Gerar Cronograma"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stepper({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div className="mb-4 flex items-center gap-1 text-xs">
      {labels.map((l, i) => (
        <div key={l} className="flex items-center gap-1">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full font-semibold ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-primary/40 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
          <span className={i === step ? "font-semibold" : "text-muted-foreground"}>{l}</span>
          {i < labels.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
        </div>
      ))}
    </div>
  );
}

function Radio({ value, label }: { value: string; label: string }) {
  return (
    <label className="flex items-center gap-2 rounded border p-2 text-sm hover:bg-muted/50">
      <RadioGroupItem value={value} /> {label}
    </label>
  );
}

function WeekdayPicker({ label, value, onChange }: { label: string; value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div>
      <Label className="mb-2 block text-xs font-semibold uppercase">{label}</Label>
      <div className="flex flex-wrap gap-3">
        {WEEKDAYS.map((d) => (
          <label key={d.value} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={value.includes(d.value)}
              onCheckedChange={() => onChange(value.includes(d.value) ? value.filter((x) => x !== d.value) : [...value, d.value].sort())}
            />
            {d.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{title}</div>
      <div className="grid gap-2 sm:grid-cols-3">{children}</div>
    </div>
  );
}

function PersonSelect({
  team, label, value, onChange,
}: { team: any[]; label: string; value: string | null | undefined; onChange: (v: string | null) => void }) {
  return (
    <div>
      <Label className="mb-1 block text-xs">{label}</Label>
      <Select value={value ?? "none"} onValueChange={(v) => onChange(v === "none" ? null : v)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">—</SelectItem>
          {team.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function Preview({ contract, range, itens, equipe, team, prod, ed, pub, total }: any) {
  const nome = (id?: string | null) => team.find((t: any) => t.id === id)?.nome ?? "—";
  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
      <Row label="Contrato" value={contract.titulo} />
      <Row label="Período" value={`${formatDate(range.start.toISOString().slice(0, 10))} — ${formatDate(range.end.toISOString().slice(0, 10))}`} />
      <div>
        <div className="font-semibold">Conteúdos ({total})</div>
        <ul className="ml-4 list-disc text-muted-foreground">
          {itens.map((i: PlanoItem, k: number) => <li key={k}>{i.quantidade} × {i.tipo}</li>)}
        </ul>
      </div>
      <div>
        <div className="font-semibold">Equipe</div>
        <ul className="ml-4 list-disc text-muted-foreground">
          <li>Produção: {[equipe.copywriter && `Copy: ${nome(equipe.copywriter)}`, equipe.videomaker && `Video: ${nome(equipe.videomaker)}`, equipe.designer && `Design: ${nome(equipe.designer)}`].filter(Boolean).join(" • ") || "—"}</li>
          <li>Edição: {equipe.editor ? nome(equipe.editor) : "—"}</li>
          <li>Postagens: {equipe.social_media ? nome(equipe.social_media) : "—"}</li>
        </ul>
      </div>
      <div>
        <div className="font-semibold">Cronograma</div>
        <ul className="ml-4 list-disc text-muted-foreground">
          <li>Produção: {weekdayLabels(prod) || "—"}</li>
          <li>Edição: {weekdayLabels(ed) || "—"}</li>
          <li>Publicação: {weekdayLabels(pub) || "—"}</li>
        </ul>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-24 font-semibold">{label}:</span>
      <span className="text-muted-foreground">{value}</span>
    </div>
  );
}
