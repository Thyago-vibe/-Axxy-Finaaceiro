import { describe, it, expect } from 'vitest';
import { formatCurrency, parseCurrencyInput } from '../utils/formatters';

describe('formatCurrency', () => {
    it('formata valor em reais corretamente', () => {
        const result = formatCurrency(1234.56);
        expect(result).toContain('1.234,56');
        expect(result).toContain('R$');
    });

    it('formata zero', () => {
        const result = formatCurrency(0);
        expect(result).toContain('0,00');
    });

    it('formata valores negativos', () => {
        const result = formatCurrency(-500);
        expect(result).toContain('500,00');
    });
});

describe('parseCurrencyInput', () => {
    it('converte string formatada para número', () => {
        expect(parseCurrencyInput('1.234,56')).toBe(1234.56);
    });

    it('converte valor simples', () => {
        expect(parseCurrencyInput('100,00')).toBe(100);
    });
});
