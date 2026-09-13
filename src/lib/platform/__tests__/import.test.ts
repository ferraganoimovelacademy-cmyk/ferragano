import { describe, expect, it } from "vitest";
import {
  autoMapear,
  autoMapearOportunidades,
  autoMapearReservas,
  autoMapearVisitas,
  camposFaltando,
  camposFaltandoOportunidade,
  camposFaltandoReserva,
  camposFaltandoVisita,
  detectarSeparador,
  documentoValido,
  emailValido,
  montarPlano,
  montarPlanoOportunidades,
  montarPlanoReservas,
  montarPlanoVisitas,
  normalizarOrigem,
  normalizarEstagio,
  normalizarStatusReserva,
  normalizarStatusVisita,
  normalizarTemperatura,
  normalizarTipo,
  parseDataHora,
  parseValor,
  parseCsv,
  telefoneValido,
} from "../import";

const CSV = [
  "Nome;CPF;E-mail;Celular;Tipo;Origem",
  "Carlos Ferragano;123.456.789-09;carlos@exemplo.com;(41) 99999-0000;fisica;indicacao",
  "Construtora X;12.345.678/0001-95;contato@x.com;4133330000;juridica;site",
].join("\n");

describe("import — parse", () => {
  it("detecta ponto e vírgula como separador", () => {
    expect(detectarSeparador(CSV)).toBe(";");
  });

  it("lê cabeçalho e linhas", () => {
    const tabela = parseCsv(CSV);
    expect(tabela.headers).toHaveLength(6);
    expect(tabela.rows).toHaveLength(2);
  });

  it("respeita aspas, separador interno e escape", () => {
    const tabela = parseCsv('nome,obs\n"Silva, Ana","disse ""ok"""');
    expect(tabela.rows[0]).toEqual(["Silva, Ana", 'disse "ok"']);
  });

  it("ignora BOM e linhas vazias", () => {
    const tabela = parseCsv("\uFEFFnome\nAna\n\n\nBia\n");
    expect(tabela.headers).toEqual(["nome"]);
    expect(tabela.rows).toEqual([["Ana"], ["Bia"]]);
  });
});

describe("import — mapeamento", () => {
  it("mapeia por sinônimo de cabeçalho", () => {
    const mapa = autoMapear(parseCsv(CSV).headers);
    expect(mapa).toMatchObject({ nome: 0, documento: 1, email: 2, telefone: 3, tipo: 4, origem: 5 });
    expect(camposFaltando(mapa)).toEqual([]);
  });

  it("acusa nome não mapeado", () => {
    expect(camposFaltando(autoMapear(["coluna a", "coluna b"]))).toEqual(["nome"]);
  });
});

describe("import — normalização e validação", () => {
  it("valida documento, e-mail e telefone", () => {
    expect(documentoValido("123.456.789-09")).toBe(true);
    expect(documentoValido("123")).toBe(false);
    expect(emailValido("a@b.com")).toBe(true);
    expect(emailValido("a@b")).toBe(false);
    expect(telefoneValido("(41) 99999-0000")).toBe(true);
    expect(telefoneValido("999")).toBe(false);
  });

  it("normaliza tipo e origem", () => {
    expect(normalizarTipo("Jurídica")).toBe("juridica");
    expect(normalizarTipo("")).toBe("fisica");
    expect(normalizarOrigem("Indicacao")).toBe("indicacao");
    expect(normalizarOrigem("marte")).toBeNull();
  });
});

describe("import — plano", () => {
  it("separa válidas de inválidas", () => {
    const tabela = parseCsv(`${CSV}\n;;;;;`.replace(/\n;;;;;$/, "\n;semdoc;email-ruim;;;"));
    const plano = montarPlano(tabela, autoMapear(tabela.headers));
    expect(plano.validas).toHaveLength(2);
    expect(plano.invalidas).toHaveLength(1);
    expect(plano.invalidas[0].erros.join(" ")).toContain("Nome obrigatório");
  });

  it("marca documento e e-mail repetidos no arquivo", () => {
    const csv = [
      "nome,cpf,email",
      "Ana,123.456.789-09,ana@x.com",
      "Ana Clone,123.456.789-09,outra@x.com",
      "Bia,,ana@x.com",
    ].join("\n");
    const tabela = parseCsv(csv);
    const plano = montarPlano(tabela, autoMapear(tabela.headers));
    expect(plano.validas).toHaveLength(1);
    expect(plano.invalidas.map((l) => l.linha)).toEqual([3, 4]);
  });

  it("gera avisos sem bloquear a linha", () => {
    const tabela = parseCsv("nome,cpf,origem\nAna,999,marte");
    const plano = montarPlano(tabela, autoMapear(tabela.headers));
    expect(plano.validas).toHaveLength(1);
    expect(plano.validas[0].avisos).toHaveLength(2);
  });
});

