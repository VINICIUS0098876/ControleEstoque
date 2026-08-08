const HEX_COLOR = /^#?([a-f\d]{6})$/i

function hexToRgb(hex: string): [number, number, number] | null {
  const match = HEX_COLOR.exec(hex.trim())
  if (!match) return null

  const value = match[1]!
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ]
}

// Luminância relativa (WCAG 2.x): https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

// Escolhe preto ou branco como texto sobre `hex`, o que der maior taxa de contraste
// (fórmula de contraste do WCAG). Cores de marca são escolhidas livremente pelo tenant
// (Empresa.temaCor) e podem ser claras ou escuras, então o texto não pode ser fixo.
export function getContrastingForeground(hex: string | null | undefined): string {
  const rgb = hex ? hexToRgb(hex) : null
  if (!rgb) return "#ffffff"

  const luminance = relativeLuminance(rgb)
  const contrastComBranco = 1.05 / (luminance + 0.05)
  const contrastComPreto = (luminance + 0.05) / 0.05

  return contrastComBranco >= contrastComPreto ? "#ffffff" : "#000000"
}

export function applyBrandColor(temaCor: string | null | undefined) {
  const root = document.documentElement
  if (temaCor) {
    root.style.setProperty("--brand", temaCor)
    root.style.setProperty("--brand-foreground", getContrastingForeground(temaCor))
  } else {
    root.style.removeProperty("--brand")
    root.style.removeProperty("--brand-foreground")
  }
}

export function getInitials(nome: string) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}
