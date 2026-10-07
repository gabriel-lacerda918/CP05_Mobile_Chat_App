export const MIN_GROUP_MEMBERS = 2;
export const MAX_MEMBER_LIMIT = 100;

export function parseLimit(text: string): number | null {
  const trimmed = text.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

export function availableSlots(limit: number, memberCount: number): number {
  return Math.max(0, limit - memberCount);
}

export function formatSlots(limit: number | null, memberCount: number): string {
  if (limit === null) return `${memberCount} integrante(s)`;
  const slots = availableSlots(limit, memberCount);
  const vagas = slots === 0 ? 'sem vagas' : slots === 1 ? '1 vaga disponível' : `${slots} vagas disponíveis`;
  return `${memberCount}/${limit} integrantes · ${vagas}`;
}

export function validateGroupForm(values: {
  name: string;
  limit: number | null;
  memberCount: number;
}): string | null {
  const { name, limit, memberCount } = values;
  if (name.trim().length < 2) return 'Informe o nome do grupo (mínimo de 2 caracteres).';
  if (limit === null) return 'O limite de integrantes deve ser um número inteiro.';
  if (limit < MIN_GROUP_MEMBERS) return `O limite mínimo é ${MIN_GROUP_MEMBERS} integrantes.`;
  if (limit > MAX_MEMBER_LIMIT) return `O limite máximo é ${MAX_MEMBER_LIMIT} integrantes.`;
  if (memberCount < MIN_GROUP_MEMBERS) return 'Selecione ao menos um integrante além de você.';
  if (memberCount > limit) return 'O número de integrantes não pode ser maior que o limite.';
  return null;
}
