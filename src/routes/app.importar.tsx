import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSession } from "@/hooks/use-session";
import {
  importOpportunities,
  importPeople,
  importReservations,
  importVisits,
} from "@/lib/platform/import.functions";
import {
  CSV_MODELO,
  CSV_MODELO_OPORTUNIDADES,
  CSV_MODELO_RESERVAS,
  CSV_MODELO_VISITAS,
  IMPORT_FIELDS,
  IMPORT_ENTIDADES,
  IMPORT_MAX_LINHAS,
  OPP_FIELDS,
  RESERVA_FIELDS,
  VISIT_FIELDS,
  autoMapear,
  autoMapearOportunidades,
  autoMapearReservas,
  autoMapearVisitas,
  camposFaltando,
  camposFaltandoOportunidade,
  camposFaltandoReserva,
  camposFaltandoVisita,
  importEntidadeLabels,
  importFieldLabels,
  montarPlano,
  montarPlanoOportunidades,
  montarPlanoReservas,
  montarPlanoVisitas,
  oppFieldLabels,
  parseCsv,
  reservaFieldLabels,
  visitFieldLabels,
  type ImportEntidade,
  type MapaColunas,
  type MapaColunasOpp,
  type MapaColunasReserva,
  type MapaColunasVisita,
} from "@/lib/platform/import";
import { LEAD_ORIGENS, origemLabels, type LeadOrigem } from "@/lib/platform/comercial";

