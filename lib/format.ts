const DAY = 86400000

export function rel(t: number): string {
  const d = Math.floor((Date.now() - t) / DAY)
  return d <= 0 ? "aujourd'hui" : d === 1 ? 'hier' : `il y a ${d} j`
}
