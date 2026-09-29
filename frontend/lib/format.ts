export function formatStock(amount: number): string {
  if (amount >= 1000) {
    const tons = amount / 1000
    return `${tons % 1 === 0 ? tons : tons.toFixed(2)} Ton`
  }
  return `${amount} Kg`
}
