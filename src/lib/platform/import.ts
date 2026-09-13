/**
 * FASE 1 — GATE P04: Import Wizard.
 * Camada pura (client-safe e testável): parse de CSV, mapeamento de colunas,
 * normalização e validação. Nenhum acesso a dados aqui — gravação fica em
 * `import.functions.ts`.
 */
import {
  LEAD_ESTAGIOS,
  LEAD_ORIGENS,
  LEAD_TEMPERATURAS,
  type LeadEstagio,
  type LeadOrigem,
  type LeadTemperatura,
} from "./comercial";

import { RESERVATION_STATUS, VISIT_STATUS, type ReservationStatus, type VisitStatus } from "./sales";

/** Entidades suportadas pelo wizard. */
export const IMPORT_ENTIDADES = ["pessoas", "oportunidades", "visitas", "reservas"] as const;
export type ImportEntidade = (typeof IMPORT_ENTIDADES)[number];

export const importEntidadeLabels: Record<ImportEntidade, string> = {
  pessoas: "Pessoas",
  oportunidades: "Oportunidades",
  visitas: "Visitas",
  reservas: "Reservas",
};

export const IMPORT_FIELDS = [
  "nome",
  "documento",
  "email",
  "telefone",
  "tipo",
  "origem",
  "observacao",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

export const importFieldLabels: Record<ImportField, string> = {
  nome: "Nome",
  documento: "CPF / CNPJ",
  email: "E-mail",
  telefone: "Telefone / WhatsApp",
  tipo: "Tipo (física/jurídica)",
  origem: "Origem do lead",
  observacao: "Observação",
};

export const IMPORT_REQUIRED_FIELDS: ImportField[] = ["nome"];

/** Sinônimos aceitos no cabeçalho para o mapeamento automático. */
const SINONIMOS: Record<ImportField, string[]> = {
  nome: ["nome", "name", "cliente", "razao social", "razão social", "nome completo"],
  documento: ["documento", "cpf", "cnpj", "cpf/cnpj", "doc"],
  email: ["email", "e-mail", "mail"],
  telefone: ["telefone", "fone", "celular", "whatsapp", "whats", "phone"],
  tipo: ["tipo", "pessoa", "tipo pessoa"],
  origem: ["origem", "fonte", "source", "canal"],
  observacao: ["observacao", "observação", "obs", "notas", "anotacoes", "anotações"],
};

export type CsvTabela = { headers: string[]; rows: string[][] };

const normalizar = (valor: string) =>
  valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Detecta `,` ou `;` observando a primeira linha (fora de aspas). */
export function detectarSeparador(texto: string): "," | ";" {
  const linha = texto.split(/\r?\n/).find((l) => l.trim().length) ?? "";
  let virgulas = 0;
  let pontos = 0;
  let dentro = false;
  for (const char of linha) {
    if (char === '"') dentro = !dentro;
    else if (!dentro && char === ",") virgulas++;
    else if (!dentro && char === ";") pontos++;
  }
  return pontos > virgulas ? ";" : ",";
}

/** Parser de CSV com suporte a aspas, quebras de linha internas e escape `""`. */
export function parseCsv(texto: string, separador?: "," | ";"): CsvTabela {
  const sep = separador ?? detectarSeparador(texto);
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let dentro = false;

  const conteudo = texto.replace(/^\uFEFF/, "");
  for (let i = 0; i < conteudo.length; i++) {
    const char = conteudo[i];
    if (dentro) {
      if (char === '"') {
        if (conteudo[i + 1] === '"') {
          campo += '"';
          i++;
        } else dentro = false;
      } else campo += char;
      continue;
    }
    if (char === '"') dentro = true;
    else if (char === sep) {
      linha.push(campo);
      campo = "";
    } else if (char === "\n") {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else if (char !== "\r") campo += char;
  }
  if (campo.length || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }

  const uteis = linhas.filter((l) => l.some((c) => c.trim().length));
  if (!uteis.length) return { headers: [], rows: [] };

  const headers = uteis[0].map((h) => h.trim());
  return { headers, rows: uteis.slice(1) };
}

export type MapaColunas = Partial<Record<ImportField, number>>;

/** Mapeamento automático por sinônimo de cabeçalho. */
export function autoMapear(headers: string[]): MapaColunas {
  const mapa: MapaColunas = {};
  const normalizados = headers.map(normalizar);
  for (const campo of IMPORT_FIELDS) {
    const alvo = SINONIMOS[campo].map(normalizar);
    const indice = normalizados.findIndex((h) => h.length > 0 && alvo.includes(h));
    if (indice >= 0 && !Object.values(mapa).includes(indice)) mapa[campo] = indice;
  }
  return mapa;
}

export const somenteDigitos = (valor: string) => valor.replace(/\D/g, "");

export function documentoValido(valor: string): boolean {
  const digitos = somenteDigitos(valor);
  return digitos.length === 11 || digitos.length === 14;
}

export function emailValido(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor.trim());
}

export function telefoneValido(valor: string): boolean {
  const digitos = somenteDigitos(valor);
  return digitos.length >= 10 && digitos.length <= 13;
}

export function normalizarTipo(valor: string): "fisica" | "juridica" {
  const v = normalizar(valor);
  if (v.startsWith("j") || v.includes("juridica") || v.includes("pj") || v.includes("empresa")) {
    return "juridica";
  }
  return "fisica";
}

export function normalizarOrigem(valor: string): LeadOrigem | null {
  const v = normalizar(valor).replace(/[\s-]+/g, "_");
  return (LEAD_ORIGENS as readonly string[]).includes(v) ? (v as LeadOrigem) : null;
}

export type LinhaImportacao = {
  /** Número da linha no arquivo, contando o cabeçalho como 1. */
  linha: number;
  nome: string;
  documento: string;
  email: string;
  telefone: string;
  tipo: "fisica" | "juridica";
  origem: LeadOrigem | null;
  observacao: string;
  erros: string[];
  avisos: string[];
};

export type PlanoImportacao = {
  validas: LinhaImportacao[];
  invalidas: LinhaImportacao[];
  total: number;
};

/** Limite por importação — protege o worker e a experiência do usuário. */
export const IMPORT_MAX_LINHAS = 2000;

/**
 * Monta o plano de importação: normaliza, valida e marca duplicatas
 * internas do próprio arquivo (documento e e-mail).
 */
export function montarPlano(tabela: CsvTabela, mapa: MapaColunas): PlanoImportacao {
  const pegar = (row: string[], campo: ImportField) => {
    const indice = mapa[campo];
    if (indice === undefined) return "";
    return (row[indice] ?? "").trim();
  };

  const documentosVistos = new Set<string>();
  const emailsVistos = new Set<string>();
  const linhas: LinhaImportacao[] = [];

  tabela.rows.slice(0, IMPORT_MAX_LINHAS).forEach((row, indice) => {
    const nome = pegar(row, "nome");
    const documento = pegar(row, "documento");
    const email = pegar(row, "email").toLowerCase();
    const telefone = pegar(row, "telefone");
    const origemBruta = pegar(row, "origem");

    const erros: string[] = [];
    const avisos: string[] = [];

    if (nome.length < 2) erros.push("Nome obrigatório (mínimo 2 caracteres).");
    if (nome.length > 120) erros.push("Nome acima de 120 caracteres.");
    if (documento && !documentoValido(documento)) avisos.push("Documento fora do padrão CPF/CNPJ.");
    if (email && !emailValido(email)) erros.push("E-mail inválido.");
    if (telefone && !telefoneValido(telefone)) avisos.push("Telefone fora do padrão brasileiro.");
    if (origemBruta && !normalizarOrigem(origemBruta)) {
      avisos.push(`Origem "${origemBruta}" não reconhecida — será ignorada.`);
    }

    const docChave = somenteDigitos(documento);
    if (docChave) {
      if (documentosVistos.has(docChave)) erros.push("Documento repetido no arquivo.");
      else documentosVistos.add(docChave);
    }
    if (email && emailValido(email)) {
      if (emailsVistos.has(email)) erros.push("E-mail repetido no arquivo.");
      else emailsVistos.add(email);
    }

    linhas.push({
      linha: indice + 2,
      nome,
      documento,
      email,
      telefone,
      tipo: normalizarTipo(pegar(row, "tipo")),
      origem: normalizarOrigem(origemBruta),
      observacao: pegar(row, "observacao").slice(0, 2000),
      erros,
      avisos,
    });
  });

  return {
    validas: linhas.filter((l) => !l.erros.length),
    invalidas: linhas.filter((l) => l.erros.length > 0),
    total: linhas.length,
  };
}

/** Campos obrigatórios que ainda faltam mapear. */
export function camposFaltando(mapa: MapaColunas): ImportField[] {
  return IMPORT_REQUIRED_FIELDS.filter((campo) => mapa[campo] === undefined);
}

export const CSV_MODELO = [
  "nome,documento,email,telefone,tipo,origem,observacao",
  "Carlos Ferragano,123.456.789-09,carlos@exemplo.com.br,(41) 99999-0000,fisica,indicacao,Cliente da carteira antiga",
  "Construtora Exemplo LTDA,12.345.678/0001-95,contato@exemplo.com.br,(41) 3333-0000,juridica,site,Parceria comercial",
].join("\n");

/* =========================================================================
 * Oportunidades — a identidade nunca é duplicada: a linha só aponta para uma
 * pessoa já existente (documento, e-mail ou nome exato).
 * ========================================================================= */

export const OPP_FIELDS = [
  "pessoa_documento",
  "pessoa_email",
  "pessoa_nome",
  "titulo",
  "valor",
  "estagio",
  "temperatura",
  "origem",
  "proxima_acao",
  "observacao",
] as const;
export type OppField = (typeof OPP_FIELDS)[number];

export const oppFieldLabels: Record<OppField, string> = {
  pessoa_documento: "Documento da pessoa (CPF/CNPJ)",
  pessoa_email: "E-mail da pessoa",
  pessoa_nome: "Nome da pessoa",
  titulo: "Título da oportunidade",
  valor: "Valor (R$)",
  estagio: "Etapa do funil",
  temperatura: "Temperatura",
  origem: "Origem do lead",
  proxima_acao: "Próxima ação",
  observacao: "Observação",
};

const OPP_SINONIMOS: Record<OppField, string[]> = {
  pessoa_documento: ["documento", "cpf", "cnpj", "cpf/cnpj", "doc", "documento cliente"],
  pessoa_email: ["email", "e-mail", "email cliente", "mail"],
  pessoa_nome: ["nome", "cliente", "nome cliente", "pessoa", "razao social", "razão social"],
  titulo: ["titulo", "título", "oportunidade", "negocio", "negócio", "assunto"],
  valor: ["valor", "vgv", "ticket", "preco", "preço", "valor negocio"],
  estagio: ["estagio", "estágio", "etapa", "fase", "stage", "situacao", "situação"],
  temperatura: ["temperatura", "interesse"],
  origem: ["origem", "fonte", "source", "canal"],
  proxima_acao: ["proxima acao", "próxima ação", "next step", "acao", "ação"],
  observacao: ["observacao", "observação", "obs", "notas", "anotacoes", "anotações"],
};

export type MapaColunasOpp = Partial<Record<OppField, number>>;

export function autoMapearOportunidades(headers: string[]): MapaColunasOpp {
  const mapa: MapaColunasOpp = {};
  const normalizados = headers.map(normalizar);
  for (const campo of OPP_FIELDS) {
    const alvo = OPP_SINONIMOS[campo].map(normalizar);
    const indice = normalizados.findIndex((h) => h.length > 0 && alvo.includes(h));
    if (indice >= 0 && !Object.values(mapa).includes(indice)) mapa[campo] = indice;
  }
  return mapa;
}

/** Ao menos um identificador de pessoa precisa estar mapeado. */
export function camposFaltandoOportunidade(mapa: MapaColunasOpp): string[] {
  const temPessoa =
    mapa.pessoa_documento !== undefined ||
    mapa.pessoa_email !== undefined ||
    mapa.pessoa_nome !== undefined;
  return temPessoa ? [] : ["Documento, e-mail ou nome da pessoa"];
}

/** Aceita "R$ 1.250.000,00", "1250000.00" e "1250000". */
export function parseValor(valor: string): number | null {
  const limpo = valor.replace(/[^\d.,-]/g, "").trim();
  if (!limpo) return null;
  const semMilhar = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo.replace(/,/g, "");
  const numero = Number(semMilhar);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

export function normalizarEstagio(valor: string): LeadEstagio | null {
  const v = normalizar(valor).replace(/[\s-]+/g, "_");
  if (!v) return null;
  if (v === "ganho" || v === "vendido" || v === "ganha") return "fechado";
  if (v === "perdida") return "perdido";
  return (LEAD_ESTAGIOS as readonly string[]).includes(v) ? (v as LeadEstagio) : null;
}

export function normalizarTemperatura(valor: string): LeadTemperatura | null {
  const v = normalizar(valor);
  if (!v) return null;
  return (LEAD_TEMPERATURAS as readonly string[]).includes(v) ? (v as LeadTemperatura) : null;
}

export type LinhaOportunidade = {
  linha: number;
  documento: string;
  email: string;
  pessoa: string;
  titulo: string;
  valor: number | null;
  estagio: LeadEstagio;
  temperatura: LeadTemperatura;
  origem: LeadOrigem | null;
  proximaAcao: string;
  observacao: string;
  erros: string[];
  avisos: string[];
};

export type PlanoOportunidades = {
  validas: LinhaOportunidade[];
  invalidas: LinhaOportunidade[];
  total: number;
};

export function montarPlanoOportunidades(
  tabela: CsvTabela,
  mapa: MapaColunasOpp,
): PlanoOportunidades {
  const pegar = (row: string[], campo: OppField) => {
    const indice = mapa[campo];
    if (indice === undefined) return "";
    return (row[indice] ?? "").trim();
  };

  const linhas: LinhaOportunidade[] = tabela.rows
    .slice(0, IMPORT_MAX_LINHAS)
    .map((row, indice) => {
      const documento = pegar(row, "pessoa_documento");
      const email = pegar(row, "pessoa_email").toLowerCase();
      const pessoa = pegar(row, "pessoa_nome");
      const valorBruto = pegar(row, "valor");
      const estagioBruto = pegar(row, "estagio");
      const temperaturaBruta = pegar(row, "temperatura");
      const origemBruta = pegar(row, "origem");

      const erros: string[] = [];
      const avisos: string[] = [];

      if (!documento && !email && !pessoa) {
        erros.push("Informe documento, e-mail ou nome da pessoa.");
      }
      if (documento && !documentoValido(documento)) {
        avisos.push("Documento fora do padrão CPF/CNPJ.");
      }
      if (email && !emailValido(email)) erros.push("E-mail inválido.");

      const valor = parseValor(valorBruto);
      if (valorBruto && valor === null) avisos.push("Valor não reconhecido — será ignorado.");
      if (estagioBruto && !normalizarEstagio(estagioBruto)) {
        avisos.push(`Etapa "${estagioBruto}" não reconhecida — entra como Novo.`);
      }
      if (temperaturaBruta && !normalizarTemperatura(temperaturaBruta)) {
        avisos.push(`Temperatura "${temperaturaBruta}" não reconhecida — entra como Morno.`);
      }
      if (origemBruta && !normalizarOrigem(origemBruta)) {
        avisos.push(`Origem "${origemBruta}" não reconhecida — será ignorada.`);
      }

      return {
        linha: indice + 2,
        documento,
        email,
        pessoa,
        titulo: pegar(row, "titulo").slice(0, 160),
        valor,
        estagio: normalizarEstagio(estagioBruto) ?? "novo",
        temperatura: normalizarTemperatura(temperaturaBruta) ?? "morno",
        origem: normalizarOrigem(origemBruta),
        proximaAcao: pegar(row, "proxima_acao").slice(0, 200),
        observacao: pegar(row, "observacao").slice(0, 2000),
        erros,
        avisos,
      };
    });

  return {
    validas: linhas.filter((l) => !l.erros.length),
    invalidas: linhas.filter((l) => l.erros.length > 0),
    total: linhas.length,
  };
}

export const CSV_MODELO_OPORTUNIDADES = [
  "documento,email,nome,titulo,valor,etapa,temperatura,origem,proxima ação,observacao",
  '123.456.789-09,carlos@exemplo.com.br,Carlos Ferragano,Apartamento 2 quartos,"R$ 750.000,00",proposta,quente,indicacao,Enviar proposta revisada,Negociação em andamento',
  ",contato@exemplo.com.br,Construtora Exemplo LTDA,Permuta terreno,1250000,negociacao,morno,site,Agendar reunião,",
].join("\n");
/* =========================================================================
 * Visitas — a linha aponta para uma pessoa já existente e, opcionalmente,
 * para um empreendimento pelo nome. Nada de identidade nova aqui.
 * ========================================================================= */

export const VISIT_FIELDS = [
  "pessoa_documento",
  "pessoa_email",
  "pessoa_nome",
  "empreendimento",
  "data",
  "status",
  "nota",
  "feedback",
] as const;
export type VisitField = (typeof VISIT_FIELDS)[number];

export const visitFieldLabels: Record<VisitField, string> = {
  pessoa_documento: "Documento da pessoa (CPF/CNPJ)",
  pessoa_email: "E-mail da pessoa",
  pessoa_nome: "Nome da pessoa",
  empreendimento: "Empreendimento (nome)",
  data: "Data e hora da visita",
  status: "Situação da visita",
  nota: "Nota (0 a 10)",
  feedback: "Feedback",
};

const VISIT_SINONIMOS: Record<VisitField, string[]> = {
  pessoa_documento: ["documento", "cpf", "cnpj", "cpf/cnpj", "doc", "documento cliente"],
  pessoa_email: ["email", "e-mail", "email cliente", "mail"],
  pessoa_nome: ["nome", "cliente", "nome cliente", "pessoa", "visitante"],
  empreendimento: ["empreendimento", "produto", "obra", "imovel", "imóvel", "condominio", "condomínio"],
  data: ["data", "data visita", "data da visita", "agendada para", "quando", "data hora", "horario", "horário"],
  status: ["status", "situacao", "situação", "resultado", "compareceu"],
  nota: ["nota", "avaliacao", "avaliação", "score"],
  feedback: ["feedback", "observacao", "observação", "obs", "comentario", "comentário", "notas"],
};

export type MapaColunasVisita = Partial<Record<VisitField, number>>;

export function autoMapearVisitas(headers: string[]): MapaColunasVisita {
  const mapa: MapaColunasVisita = {};
  const normalizados = headers.map(normalizar);
  for (const campo of VISIT_FIELDS) {
    const alvo = VISIT_SINONIMOS[campo].map(normalizar);
    const indice = normalizados.findIndex((h) => h.length > 0 && alvo.includes(h));
    if (indice >= 0 && !Object.values(mapa).includes(indice)) mapa[campo] = indice;
  }
  return mapa;
}

/** Pessoa e data são indispensáveis: sem data a visita não entra na agenda. */
export function camposFaltandoVisita(mapa: MapaColunasVisita): string[] {
  const faltando: string[] = [];
  const temPessoa =
    mapa.pessoa_documento !== undefined ||
    mapa.pessoa_email !== undefined ||
    mapa.pessoa_nome !== undefined;
  if (!temPessoa) faltando.push("Documento, e-mail ou nome da pessoa");
  if (mapa.data === undefined) faltando.push(visitFieldLabels.data);
  return faltando;
}

/** Aceita "31/07/2026 14:30", "31/07/2026" e ISO. Retorna ISO ou null. */
export function parseDataHora(valor: string): string | null {
  const texto = valor.trim();
  if (!texto) return null;

  const br = texto.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[\sT]+(\d{1,2}):(\d{2}))?(?::\d{2})?$/,
  );
  if (br) {
    const [, dia, mes, ano, hora = "9", minuto = "0"] = br;
    const data = new Date(
      Number(ano),
      Number(mes) - 1,
      Number(dia),
      Number(hora),
      Number(minuto),
    );
    if (Number.isNaN(data.getTime()) || data.getMonth() !== Number(mes) - 1) return null;
    return data.toISOString();
  }

  const iso = new Date(texto);
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
}

