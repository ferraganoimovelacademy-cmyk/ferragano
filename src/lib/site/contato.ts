/** Canal de WhatsApp da vitrine pública. Somente apresentação. */
export const WHATSAPP_NUMERO = "5511970707070";

export function whatsappLink(mensagem: string) {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;
}

export const WHATSAPP_MSG_PADRAO =
  "Olá! Vim pelo site da Ferragano e quero falar com um especialista sobre imóveis.";

export const WHATSAPP_MSG_CONSULTORIA =
  "Olá! Quero agendar uma consultoria patrimonial com a Ferragano.";

export const WHATSAPP_MSG_LANCAMENTOS =
  "Olá! Quero conhecer os lançamentos disponíveis com a Ferragano.";

export const WHATSAPP_MSG_GERENTE =
  "Olá, Carlos! Quero falar diretamente com você sobre qual lançamento faz mais sentido para o meu patrimônio.";
