const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

export const formatCurrency = (amount: number) => formatter.format(amount);