export function normalizarStatusVisita(valor: string): VisitStatus | null {
  const v = normalizar(valor).replace(/[\s-]+/g, "_");
  if (!v) return null;
  if (v === "sim" || v === "compareceu" || v === "realizado") return "realizada";
  if (v === "nao" || v === "faltou" || v === "no_show" || v === "ausente") return "nao_compareceu";
  if (v === "cancelado") return "cancelada";
  if (v === "agendado") return "agendada";
  return (VISIT_STATUS as readonly string[]).includes(v) ? (v as VisitStatus) : null;
}

export type LinhaVisita = {
  linha: number;
  documento: string;
  email: string;
  pessoa: string;
  empreendimento: string;
  data: string | null;
  status: VisitStatus;
  nota: number | null;
  feedback: string;
  erros: string[];
  avisos: string[];
};

export type PlanoVisitas = {
  validas: LinhaVisita[];
  invalidas: LinhaVisita[];
  total: number;
};

export function montarPlanoVisitas(
  tabela: CsvTabela,
  mapa: MapaColunasVisita,
): PlanoVisitas {
  const pegar = (row: string[], campo: VisitField) => {
    const indice = mapa[campo];
    if (indice === undefined) return "";
    return (row[indice] ?? "").trim();
  };

  const linhas: LinhaVisita[] = tabela.rows.slice(0, IMPORT_MAX_LINHAS).map((row, indice) => {
    const documento = pegar(row, "pessoa_documento");
    const email = pegar(row, "pessoa_email").toLowerCase();
    const pessoa = pegar(row, "pessoa_nome");
    const dataBruta = pegar(row, "data");
    const statusBruto = pegar(row, "status");
    const notaBruta = pegar(row, "nota");

    const erros: string[] = [];
    const avisos: string[] = [];

    if (!documento && !email && !pessoa) {
      erros.push("Informe documento, e-mail ou nome da pessoa.");
    }
    if (documento && !documentoValido(documento)) {
      avisos.push("Documento fora do padrão CPF/CNPJ.");
    }
    if (email && !emailValido(email)) erros.push("E-mail inválido.");

    const data = parseDataHora(dataBruta);
    if (!data) erros.push("Data da visita inválida ou ausente.");

    if (statusBruto && !normalizarStatusVisita(statusBruto)) {
      avisos.push(`Situação "${statusBruto}" não reconhecida — entra como Agendada.`);
    }

    const notaNumero = notaBruta ? Number(notaBruta.replace(",", ".")) : null;
    let nota: number | null = null;
    if (notaNumero !== null && Number.isFinite(notaNumero) && notaNumero >= 0 && notaNumero <= 10) {
      nota = Math.round(notaNumero * 10) / 10;
    } else if (notaBruta) {
      avisos.push("Nota fora da escala 0–10 — será ignorada.");
    }

    return {
      linha: indice + 2,
      documento,
      email,
      pessoa,
      empreendimento: pegar(row, "empreendimento").slice(0, 160),
      data,
      status: normalizarStatusVisita(statusBruto) ?? "agendada",
      nota,
      feedback: pegar(row, "feedback").slice(0, 2000),
      erros,
      avisos,
    };
  });

  return {
    validas: linhas.filter((l) => !l.erros.length),
    invalidas: linhas.filter((l) => l.erros.length > 0),
    total: linhas.length,
  };
}

