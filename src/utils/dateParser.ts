import { parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function parseRelativeDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  const lower = dateStr.toLowerCase().trim();
  const today = new Date();
  
  if (lower.includes('hoje')) return today;
  if (lower.includes('ontem')) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d;
  }
  const days = lower.match(/(\d+)\s*dias?\s*atrás/);
  if (days) {
    const d = new Date(today);
    d.setDate(d.getDate() - parseInt(days[1], 10));
    return d;
  }
  const parsed = parse(dateStr, 'dd/MM/yyyy', today, { locale: ptBR });
  return isValid(parsed) ? parsed : null;
}


