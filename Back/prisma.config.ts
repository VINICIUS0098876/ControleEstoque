import { defineConfig } from '@prisma/config'
import dotenv from 'dotenv'
import process from 'process'

// Força o carregamento do arquivo .env
dotenv.config()

export default defineConfig({
  datasource: {
    url: process.env.DIRECT_URL as string,
  }
})