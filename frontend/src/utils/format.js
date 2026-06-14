const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('en-US');

export function formatCurrency(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return currencyFormatter.format(Number(value));
}

export function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return numberFormatter.format(Number(value));
}

export function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(2)}%`;
}