export const Route = createFileRoute("/app/importar")({
  head: () => ({
    meta: [
      { title: "Importar pessoas — Ferragano One" },
      {
        name: "description",
        content:
          "Import Wizard: traga sua carteira de clientes por CSV com mapeamento de colunas, validação e deduplicação antes de gravar.",
      },
      { property: "og:title", content: "Importar pessoas — Ferragano One" },
      {
        property: "og:description",
        content: "Migre sua carteira para o modelo canônico de pessoas em quatro passos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImportarPage,
});

const PASSOS = ["Arquivo", "Mapeamento", "Validação", "Resultado"] as const;
const LOTE = 200;

type Resultado = {
  recebidas: number;
  criadas: number;
  duplicadas: { linha: number; nome: string; motivo: string }[];
  falhas: { linha: number; nome: string; motivo: string }[];
};

function ImportarPage() {
  const session = useSession();
  const workspaceId = session.data?.workspace?.id ?? null;
  const enviar = useServerFn(importPeople);
  const enviarOportunidades = useServerFn(importOpportunities);
  const enviarVisitas = useServerFn(importVisits);
  const enviarReservas = useServerFn(importReservations);
  const inputRef = useRef<HTMLInputElement>(null);

  const [passo, setPasso] = useState(0);
  const [entidade, setEntidade] = useState<ImportEntidade>("pessoas");
  const [texto, setTexto] = useState("");
  const [mapa, setMapa] = useState<MapaColunas>({});
  const [mapaOpp, setMapaOpp] = useState<MapaColunasOpp>({});
  const [mapaVisita, setMapaVisita] = useState<MapaColunasVisita>({});
  const [mapaReserva, setMapaReserva] = useState<MapaColunasReserva>({});
  const [origemPadrao, setOrigemPadrao] = useState<LeadOrigem | "nenhuma">("nenhuma");
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const tabela = useMemo(
    () => (texto.trim() ? parseCsv(texto) : { headers: [], rows: [] }),
    [texto],
  );
  const planoPessoas = useMemo(() => montarPlano(tabela, mapa), [tabela, mapa]);
  const planoOpp = useMemo(() => montarPlanoOportunidades(tabela, mapaOpp), [tabela, mapaOpp]);
  const planoVisitas = useMemo(() => montarPlanoVisitas(tabela, mapaVisita), [tabela, mapaVisita]);
  const planoReservas = useMemo(
    () => montarPlanoReservas(tabela, mapaReserva),
    [tabela, mapaReserva],
  );
  const ehPessoas = entidade === "pessoas";
  const ehOportunidades = entidade === "oportunidades";
  const ehVisitas = entidade === "visitas";
  const ehReservas = entidade === "reservas";
  const plano = ehPessoas
    ? planoPessoas
    : ehOportunidades
      ? planoOpp
      : ehVisitas
        ? planoVisitas
        : planoReservas;
  const faltando = ehPessoas
    ? camposFaltando(mapa).map((c) => importFieldLabels[c])
    : ehOportunidades
      ? camposFaltandoOportunidade(mapaOpp)
      : ehVisitas
        ? camposFaltandoVisita(mapaVisita)
        : camposFaltandoReserva(mapaReserva);
  const campos: { chave: string; label: string; obrigatorio: boolean }[] = ehPessoas
    ? IMPORT_FIELDS.map((c) => ({
        chave: c,
        label: importFieldLabels[c],
        obrigatorio: c === "nome",
      }))
    : ehOportunidades
      ? OPP_FIELDS.map((c) => ({ chave: c, label: oppFieldLabels[c], obrigatorio: false }))
      : ehVisitas
        ? VISIT_FIELDS.map((c) => ({
            chave: c,
            label: visitFieldLabels[c],
            obrigatorio: c === "data",
          }))
        : RESERVA_FIELDS.map((c) => ({
            chave: c,
            label: reservaFieldLabels[c],
            obrigatorio: c === "unidade" || c === "expira_em",
          }));
  const modelo = ehPessoas
    ? CSV_MODELO
    : ehOportunidades
      ? CSV_MODELO_OPORTUNIDADES
      : ehVisitas
        ? CSV_MODELO_VISITAS
        : CSV_MODELO_RESERVAS;
  const rotuloEntidade = ehPessoas
    ? "pessoa(s)"
    : ehOportunidades
      ? "oportunidade(s)"
      : ehVisitas
        ? "visita(s)"
        : "reserva(s)";
  const mapaAtual: Record<string, number | undefined> = ehPessoas
    ? mapa
    : ehOportunidades
      ? mapaOpp
      : ehVisitas
        ? mapaVisita
        : mapaReserva;

  function carregarTexto(conteudo: string) {
    setTexto(conteudo);
    const lida = parseCsv(conteudo);
    setMapa(autoMapear(lida.headers));
    setMapaOpp(autoMapearOportunidades(lida.headers));
    setMapaVisita(autoMapearVisitas(lida.headers));
    setMapaReserva(autoMapearReservas(lida.headers));
    setResultado(null);
    setPasso(lida.headers.length ? 1 : 0);
  }

  async function onArquivo(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo acima de 5 MB. Divida a planilha em partes.");
      return;
    }
    carregarTexto(await file.text());
  }

  const importacao = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("Workspace não identificado.");
      const lotes: Resultado = { recebidas: 0, criadas: 0, duplicadas: [], falhas: [] };
      const origem = origemPadrao === "nenhuma" ? null : origemPadrao;
      const validas = ehPessoas
        ? planoPessoas.validas
        : ehOportunidades
          ? planoOpp.validas
          : ehVisitas
            ? planoVisitas.validas
            : planoReservas.validas;
      for (let i = 0; i < validas.length; i += LOTE) {
        const parcial = ehPessoas
          ? await enviar({
              data: {
                workspaceId,
                origemPadrao: origem,
                linhas: planoPessoas.validas.slice(i, i + LOTE).map((l) => ({
                  linha: l.linha,
                  nome: l.nome,
                  documento: l.documento,
                  email: l.email,
                  telefone: l.telefone,
                  tipo: l.tipo,
                  origem: l.origem,
                  observacao: l.observacao,
                })),
              },
            })
          : ehOportunidades
            ? await enviarOportunidades({
                data: {
                  workspaceId,
                  origemPadrao: origem,
                  linhas: planoOpp.validas.slice(i, i + LOTE).map((l) => ({
                    linha: l.linha,
                    documento: l.documento,
                    email: l.email,
                    pessoa: l.pessoa,
                    titulo: l.titulo,
                    valor: l.valor,
                    estagio: l.estagio,
                    temperatura: l.temperatura,
                    origem: l.origem,
                    proximaAcao: l.proximaAcao,
                    observacao: l.observacao,
                  })),
                },
              })
            : ehVisitas
              ? await enviarVisitas({
                  data: {
                    workspaceId,
                    linhas: planoVisitas.validas.slice(i, i + LOTE).map((l) => ({
                      linha: l.linha,
                      documento: l.documento,
                      email: l.email,
                      pessoa: l.pessoa,
                      empreendimento: l.empreendimento,
                      data: l.data ?? new Date().toISOString(),
                      status: l.status,
                      nota: l.nota,
                      feedback: l.feedback,
                    })),
                  },
                })
              : await enviarReservas({
                  data: {
                    workspaceId,
                    linhas: planoReservas.validas.slice(i, i + LOTE).map((l) => ({
                      linha: l.linha,
                      documento: l.documento,
                      email: l.email,
                      pessoa: l.pessoa,
                      empreendimento: l.empreendimento,
                      unidade: l.unidade,
                      expiraEm: l.expiraEm ?? new Date().toISOString(),
                      valor: l.valor,
                      status: l.status,
                      observacao: l.observacao,
                    })),
                  },
                });
        lotes.recebidas += parcial.recebidas;
        lotes.criadas += parcial.criadas;
        lotes.duplicadas.push(...parcial.duplicadas);
        lotes.falhas.push(...parcial.falhas);
      }
      return lotes;
    },
    onSuccess: (dados) => {
      setResultado(dados);
      setPasso(3);
      toast.success(`${dados.criadas} ${rotuloEntidade} importada(s).`);
    },
    onError: (erro: Error) => toast.error(erro.message),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Importar dados</h1>
          <p className="text-sm text-muted-foreground">
            Traga a carteira por CSV — pessoas, oportunidades ou visitas. Validamos, deduplicamos e
            gravamos no modelo canônico — até {IMPORT_MAX_LINHAS} linhas por importação.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/app/pessoas">
            <Icon name="contacts" className="mr-2" aria-hidden="true" />
            Ver pessoas
          </Link>
        </Button>
      </header>

      <ol className="flex flex-wrap gap-2" aria-label="Etapas da importação">
        {PASSOS.map((nome, indice) => (
          <li key={nome}>
            <Badge
              variant={indice === passo ? "default" : indice < passo ? "secondary" : "outline"}
            >
              {indice + 1}. {nome}
            </Badge>
          </li>
        ))}
      </ol>

      {passo === 0 && (
        <section className="space-y-4 rounded-lg border bg-card p-5">
          <div className="space-y-1.5 sm:max-w-xs">
            <Label htmlFor="entidade">O que você vai importar</Label>
            <Select
              value={entidade}
              onValueChange={(valor) => {
                setEntidade(valor as ImportEntidade);
                setResultado(null);
              }}
            >
              <SelectTrigger id="entidade">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMPORT_ENTIDADES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {importEntidadeLabels[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!ehPessoas && (
              <p className="text-xs text-muted-foreground">
                O registro é vinculado a uma pessoa já cadastrada (documento, e-mail ou nome).
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="arquivo-csv">Arquivo CSV</Label>
            <input
              ref={inputRef}
              id="arquivo-csv"
              type="file"
              accept=".csv,text/csv,text/plain"
              className="block w-full cursor-pointer rounded-md border bg-background p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onArquivo(file);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-colado">Ou cole o conteúdo</Label>
            <Textarea
              id="csv-colado"
              rows={6}
              placeholder={modelo}
              onChange={(e) => setTexto(e.target.value)}
              value={texto}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => carregarTexto(texto)}
                disabled={!texto.trim()}
                aria-label="Ler conteúdo colado"
              >
                Ler conteúdo
              </Button>
              <Button variant="ghost" onClick={() => carregarTexto(modelo)}>
                Usar planilha de exemplo
              </Button>
            </div>
          </div>
        </section>
      )}

      {passo === 1 && (
        <section className="space-y-4 rounded-lg border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            {tabela.rows.length} linha(s) detectada(s). Confirme para onde vai cada coluna.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {campos.map(({ chave, label, obrigatorio }) => (
              <div key={chave} className="space-y-1.5">
                <Label htmlFor={`campo-${chave}`}>
                  {label}
                  {obrigatorio && <span className="text-destructive"> *</span>}
                </Label>
                <Select
                  value={mapaAtual[chave] === undefined ? "nenhuma" : String(mapaAtual[chave])}
                  onValueChange={(valor) => {
                    const aplicar = <T extends Record<string, number | undefined>>(atual: T): T => {
                      const proximo = { ...atual } as Record<string, number | undefined>;
                      if (valor === "nenhuma") delete proximo[chave];
                      else proximo[chave] = Number(valor);
                      return proximo as T;
                    };
                    if (ehPessoas) setMapa(aplicar);
                    else if (ehOportunidades) setMapaOpp(aplicar);
                    else if (ehVisitas) setMapaVisita(aplicar);
                    else setMapaReserva(aplicar);
                  }}
                >
                  <SelectTrigger id={`campo-${chave}`}>
                    <SelectValue placeholder="Não importar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhuma">Não importar</SelectItem>
                    {tabela.headers.map((header, indice) => (
                      <SelectItem key={`${header}-${indice}`} value={String(indice)}>
                        {header || `Coluna ${indice + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {(ehPessoas || ehOportunidades) && (
            <div className="space-y-1.5 sm:max-w-xs">
              <Label htmlFor="origem-padrao">Origem padrão (quando a linha não trouxer)</Label>
              <Select
                value={origemPadrao}
                onValueChange={(valor) => setOrigemPadrao(valor as LeadOrigem | "nenhuma")}
              >
                <SelectTrigger id="origem-padrao">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Sem origem</SelectItem>
                  {LEAD_ORIGENS.map((origem) => (
                    <SelectItem key={origem} value={origem}>
                      {origemLabels[origem]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {faltando.length > 0 && (
            <p className="text-sm text-destructive" role="alert">
              Mapeie os campos obrigatórios: {faltando.join(", ")}.
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPasso(0)}>
              Voltar
            </Button>
            <Button onClick={() => setPasso(2)} disabled={faltando.length > 0}>
              Validar
            </Button>
          </div>
        </section>
      )}

      {passo === 2 && (
        <section className="space-y-4 rounded-lg border bg-card p-5">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="secondary">{plano.total} linha(s)</Badge>
            <Badge>{plano.validas.length} prontas</Badge>
            {plano.invalidas.length > 0 && (
              <Badge variant="destructive">{plano.invalidas.length} com erro</Badge>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Linha</TableHead>
                  <TableHead scope="col">{ehPessoas ? "Nome" : "Pessoa"}</TableHead>
                  <TableHead scope="col">
                    {ehPessoas
                      ? "Documento"
                      : ehOportunidades
                        ? "Título"
                        : ehVisitas
                          ? "Empreendimento"
                          : "Unidade"}
                  </TableHead>
                  <TableHead scope="col">
                    {ehPessoas
                      ? "E-mail"
                      : ehOportunidades
                        ? "Valor"
                        : ehVisitas
                          ? "Data"
                          : "Validade"}
                  </TableHead>
                  <TableHead scope="col">
                    {ehPessoas ? "Telefone" : ehOportunidades ? "Etapa" : "Situação"}
                  </TableHead>
                  <TableHead scope="col">Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(ehPessoas
                  ? [...planoPessoas.invalidas, ...planoPessoas.validas].slice(0, 50).map((l) => ({
                      linha: l.linha,
                      a: l.nome,
                      b: l.documento,
                      c: l.email,
                      d: l.telefone,
                      erros: l.erros,
                      avisos: l.avisos,
                    }))
                  : ehOportunidades
                    ? [...planoOpp.invalidas, ...planoOpp.validas].slice(0, 50).map((l) => ({
                        linha: l.linha,
                        a: l.pessoa || l.email || l.documento,
                        b: l.titulo,
                        c:
                          l.valor === null || l.valor === undefined
                            ? ""
                            : l.valor.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }),
                        d: l.estagio,
                        erros: l.erros,
                        avisos: l.avisos,
                      }))
                    : ehVisitas
                      ? [...planoVisitas.invalidas, ...planoVisitas.validas]
                          .slice(0, 50)
                          .map((l) => ({
                            linha: l.linha,
                            a: l.pessoa || l.email || l.documento,
                            b: l.empreendimento,
                            c: l.data ? new Date(l.data).toLocaleString("pt-BR") : "",
                            d: l.status,
                            erros: l.erros,
                            avisos: l.avisos,
                          }))
                      : [...planoReservas.invalidas, ...planoReservas.validas]
                          .slice(0, 50)
                          .map((l) => ({
                            linha: l.linha,
                            a: l.pessoa || l.email || l.documento,
                            b: l.empreendimento ? `${l.unidade} — ${l.empreendimento}` : l.unidade,
                            c: l.expiraEm ? new Date(l.expiraEm).toLocaleDateString("pt-BR") : "",
                            d: l.status,
                            erros: l.erros,
                            avisos: l.avisos,
                          }))
                ).map((linha) => (
                  <TableRow key={linha.linha}>
                    <TableCell>{linha.linha}</TableCell>
                    <TableCell className="font-medium">{linha.a || "—"}</TableCell>
                    <TableCell>{linha.b || "—"}</TableCell>
                    <TableCell>{linha.c || "—"}</TableCell>
                    <TableCell>{linha.d || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {linha.erros.length ? (
                        <span className="text-destructive">{linha.erros.join(" ")}</span>
                      ) : linha.avisos.length ? (
                        <span className="text-muted-foreground">{linha.avisos.join(" ")}</span>
                      ) : (
                        <span className="text-muted-foreground">Pronta</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {plano.total > 50 && (
            <p className="text-xs text-muted-foreground">
              Exibindo as 50 primeiras linhas. A importação processa todas as válidas.
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPasso(1)}>
              Ajustar mapeamento
            </Button>
            <Button
              onClick={() => importacao.mutate()}
              disabled={!plano.validas.length || importacao.isPending || !workspaceId}
            >
              {importacao.isPending
                ? "Importando…"
                : `Importar ${plano.validas.length} ${rotuloEntidade}`}
            </Button>
          </div>
        </section>
      )}

      {passo === 3 && resultado && (
        <section className="space-y-4 rounded-lg border bg-card p-5">
          <div className="flex flex-wrap gap-2">
            <Badge>{resultado.criadas} criadas</Badge>
            <Badge variant="secondary">{resultado.duplicadas.length} duplicadas</Badge>
            {resultado.falhas.length > 0 && (
              <Badge variant="destructive">{resultado.falhas.length} falhas</Badge>
            )}
          </div>

          {[...resultado.duplicadas, ...resultado.falhas].length > 0 && (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {[...resultado.duplicadas, ...resultado.falhas].slice(0, 30).map((item) => (
                <li key={`${item.linha}-${item.motivo}`}>
                  Linha {item.linha} — {item.nome}: {item.motivo}
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <Button asChild>
              <Link
                to={
                  ehPessoas
                    ? "/app/pessoas"
                    : ehOportunidades
                      ? "/app/oportunidades"
                      : ehVisitas
                        ? "/app/agenda"
                        : "/app/oportunidades"
                }
              >
                Ver {rotuloEntidade} importada(s)
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setTexto("");
                setMapa({});
                setMapaOpp({});
                setMapaVisita({});
                setMapaReserva({});
                setResultado(null);
                setPasso(0);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              Nova importação
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