export const CSV_MODELO_VISITAS = [
  "documento,email,nome,empreendimento,data,status,nota,feedback",
  "123.456.789-09,carlos@exemplo.com.br,Carlos Ferragano,Residencial Exemplo,31/07/2026 14:30,realizada,9,Gostou da planta do 2 quartos",
  ",contato@exemplo.com.br,Construtora Exemplo LTDA,Residencial Exemplo,05/08/2026,agendada,,Levar tabela atualizada",
].join("\n");

/* =========================================================================
 * Reservas — apontam para uma pessoa e uma oportunidade já existentes. A
 * unidade é resolvida pelo identificador dentro do empreendimento informado.
 * ========================================================================= */

export const RESERVA_FIELDS = [
  "pessoa_documento",
  "pessoa_email",
  "pessoa_nome",
  "empreendimento",
  "unidade",
  "expira_em",
  "valor",
  "status",
  "observacao",
] as const;
export type ReservaField = (typeof RESERVA_FIELDS)[number];

export const reservaFieldLabels: Record<ReservaField, string> = {
  pessoa_documento: "Documento da pessoa (CPF/CNPJ)",
  pessoa_email: "E-mail da pessoa",
  pessoa_nome: "Nome da pessoa",
  empreendimento: "Empreendimento (nome)",
  unidade: "Unidade (identificador)",
  expira_em: "Validade da reserva",
  valor: "Valor reservado (R$)",
  status: "Situação da reserva",
  observacao: "Observação",
};

