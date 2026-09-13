import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/lib/platform/comercial";
import { WHATSAPP_MSG_CONSULTORIA, whatsappLink } from "@/lib/site/contato";

/**
 * Calculadora patrimonial — projeção puramente client-side e determinística.
 * Não grava nada, não consulta o backend e declara as premissas usadas.
 */
const OBJETIVOS = {
  moradia: { rotulo: "Morar", valorizacao: 0.06, aluguel: 0 },
  renda: { rotulo: "Gerar renda", valorizacao: 0.07, aluguel: 0.0045 },
  patrimonio: { rotulo: "Construir patrimônio", valorizacao: 0.08, aluguel: 0.004 },
} as const;

type ObjetivoKey = keyof typeof OBJETIVOS;

function projetar(renda: number, entrada: number, anos: number, objetivo: ObjetivoKey) {
  const premissa = OBJETIVOS[objetivo];
  const parcela = renda * 0.3;
  // Capacidade de aquisição: entrada + fluxo comprometido no horizonte escolhido.
  const valorAtivo = Math.max(entrada + parcela * 12 * Math.min(anos, 5), 0);

  const serie: { ano: number; valor: number; rendaAcumulada: number }[] = [];
  let valor = valorAtivo;
  let rendaAcumulada = 0;
  for (let ano = 1; ano <= anos; ano++) {
    valor = valor * (1 + premissa.valorizacao);
    if (ano > 2) rendaAcumulada += valor * premissa.aluguel * 12;
    serie.push({ ano, valor, rendaAcumulada });
  }
  return { parcela, valorAtivo, serie, premissa };
}

function paraNumero(v: string) {
  const n = Number(v.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function CalculadoraPatrimonial() {
  const [renda, setRenda] = useState("15000");
  const [entrada, setEntrada] = useState("80000");
  const [anos, setAnos] = useState("10");
  const [objetivo, setObjetivo] = useState<ObjetivoKey>("patrimonio");

  const horizonte = Math.min(Math.max(paraNumero(anos) || 10, 3), 20);
  const resultado = useMemo(
    () => projetar(paraNumero(renda), paraNumero(entrada), horizonte, objetivo),
    [renda, entrada, horizonte, objetivo],
  );

  const ultimo = resultado.serie[resultado.serie.length - 1];
  const patrimonio = (ultimo?.valor ?? 0) + (ultimo?.rendaAcumulada ?? 0);
  const maximo = Math.max(...resultado.serie.map((s) => s.valor + s.rendaAcumulada), 1);

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)]">
      <form className="panel space-y-5 p-6" onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-2">
          <Label htmlFor="calc-renda">Renda familiar mensal (R$)</Label>
          <Input
            id="calc-renda"
            inputMode="numeric"
            value={renda}
            onChange={(e) => setRenda(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="calc-entrada">Recursos disponíveis para entrada (R$)</Label>
          <Input
            id="calc-entrada"
            inputMode="numeric"
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="calc-anos">Prazo do plano (anos)</Label>
          <Input
            id="calc-anos"
            inputMode="numeric"
            value={anos}
            onChange={(e) => setAnos(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Entre 3 e 20 anos.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="calc-objetivo">Objetivo</Label>
          <Select value={objetivo} onValueChange={(v) => setObjetivo(v as ObjetivoKey)}>
            <SelectTrigger id="calc-objetivo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(OBJETIVOS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button asChild className="w-full">
          <a
            href={whatsappLink(WHATSAPP_MSG_CONSULTORIA)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="chat" size={18} />
            Validar com um especialista
          </a>
        </Button>
      </form>

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Metrica rotulo="Parcela suportável" valor={formatBRL(resultado.parcela)} />
          <Metrica rotulo="Ativo inicial estimado" valor={formatBRL(resultado.valorAtivo)} />
          <Metrica
            rotulo={`Patrimônio em ${horizonte} anos`}
            valor={formatBRL(patrimonio)}
            destaque
          />
        </div>

        <figure className="panel p-6">
          <figcaption className="t-caps text-muted-foreground">
            Projeção de patrimônio por ano
          </figcaption>
          <div
            className="mt-6 flex h-52 items-end gap-1.5"
            role="img"
            aria-label={`Projeção de patrimônio: de ${formatBRL(resultado.serie[0]?.valor ?? 0)} no ano 1 a ${formatBRL(patrimonio)} no ano ${horizonte}.`}
          >
            {resultado.serie.map((s) => {
              const total = s.valor + s.rendaAcumulada;
              return (
                <div
                  key={s.ano}
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                >
                  <div
                    className="w-full rounded-t-sm bg-primary/80 transition-all duration-500"
                    style={{ height: `${Math.max((total / maximo) * 100, 4)}%` }}
                  />
                  <span className="t-data text-[10px] text-muted-foreground">{s.ano}</span>
                </div>
              );
            })}
          </div>
          <table className="mt-6 w-full text-sm">
            <caption className="sr-only">Valores projetados por ano</caption>
            <thead>
              <tr className="text-left text-muted-foreground">
                <th scope="col" className="pb-2 font-medium">
                  Ano
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Valor do ativo
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Renda acumulada
                </th>
              </tr>
            </thead>
            <tbody className="border-t border-border">
              {resultado.serie
                .filter((s) => s.ano % 2 === 0 || s.ano === horizonte)
                .map((s) => (
                  <tr key={s.ano} className="border-b border-border/60 last:border-0">
                    <td className="py-2 t-data">{s.ano}</td>
                    <td className="py-2 t-data">{formatBRL(s.valor)}</td>
                    <td className="py-2 t-data">{formatBRL(s.rendaAcumulada)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </figure>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Icon name="info" size={14} className="mt-0.5 shrink-0" />
          Premissas explícitas: parcela de até 30% da renda, valorização anual de{" "}
          {(resultado.premissa.valorizacao * 100).toFixed(0)}% e locação de{" "}
          {(resultado.premissa.aluguel * 100).toFixed(2)}% do valor do ativo por mês a partir do
          terceiro ano. Projeção ilustrativa e determinística — não é promessa de rentabilidade nem
          análise de crédito.
        </p>
      </div>
    </div>
  );
}

function Metrica({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className={`panel p-5 ${destaque ? "gold-rule" : ""}`}>
      <p className="t-caps text-muted-foreground">{rotulo}</p>
      <p className="mt-2 font-display text-xl font-semibold tracking-tight">{valor}</p>
    </div>
  );
}
