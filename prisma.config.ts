import "dotenv/config";
import { defineConfig } from "prisma/config";

// Also try loading .env.local
try {
  const fs = require('fs');
  const path = require('path');
  const envLocal = path.join(__dirname, '.env.local');
  if (fs.existsSync(envLocal)) {
    const lines = fs.readFileSync(envLocal, 'utf8').split('\n');
    lines.forEach((line: string) => {
      const match = line.match(/^([^#=][^=]*)=(.*)$/);
      if (match) {
        process.env[match[1]] = match[2].replace(/^"|"$/g, '');
      }
    });
  }
} catch {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"] ?? "file:./dev.db",
  },
});