const RESERVA_SINONIMOS: Record<ReservaField, string[]> = {
  pessoa_documento: ["documento", "cpf", "cnpj", "cpf/cnpj", "doc", "documento cliente"],
  pessoa_email: ["email", "e-mail", "email cliente", "mail"],
  pessoa_nome: ["nome", "cliente", "nome cliente", "pessoa", "comprador"],
  empreendimento: ["empreendimento", "produto", "obra", "imovel", "imóvel", "condominio", "condomínio"],
  unidade: ["unidade", "apto", "apartamento", "identificador", "lote", "sala", "quadra lote"],
  expira_em: ["expira em", "validade", "expiracao", "expiração", "vence em", "vencimento", "data"],
  valor: ["valor", "valor reserva", "preco", "preço", "ticket"],
  status: ["status", "situacao", "situação", "resultado"],
  observacao: ["observacao", "observação", "obs", "notas", "comentario", "comentário"],
};

export type MapaColunasReserva = Partial<Record<ReservaField, number>>;

export function autoMapearReservas(headers: string[]): MapaColunasReserva {
  const mapa: MapaColunasReserva = {};
  const normalizados = headers.map(normalizar);
  for (const campo of RESERVA_FIELDS) {
    const alvo = RESERVA_SINONIMOS[campo].map(normalizar);
    const indice = normalizados.findIndex((h) => h.length > 0 && alvo.includes(h));
    if (indice >= 0 && !Object.values(mapa).includes(indice)) mapa[campo] = indice;
  }
  return mapa;
}

