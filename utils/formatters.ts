export const formatCurrencyInput = (value: string): string => {
    // Remove everything that is not a digit
    const numericValue = value.replace(/\D/g, '');

    // If empty, return empty (or "0,00" if preferred, but usually empty is better for clearing)
    if (!numericValue) return '';

    // Divide by 100 to treat as cents
    const amount = Number(numericValue) / 100;

    // Format as BRL
    return amount.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

export const parseCurrencyInput = (value: string): number => {
    if (!value) return 0;
    // Remove dots (thousands separator) and replace comma with dot (decimal)
    return parseFloat(value.replace(/\./g, '').replace(',', '.'));
};
