import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  emitirDesafioConsultoria,
  submitConsultoria,
} from "@/lib/site/consultoria.functions";
import type { Idioma } from "@/lib/site/i18n";
import { textos } from "@/lib/site/i18n-textos";

/**
 * Formulário de consultoria com validação (cliente e servidor) e captcha
 * assinado no servidor. O envio grava o lead no CRM e notifica o responsável.
 * `idioma` traduz rótulos, erros e avisos — as regras de validação não mudam.
 */

function montarSchema(idioma: Idioma) {
  const f = textos(idioma).form;
  return z.object({
    nome: z.string().trim().min(2, f.erroNome).max(120),
    email: z.string().trim().email(f.erroEmail).max(160),
    telefone: z
      .string()
      .trim()
      .min(10, f.erroTelefone)
      .max(30)
      .regex(/^[\d\s()+-]+$/, f.erroTelefone),
    objetivo: z.enum(["primeiro-imovel", "investimento", "troca", "carreira"]),
    mensagem: z.string().trim().max(1000),
    captchaResposta: z.string().trim().regex(/^\d{1,3}$/, f.erroCaptcha),
  });
}

type Campos = z.infer<ReturnType<typeof montarSchema>>;
type Erros = Partial<Record<keyof Campos, string>>;

const VAZIO: Campos = {
  nome: "",
  email: "",
  telefone: "",
  objetivo: "primeiro-imovel",
  mensagem: "",
  captchaResposta: "",
};

