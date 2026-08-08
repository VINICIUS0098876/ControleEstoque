// O back seta um cookie `session_active` (legível por JS, não httpOnly) junto dos
// cookies httpOnly de accessToken/refreshToken sempre que existe uma sessão válida.
// Ele nunca é usado para autorizar nada — a autenticação real continua 100% via
// cookies httpOnly validados no servidor — serve só para o front decidir, sem
// round-trip à API, se vale a pena tentar restaurar a sessão no boot da aplicação.
export function hasSessionHint(): boolean {
  return document.cookie
    .split("; ")
    .some((entry) => entry.startsWith("session_active="))
}
