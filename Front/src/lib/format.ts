export function formatCurrency(value: string | number) {
  const numero = typeof value === "string" ? Number(value) : value
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

// Aplica a máscara 00.000.000/0000-00 progressivamente enquanto o usuário digita,
// aceitando colar o CNPJ com ou sem pontuação.
export function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14)
  const partes = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 8), digits.slice(8, 12), digits.slice(12, 14)]

  let resultado = partes[0]
  if (partes[1]) resultado += `.${partes[1]}`
  if (partes[2]) resultado += `.${partes[2]}`
  if (partes[3]) resultado += `/${partes[3]}`
  if (partes[4]) resultado += `-${partes[4]}`

  return resultado
}
