# SlickByte — Your Plate, Decoded

## Overview

SlickByte is a meal photo analysis web app. Users upload a food photo, get instant AI-powered nutritional analysis (calories, macros, health score), and can dig deeper with smart insight buttons (protein breakdown, healthier alternatives, fat loss evaluation).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/slickbyte), served locally on port `5173`
- **API framework**: Express 5 (artifacts/api-server), at route `/api`
- **AI**: Google Gemini via `@google/generative-ai`
- **Database**: PostgreSQL + Prisma
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle for server)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── slickbyte/          # React + Vite frontend (previewPath: /)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   └── integrations-openai-ai-server/  # Legacy OpenAI integration utilities
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package
```

## Key Features

- Photo upload with instant preview
- AI meal analysis: food name, calories (large display), confidence level, quick insight tag
- Macro breakdown: Protein / Carbs / Fats / Fiber with progress bars
- Health score (1-10)
- Three smart action buttons: Protein Breakdown, Make it Healthier, Good for Fat Loss?
- Soft retention hooks: "Track today's calories?" / "Save this meal?"
- Beautiful one-page scroll landing with Epilogue + Manrope fonts
- Matcha green / lilac / peach color palette

## API Endpoints

- `POST /api/meals/analyze` — Upload base64 image, get full nutritional analysis
- `POST /api/meals/insight` — Get specific insight (protein_breakdown | make_healthier | fat_loss)
- `GET /api/healthz` — Health check

## AI Integration

The meal-analysis routes currently call Google Gemini directly from `artifacts/api-server/src/routes/meals.ts`.

Required API server environment variables:

- `GEMINI_API_KEY` — required
- `DATABASE_URL` — required for Prisma-backed caching and request logging
- `PORT` — defaults to the API server port you want to bind
- `GEMINI_MODEL` — optional, defaults in code to `gemini-2.5-flash`

## Development

- `pnpm --filter @workspace/api-server run dev` — Run the API server on port `3000`
- `pnpm --filter @workspace/slickbyte run dev` — Run the frontend on port `5173` with `/api` proxied to the API server
- `pnpm --filter @workspace/api-server run prisma:generate` — Generate the Prisma client
- `pnpm --filter @workspace/api-server run prisma:migrate:init` — Create and apply the initial Prisma migration via `prisma.config.ts`
- `pnpm --filter @workspace/api-server exec prisma migrate dev --name <migration-name>` — Create additional named migrations
- `pnpm --filter @workspace/api-spec run codegen` — Regenerate API hooks/schemas after spec changes
- `pnpm run typecheck` — Full type check

## Notes

- No database is used — this is a stateless AI analysis service
- After any OpenAPI spec changes, run codegen before building
