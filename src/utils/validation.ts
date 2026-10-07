export type RegisterFormValues = {
  name: string;
  email: string;
  phone: string;
  birthDate: string; // DD/MM/AAAA
  password: string;
  confirmPassword: string;
};

export type RegisterFormErrors = Partial<Record<keyof RegisterFormValues, string>>;

export const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

export const normalizePhone = (phone: string): string => phone.replace(/\D/g, '');

export function maskDate(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8);
  if (d.length > 4) return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  if (d.length > 2) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return d;
}

/** DD/MM/AAAA -> AAAA-MM-DD (ou null se inválida/futura). */
export function parseBirthDate(text: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!m) return null;
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(year, month - 1, day);
  const valid = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  if (!valid || year < 1900 || date.getTime() > Date.now()) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function formatIsoDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

export function validateRegisterForm(v: RegisterFormValues): RegisterFormErrors {
  const errors: RegisterFormErrors = {};
  if (v.name.trim().length < 2) errors.name = 'Informe seu nome completo.';
  if (!isValidEmail(v.email)) errors.email = 'Informe um e-mail válido.';
  const phone = normalizePhone(v.phone);
  if (phone.length < 10 || phone.length > 13) errors.phone = 'Informe o celular com DDD.';
  if (parseBirthDate(v.birthDate) === null) errors.birthDate = 'Use uma data válida no formato DD/MM/AAAA.';
  if (v.password.length < 6) errors.password = 'A senha deve ter pelo menos 6 caracteres.';
  if (v.confirmPassword !== v.password) errors.confirmPassword = 'As senhas não coincidem.';
  return errors;
}
