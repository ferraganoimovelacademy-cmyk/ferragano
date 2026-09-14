import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitLeadPublico } from "@/lib/platform/vitrine.functions";

/**
 * Formulário público de captação. A validação real acontece no servidor —
 * aqui só evitamos ida e volta desnecessária.
 */
/** Contexto de aquisição lido do próprio navegador (rota + parâmetros utm). */
function contextoAquisicao() {
  if (typeof window === "undefined") return { rota: null as string | null, utm: {} };
  const p = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const chave of ["source", "medium", "campaign", "term", "content"]) {
    const valor = p.get(`utm_${chave}`);
    if (valor) utm[chave] = valor.slice(0, 160);
  }
  return { rota: window.location.pathname.slice(0, 160), utm };
}

export function VitrineContato({
  empreendimentoId,
  empreendimentoNome,
  landingPageId,
  unidadeId,
  ctaTexto,
  compact = false,
}: {
  empreendimentoId?: string | null;
  empreendimentoNome?: string | null;
  landingPageId?: string | null;
  unidadeId?: string | null;
  ctaTexto?: string | null;
  compact?: boolean;
}) {
  const enviar = useServerFn(submitLeadPublico);
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", mensagem: "" });
  const [enviado, setEnviado] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      enviar({
        data: {
          empreendimentoId: empreendimentoId ?? null,
          landingPageId: landingPageId ?? null,
          unidadeId: unidadeId ?? null,
          nome: form.nome.trim(),
          email: form.email.trim(),
          telefone: form.telefone.trim(),
          mensagem: form.mensagem.trim(),
          origem: "site" as const,
          ...contextoAquisicao(),
        },
      }),
    onSuccess: () => {
      setEnviado(true);
      setForm({ nome: "", email: "", telefone: "", mensagem: "" });
      toast.success("Contato enviado. Um especialista falará com você.");
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível enviar agora."),
  });

  if (enviado) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Icon name="mark_email_read" size={32} className="text-primary" />
        <h3 className="mt-3 font-display text-xl font-semibold tracking-tight">
          Recebemos seu contato
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Um especialista Ferragano retorna em breve.
        </p>
        <Button variant="outline" className="mt-5" onClick={() => setEnviado(false)}>
          Enviar outro contato
        </Button>
      </div>
    );
  }

  return (
    <form
      className="rounded-xl border border-border bg-card p-6 md:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (form.nome.trim().length < 2) return toast.error("Informe seu nome.");
        if (form.telefone.trim().length < 8) return toast.error("Informe um telefone válido.");
        mutation.mutate();
      }}
    >
      <h3 className="font-display text-xl font-semibold tracking-tight">
        {empreendimentoNome ? `Fale sobre o ${empreendimentoNome}` : "Fale com um especialista"}
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Preencha seus dados e retornamos com valores, plantas e condições.
      </p>

      <div className={`mt-6 grid gap-4 ${compact ? "" : "sm:grid-cols-2"}`}>
        <div className="grid gap-1.5">
          <Label htmlFor="vc-nome">Nome</Label>
          <Input
            id="vc-nome"
            value={form.nome}
            maxLength={120}
            required
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="vc-tel">Telefone / WhatsApp</Label>
          <Input
            id="vc-tel"
            value={form.telefone}
            maxLength={30}
            required
            inputMode="tel"
            onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
          />
        </div>
        <div className={`grid gap-1.5 ${compact ? "" : "sm:col-span-2"}`}>
          <Label htmlFor="vc-email">E-mail (opcional)</Label>
          <Input
            id="vc-email"
            type="email"
            value={form.email}
            maxLength={160}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div className={`grid gap-1.5 ${compact ? "" : "sm:col-span-2"}`}>
          <Label htmlFor="vc-msg">Mensagem (opcional)</Label>
          <Textarea
            id="vc-msg"
            rows={3}
            maxLength={1000}
            value={form.mensagem}
            onChange={(e) => setForm((f) => ({ ...f, mensagem: e.target.value }))}
          />
        </div>
      </div>

      <Button type="submit" className="mt-6 h-11 w-full" disabled={mutation.isPending}>
        {mutation.isPending ? "Enviando..." : (ctaTexto ?? "Quero falar com um especialista")}
      </Button>
    </form>
  );
}
