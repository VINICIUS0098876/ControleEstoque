import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { HEX_COLOR_PATTERN } from "@/schemas/empresa.schema"

const COR_SWATCH_PADRAO = "#0f4c81"

// input[type=color] só aceita hex de 6 dígitos (#RRGGBB); o schema aceita também a forma
// curta (#RGB), então normalizamos aqui só para alimentar o swatch nativo — o valor "de
// verdade" (o que vai pro form/backend) nunca passa por esta função.
function paraHexDeSeisDigitos(valor: string): string | null {
  const match = HEX_COLOR_PATTERN.exec(valor)
  if (!match) return null
  const digitos = match[1]!
  return digitos.length === 6 ? `#${digitos}` : `#${digitos.split("").map((c) => c + c).join("")}`
}

interface ColorPickerInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> {
  value: string
  onChange: (value: string) => void
}

// Composição de <input type="color"> (seletor visual, atalho de mouse) + <Input type="text">
// (o controle acessível principal: focável por Tab, digitável, associado ao <FormLabel>).
// Usado dentro de <FormControl>, que é um Slot.Root do Radix e injeta id/aria-describedby/
// aria-invalid no único filho na hora de renderizar — por isso as props chegam via `...rest`
// e são repassadas para o <Input> de texto, nunca ficam só na <div> wrapper.
export function ColorPickerInput({ value, onChange, className, id, ...rest }: ColorPickerInputProps) {
  const corDoSwatch = paraHexDeSeisDigitos(value) ?? COR_SWATCH_PADRAO

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input
        type="color"
        value={corDoSwatch}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Selecionar cor de marca no seletor visual"
        className="size-8 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
      />
      <Input
        id={id}
        type="text"
        placeholder={COR_SWATCH_PADRAO.toUpperCase()}
        maxLength={7}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 font-mono uppercase"
        {...rest}
      />
    </div>
  )
}