/** Pessoa, unidade e validade são indispensáveis para uma reserva rastreável. */
export function camposFaltandoReserva(mapa: MapaColunasReserva): string[] {
  const faltando: string[] = [];
  const temPessoa =
    mapa.pessoa_documento !== undefined ||
    mapa.pessoa_email !== undefined ||
    mapa.pessoa_nome !== undefined;
  if (!temPessoa) faltando.push("Documento, e-mail ou nome da pessoa");
  if (mapa.unidade === undefined) faltando.push(reservaFieldLabels.unidade);
  if (mapa.expira_em === undefined) faltando.push(reservaFieldLabels.expira_em);
  return faltando;
}

export function normalizarStatusReserva(valor: string): ReservationStatus | null {
  const v = normalizar(valor).replace(/[\s-]+/g, "_");
  if (!v) return null;
  if (v === "vigente" || v === "aberta" || v === "ativo") return "ativa";
  if (v === "vencida" || v === "expirado") return "expirada";
  if (v === "convertido" || v === "vendida" || v === "vendido") return "convertida";
  if (v === "cancelado") return "cancelada";
  return (RESERVATION_STATUS as readonly string[]).includes(v) ? (v as ReservationStatus) : null;
}

export type LinhaReserva = {
  linha: number;
  documento: string;
  email: string;
  pessoa: string;
  empreendimento: string;
  unidade: string;
  expiraEm: string | null;
  valor: number | null;
  status: ReservationStatus;
  observacao: string;
  erros: string[];
  avisos: string[];
};