describe("import — oportunidades", () => {
  const CSV_OPP = [
    "documento,email,nome,titulo,valor,etapa,temperatura,origem",
    '123.456.789-09,carlos@x.com,Carlos,Apto 2q,"R$ 750.000,00",proposta,quente,indicacao',
  ].join("\n");

  it("mapeia colunas de oportunidade por sinônimo", () => {
    const mapa = autoMapearOportunidades(parseCsv(CSV_OPP).headers);
    expect(mapa).toMatchObject({ pessoa_documento: 0, pessoa_email: 1, pessoa_nome: 2, titulo: 3 });
    expect(camposFaltandoOportunidade(mapa)).toEqual([]);
  });

  it("exige um identificador de pessoa", () => {
    expect(camposFaltandoOportunidade({ titulo: 0 })).toHaveLength(1);
  });

  it("lê valor em formato brasileiro e americano", () => {
    expect(parseValor("R$ 1.250.000,00")).toBe(1250000);
    expect(parseValor("1250000.50")).toBe(1250000.5);
    expect(parseValor("")).toBeNull();
    expect(parseValor("abc")).toBeNull();
  });

  it("normaliza etapa e temperatura", () => {
    expect(normalizarEstagio("Negociação")).toBe("negociacao");
    expect(normalizarEstagio("ganho")).toBe("fechado");
    expect(normalizarEstagio("marte")).toBeNull();
    expect(normalizarTemperatura("Quente")).toBe("quente");
    expect(normalizarTemperatura("gelado")).toBeNull();
  });

  it("monta plano com defaults e avisos", () => {
    const tabela = parseCsv(CSV_OPP);
    const plano = montarPlanoOportunidades(tabela, autoMapearOportunidades(tabela.headers));
    expect(plano.validas).toHaveLength(1);
    expect(plano.validas[0]).toMatchObject({
      estagio: "proposta",
      temperatura: "quente",
      origem: "indicacao",
    });
  });

  it("bloqueia linha sem pessoa e com e-mail inválido", () => {
    const tabela = parseCsv("documento,email,nome,titulo\n,,,Sem cliente\n,ruim,,Outra");
    const plano = montarPlanoOportunidades(tabela, autoMapearOportunidades(tabela.headers));
    expect(plano.invalidas).toHaveLength(2);
    expect(plano.invalidas[0].erros.join(" ")).toContain("Informe documento");
    expect(plano.invalidas[1].erros.join(" ")).toContain("E-mail inválido");
  });

  it("usa Novo e Morno quando a etapa não é reconhecida", () => {
    const tabela = parseCsv("nome,etapa,temperatura\nAna,marte,gelado");
    const plano = montarPlanoOportunidades(tabela, autoMapearOportunidades(tabela.headers));
    expect(plano.validas[0].estagio).toBe("novo");
    expect(plano.validas[0].temperatura).toBe("morno");
    expect(plano.validas[0].avisos).toHaveLength(2);
  });
});
describe("import — visitas", () => {
  const CSV_VISITA = [
    "documento,email,nome,empreendimento,data,status,nota,feedback",
    "123.456.789-09,carlos@x.com,Carlos,Residencial Exemplo,31/07/2026 14:30,realizada,9,Gostou",
  ].join("\n");

  it("mapeia colunas de visita por sinônimo", () => {
    const mapa = autoMapearVisitas(parseCsv(CSV_VISITA).headers);
    expect(mapa).toMatchObject({ pessoa_documento: 0, empreendimento: 3, data: 4, status: 5 });
    expect(camposFaltandoVisita(mapa)).toEqual([]);
  });

  it("exige pessoa e data", () => {
    expect(camposFaltandoVisita({})).toHaveLength(2);
    expect(camposFaltandoVisita({ pessoa_nome: 0 })).toHaveLength(1);
  });

  it("lê data brasileira, com e sem hora, e ISO", () => {
    expect(parseDataHora("31/07/2026 14:30")).toContain("2026-07-31");
    expect(parseDataHora("05/08/2026")).toContain("2026-08-05");
    expect(parseDataHora("2026-08-05T12:00:00.000Z")).toBe("2026-08-05T12:00:00.000Z");
    expect(parseDataHora("31/02/2026")).toBeNull();
    expect(parseDataHora("")).toBeNull();
    expect(parseDataHora("qualquer coisa")).toBeNull();
  });

  it("normaliza situação da visita", () => {
    expect(normalizarStatusVisita("Compareceu")).toBe("realizada");
    expect(normalizarStatusVisita("faltou")).toBe("nao_compareceu");
    expect(normalizarStatusVisita("não compareceu")).toBe("nao_compareceu");
    expect(normalizarStatusVisita("marte")).toBeNull();
  });

  it("monta plano com nota e situação", () => {
    const tabela = parseCsv(CSV_VISITA);
    const plano = montarPlanoVisitas(tabela, autoMapearVisitas(tabela.headers));
    expect(plano.validas).toHaveLength(1);
    expect(plano.validas[0]).toMatchObject({ status: "realizada", nota: 9 });
  });

  it("bloqueia linha sem data e avisa nota fora da escala", () => {
    const tabela = parseCsv("nome,data,nota\nAna,,5\nBia,10/08/2026,42");
    const plano = montarPlanoVisitas(tabela, autoMapearVisitas(tabela.headers));
    expect(plano.invalidas).toHaveLength(1);
    expect(plano.invalidas[0].erros.join(" ")).toContain("Data da visita");
    expect(plano.validas[0].nota).toBeNull();
    expect(plano.validas[0].avisos.join(" ")).toContain("0–10");
  });
});