export function FormularioConsultoria({
  id,
  idioma = "pt",
}: {
  id?: string;
  idioma?: Idioma;
}) {
  const f = textos(idioma).form;
  const OBJETIVOS = [
    { valor: "primeiro-imovel", rotulo: f.objetivos.primeiro },
    { valor: "investimento", rotulo: f.objetivos.investimento },
    { valor: "troca", rotulo: f.objetivos.troca },
    { valor: "carreira", rotulo: f.objetivos.carreira },
  ] as const;
  const isca = useRef<HTMLInputElement>(null);
  const pedirDesafio = useServerFn(emitirDesafioConsultoria);
  const enviar = useServerFn(submitConsultoria);
  const [form, setForm] = useState<Campos>(VAZIO);
  const [erros, setErros] = useState<Erros>({});
  const [enviado, setEnviado] = useState(false);
  const [desafio, setDesafio] = useState<{ pergunta: string; token: string } | null>(null);

  const carregarDesafio = useCallback(() => {
    pedirDesafio()
      .then(setDesafio)
      .catch(() => setDesafio(null));
  }, [pedirDesafio]);

  useEffect(() => {
    carregarDesafio();
  }, [carregarDesafio]);

  const mutation = useMutation({
    mutationFn: (dados: Campos) =>
      enviar({
        data: {
          nome: dados.nome,
          email: dados.email,
          telefone: dados.telefone,
          objetivo: dados.objetivo,
          mensagem: dados.mensagem,
          captchaToken: desafio!.token,
          captchaResposta: dados.captchaResposta,
          rota: typeof window === "undefined" ? "/" : window.location.pathname,
          isca: isca.current?.value ?? "",
        },
      }),
    onSuccess: () => {
      setEnviado(true);
      setForm(VAZIO);
      setErros({});
      toast.success(f.toastSucesso);
    },
    onError: (e: Error) => {
      toast.error(e.message || f.toastErro);
      setForm((f) => ({ ...f, captchaResposta: "" }));
      carregarDesafio();
    },
  });

  function alterar<K extends keyof Campos>(campo: K, valor: Campos[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    const parsed = montarSchema(idioma).safeParse(form);
    if (!parsed.success) {
      const novos: Erros = {};
      for (const issue of parsed.error.issues) {
        const campo = issue.path[0] as keyof Campos;
        if (!novos[campo]) novos[campo] = issue.message;
      }
      setErros(novos);
      return;
    }
    if (!desafio) {
      toast.error(f.verificacaoIndisponivel);
      carregarDesafio();
      return;
    }
    mutation.mutate(parsed.data);
  }

  if (enviado) {
    return (
      <div id={id} className="panel p-8 text-center">
        <Icon name="mark_email_read" size={32} className="text-gold" />
        <h3 className="mt-3 font-display text-xl font-semibold tracking-tight">
          {f.sucessoTitulo}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">{f.sucessoTexto}</p>
        <Button variant="outline" className="mt-5" onClick={() => setEnviado(false)}>
          {f.sucessoBotao}
        </Button>
      </div>
    );
  }

  return (
    <form id={id} noValidate onSubmit={submeter} className="panel relative p-6 md:p-8">
      <h3 className="font-display text-xl font-semibold tracking-tight md:text-2xl">
        {f.titulo}
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{f.lead}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Campo id="fc-nome" rotulo={f.nome} erro={erros.nome}>
          <Input
            id="fc-nome"
            value={form.nome}
            maxLength={120}
            autoComplete="name"
            aria-invalid={Boolean(erros.nome)}
            onChange={(e) => alterar("nome", e.target.value)}
          />
        </Campo>

        <Campo id="fc-tel" rotulo={f.telefone} erro={erros.telefone}>
          <Input
            id="fc-tel"
            value={form.telefone}
            maxLength={30}
            inputMode="tel"
            autoComplete="tel"
            aria-invalid={Boolean(erros.telefone)}
            onChange={(e) => alterar("telefone", e.target.value)}
          />
        </Campo>

        <Campo id="fc-email" rotulo={f.email} erro={erros.email} className="sm:col-span-2">
          <Input
            id="fc-email"
            type="email"
            value={form.email}
            maxLength={160}
            autoComplete="email"
            aria-invalid={Boolean(erros.email)}
            onChange={(e) => alterar("email", e.target.value)}
          />
        </Campo>

        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium">{f.objetivo}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {OBJETIVOS.map((o) => (
              <button
                key={o.valor}
                type="button"
                aria-pressed={form.objetivo === o.valor}
                onClick={() => alterar("objetivo", o.valor)}
                className={`h-10 rounded-full border px-4 text-sm transition-colors ${
                  form.objetivo === o.valor
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary"
                }`}
              >
                {o.rotulo}
              </button>
            ))}
          </div>
        </fieldset>

        <Campo
          id="fc-msg"
          rotulo={f.contexto}
          erro={erros.mensagem}
          className="sm:col-span-2"
        >
          <Textarea
            id="fc-msg"
            rows={3}
            maxLength={1000}
            value={form.mensagem}
            onChange={(e) => alterar("mensagem", e.target.value)}
          />
        </Campo>

        <Campo
          id="fc-captcha"
          rotulo={desafio ? `${f.verificacao} — ${desafio.pergunta}` : f.verificacao}
          erro={erros.captchaResposta}
          className="sm:col-span-2"
        >
          <div className="flex items-center gap-2">
            <Input
              id="fc-captcha"
              value={form.captchaResposta}
              maxLength={3}
              inputMode="numeric"
              autoComplete="off"
              disabled={!desafio}
              aria-invalid={Boolean(erros.captchaResposta)}
              className="max-w-[120px]"
              onChange={(e) => alterar("captchaResposta", e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                alterar("captchaResposta", "");
                carregarDesafio();
              }}
            >
              <Icon name="refresh" size={16} />
              {f.outraConta}
            </Button>
          </div>
        </Campo>
      </div>

      {/* Honeypot — invisível e fora da ordem de tabulação. */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="fc-empresa-site">Site da empresa</label>
        <input id="fc-empresa-site" ref={isca} name="empresa_site" tabIndex={-1} autoComplete="off" />
      </div>

      <Button type="submit" className="mt-6 h-11 w-full" disabled={mutation.isPending}>
        {mutation.isPending ? f.enviando : f.enviar}
      </Button>
      <p className="mt-3 text-xs text-muted-foreground">{f.privacidade}</p>
    </form>
  );
}

function Campo({
  id,
  rotulo,
  erro,
  className,
  children,
}: {
  id: string;
  rotulo: string;
  erro?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
      {erro && (
        <p role="alert" className="text-xs text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}