export type PlanoReservas = {
  validas: LinhaReserva[];
  invalidas: LinhaReserva[];
  total: number;
};

export function montarPlanoReservas(
  tabela: CsvTabela,
  mapa: MapaColunasReserva,
): PlanoReservas {
  const pegar = (row: string[], campo: ReservaField) => {
    const indice = mapa[campo];
    if (indice === undefined) return "";
    return (row[indice] ?? "").trim();
  };

  const unidadesVistas = new Set<string>();

  const linhas: LinhaReserva[] = tabela.rows.slice(0, IMPORT_MAX_LINHAS).map((row, indice) => {
    const documento = pegar(row, "pessoa_documento");
    const email = pegar(row, "pessoa_email").toLowerCase();
    const pessoa = pegar(row, "pessoa_nome");
    const empreendimento = pegar(row, "empreendimento").slice(0, 160);
    const unidade = pegar(row, "unidade");
    const validadeBruta = pegar(row, "expira_em");
    const valorBruto = pegar(row, "valor");
    const statusBruto = pegar(row, "status");

    const erros: string[] = [];
    const avisos: string[] = [];

    if (!documento && !email && !pessoa) {
      erros.push("Informe documento, e-mail ou nome da pessoa.");
    }
    if (documento && !documentoValido(documento)) {
      avisos.push("Documento fora do padrão CPF/CNPJ.");
    }
    if (email && !emailValido(email)) erros.push("E-mail inválido.");
    if (!unidade) erros.push("Unidade obrigatória.");

    const expiraEm = parseDataHora(validadeBruta);
    if (!expiraEm) erros.push("Validade da reserva inválida ou ausente.");

    const valor = parseValor(valorBruto);
    if (valorBruto && valor === null) avisos.push("Valor não reconhecido — será ignorado.");

    const status = normalizarStatusReserva(statusBruto) ?? "ativa";
    if (statusBruto && !normalizarStatusReserva(statusBruto)) {
      avisos.push(`Situação "${statusBruto}" não reconhecida — entra como Ativa.`);
    }

    // Duas reservas ativas para a mesma unidade no mesmo arquivo é erro de origem.
    if (unidade && status === "ativa") {
      const chave = `${normalizar(empreendimento)}|${normalizar(unidade)}`;
      if (unidadesVistas.has(chave)) erros.push("Unidade com mais de uma reserva ativa no arquivo.");
      else unidadesVistas.add(chave);
    }

    return {
      linha: indice + 2,
      documento,
      email,
      pessoa,
      empreendimento,
      unidade: unidade.slice(0, 60),
      expiraEm,
      valor,
      status,
      observacao: pegar(row, "observacao").slice(0, 2000),
      erros,
      avisos,
    };
  });

  return {
    validas: linhas.filter((l) => !l.erros.length),
    invalidas: linhas.filter((l) => l.erros.length > 0),
    total: linhas.length,
  };
}

export const CSV_MODELO_RESERVAS = [
  "documento,email,nome,empreendimento,unidade,validade,valor,status,observacao",
  '123.456.789-09,carlos@exemplo.com.br,Carlos Ferragano,Residencial Exemplo,1203,10/08/2026,"R$ 750.000,00",ativa,Reserva confirmada por WhatsApp',
  ",contato@exemplo.com.br,Construtora Exemplo LTDA,Residencial Exemplo,1204,05/07/2026,690000,expirada,Cliente desistiu",
].join("\n");