describe("import — reservas", () => {
  const CSV_RESERVA = [
    "documento,email,nome,empreendimento,unidade,validade,valor,status",
    '123.456.789-09,ana@exemplo.com,Ana Souza,Residencial Exemplo,1203,10/08/2026,"R$ 750.000,00",ativa',
  ].join("\n");

  it("mapeia colunas de reserva automaticamente", () => {
    const tabela = parseCsv(CSV_RESERVA);
    const mapa = autoMapearReservas(tabela.headers);
    expect(mapa.unidade).toBe(4);
    expect(mapa.expira_em).toBe(5);
    expect(camposFaltandoReserva(mapa)).toHaveLength(0);
  });

  it("exige pessoa, unidade e validade", () => {
    expect(camposFaltandoReserva({})).toHaveLength(3);
    expect(camposFaltandoReserva({ pessoa_nome: 0, unidade: 1 })).toEqual([
      "Validade da reserva",
    ]);
  });

  it("normaliza situação da reserva", () => {
    expect(normalizarStatusReserva("Vigente")).toBe("ativa");
    expect(normalizarStatusReserva("vencida")).toBe("expirada");
    expect(normalizarStatusReserva("vendida")).toBe("convertida");
    expect(normalizarStatusReserva("cancelado")).toBe("cancelada");
    expect(normalizarStatusReserva("saturno")).toBeNull();
  });

  it("monta plano com valor e validade normalizados", () => {
    const tabela = parseCsv(CSV_RESERVA);
    const plano = montarPlanoReservas(tabela, autoMapearReservas(tabela.headers));
    expect(plano.validas).toHaveLength(1);
    expect(plano.validas[0]).toMatchObject({ unidade: "1203", valor: 750000, status: "ativa" });
    expect(plano.validas[0].expiraEm).toContain("2026-08-10");
  });

  it("bloqueia linha sem unidade e unidade com duas reservas ativas", () => {
    const tabela = parseCsv(
      [
        "nome,empreendimento,unidade,validade,status",
        "Ana,Residencial Exemplo,,10/08/2026,ativa",
        "Bia,Residencial Exemplo,1203,10/08/2026,ativa",
        "Cris,Residencial Exemplo,1203,12/08/2026,ativa",
      ].join("\n"),
    );
    const plano = montarPlanoReservas(tabela, autoMapearReservas(tabela.headers));
    expect(plano.validas).toHaveLength(1);
    expect(plano.invalidas).toHaveLength(2);
    expect(plano.invalidas.map((l) => l.erros.join(" ")).join(" ")).toContain("Unidade obrigatória");
    expect(plano.invalidas.map((l) => l.erros.join(" ")).join(" ")).toContain("reserva ativa");
  });
});
