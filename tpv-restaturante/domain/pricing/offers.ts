export function calculateOfferDiscount(
  items: Array<{ productId?: string; price: number; qty: number }>,
  offers: Array<{ active: boolean; days: number[]; startHour: number; endHour: number; productIds: string[]; discountPct: number }>,
  now?: Date
): number {
  const date = now || new Date()
  const currentDay = date.getDay() === 0 ? 7 : date.getDay()
  const currentHour = date.getHours()
  let total = 0
  for (const offer of offers) {
    if (!offer.active) continue
    if (!offer.days.includes(currentDay)) continue
    if (currentHour < offer.startHour || currentHour >= offer.endHour) continue
    for (const item of items) {
      if (item.productId && offer.productIds.includes(item.productId)) {
        total += round2(item.price * item.qty * (offer.discountPct / 100))
      }
    }
  }
  return total
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
