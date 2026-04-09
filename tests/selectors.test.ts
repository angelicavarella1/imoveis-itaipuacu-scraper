import { describe, it, expect } from 'vitest';
import { SELECTORS, REQUIRED_FIELDS } from '../src/config/selectors';
import { parseRelativeDate } from '../src/utils/dateParser';
import { validateAndClean } from '../src/utils/validators';

describe('Configuração de Seletores', () => {
  it('deve exportar todos os seletores obrigatórios como string', () => {
    const expectedKeys = ['LISTING_CONTAINER', 'TITLE', 'PRICE', 'LOCATION', 'LINK', 'POSTED_DATE'] as const;
    expectedKeys.forEach((key) => {
      expect(SELECTORS).toHaveProperty(key);
      expect(typeof SELECTORS[key]).toBe('string');
      expect(SELECTORS[key]).not.toBe('');
    });
  });

  it('deve conter campos obrigatórios para validação', () => {
    expect(REQUIRED_FIELDS).toContain('title');
    expect(REQUIRED_FIELDS).toContain('url');
    expect(REQUIRED_FIELDS).toContain('price');
    expect(REQUIRED_FIELDS).toContain('location');
  });
});

describe('Parser de Datas Relativas', () => {
  it('deve retornar data atual para "Hoje"', () => {
    const today = new Date();
    const result = parseRelativeDate('Hoje');
    expect(result?.getDate()).toBe(today.getDate());
    expect(result?.getMonth()).toBe(today.getMonth());
  });

  it('deve retornar data de ontem para "Ontem"', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const result = parseRelativeDate('Ontem');
    expect(result?.getDate()).toBe(yesterday.getDate());
  });

  it('deve calcular dias atrás corretamente', () => {
    const result = parseRelativeDate('3 dias atrás');
    const expected = new Date();
    expected.setDate(expected.getDate() - 3);
    expect(result?.getDate()).toBe(expected.getDate());
  });

  it('deve retornar null para strings inválidas', () => {
    expect(parseRelativeDate('')).toBeNull();
    expect(parseRelativeDate('mês passado')).toBeNull();
    expect(parseRelativeDate('12/05/2026')).not.toBeNull();
  });
});

describe('Validação Zod (Runtime)', () => {
  const validMock = {
    title: 'Casa térrea em Itaipuaçu',
    priceRaw: 'R$ 450.000,00',
    location: 'Rua das Flores, Itaipuaçu - Maricá',
    url: 'https://www.olx.com.br/imovel/123456',
    imageUrls: ['https://imgs.olx.com.br/imagem1.jpg'],
    postedDateRaw: 'Hoje',
    areaRaw: '90',
    bedrooms: 2,
    bathrooms: 1,
  };

  it('deve validar e limpar dados corretos', () => {
    const result = validateAndClean(validMock);
    expect(result).not.toBeNull();
    expect(result?.price).toBe(450000);
    expect(result?.area).toBe(90);
    expect(result?.title).toBe(validMock.title);
    expect(result?.scrapedAt).toBeInstanceOf(Date);
  });

  it('deve rejeitar dados sem URL válida', () => {
    const invalid = { ...validMock, url: 'not-a-url' };
    expect(validateAndClean(invalid)).toBeNull();
  });

  it('deve rejeitar preço inválido ou negativo', () => {
    const invalidPrice = { ...validMock, priceRaw: 'Grátis' };
    expect(validateAndClean(invalidPrice)).toBeNull();
  });

  it('deve retornar null se campos obrigatórios estiverem vazios', () => {
    const missingTitle = { ...validMock, title: '' };
    expect(validateAndClean(missingTitle)).toBeNull();
  });
});
