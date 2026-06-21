# @repo/database

Prisma schema and Postgres client shared across the monorepo.

```bash
cd packages/database
bun run db:migrate    # local dev
bun run db:deploy     # production
bun run db:generate   # regenerate client
```

Requires `DATABASE_URL` in root `.env`.
