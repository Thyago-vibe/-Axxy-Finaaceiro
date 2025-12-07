export const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};


export const formatCurrencyInput = (value: string): string => {
    // Remove non-digits
    const numericValue = value.replace(/\D/g, '');

    // Format as currency (pt-BR)
    const number = parseFloat(numericValue) / 100;
    return number.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

export const parseCurrencyInput = (value: string): number => {
    const numericValue = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(numericValue);
};
