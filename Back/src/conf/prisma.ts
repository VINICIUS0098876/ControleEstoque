import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './env.js';

// Configuração do pool de conexões com SSL ativado (necessário para o Supabase).
// rejectUnauthorized: false é intencional e foi validado nesta revisão (não é a gambiarra
// que parece à primeira vista): testado diretamente contra este pooler, o handshake com
// rejectUnauthorized: true falha com "self-signed certificate in certificate chain" — o
// pooler do Supabase apresenta um certificado que não é assinado por uma CA pública
// reconhecida pelo Node. Validação plena (verify-full) exigiria baixar o certificado da
// CA do Supabase (Dashboard > Database Settings > SSL Configuration) e apontar para ele
// via `ssl: { ca: ... }`, o que depende de acesso ao dashboard do projeto.
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const adapter = new PrismaPg(pool);

// Instancia o Prisma com o adaptador
const prisma = new PrismaClient({ adapter });

export default prisma;