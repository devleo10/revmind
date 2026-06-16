# RevMind AI — NovaBite Sales Insights

**Repository:** [github.com/devleo10/revmind](https://github.com/devleo10/revmind)

Conversational BI chatbot for NovaBite Consumer Goods sales data. A React dashboard plus Express API backed by SQLite, with natural-language Q&A powered by OpenAI.

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Node.js 18+, Express 5, better-sqlite3 |
| Frontend | React 18, Vite, React Router |
| Data | `data/novabite_sales_data.csv` → SQLite (`data/novabite.db`) |
| LLM | OpenAI `gpt-4o-mini` |

## Prerequisites

- **Node.js 18+** (`node -v`)
- **npm**
- **OpenAI API key** ([platform.openai.com](https://platform.openai.com/api-keys))

## Run locally (step by step)

### 1. Clone and install dependencies

```bash
git clone https://github.com/devleo10/revmind.git
cd revmind
npm run install:all
```

This installs packages in both `backend/` and `frontend/`. Alternatively:

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment

Copy the env template to the **repo root** (`backend/src/config.js` loads `.env` from there):

```bash
cp .env.example .env
```

Edit `.env` and set your key:

```
OPENAI_API_KEY=sk-...
```

Other variables are optional for local dev:

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `3001` | Backend listen port |
| `DATABASE_PATH` | `data/novabite.db` (repo root) | Leave unset unless you need a custom path |
| `CORS_ORIGINS` | localhost dev origins | Only needed for non-proxy setups |
| `VITE_API_URL` | *(unset)* | Leave unset so Vite proxies `/api` → `:3001` |

**Do not commit `.env`** — only `.env.example` belongs in git.

### 3. Start the backend

From the repo root:

```bash
npm run dev:backend
```

Or from `backend/`:

```bash
npm run dev
```

On first startup the server seeds SQLite from `data/novabite_sales_data.csv` (1,000 rows). You should see:

```
Server listening on http://localhost:3001
```

Verify the API:

```bash
curl http://localhost:3001/health
# → {"data":{"status":"ok","transactions":1000}}
```

### 4. Start the frontend (second terminal)

From the repo root:

```bash
npm run dev:frontend
```

Or from `frontend/`:

```bash
npm run dev
```

Open **http://localhost:5173**.

- **Dashboard** — KPI cards (revenue, margin %, top region), monthly revenue chart, and category breakdown chart (`/api/summary`, `/api/trends`, `/api/categories`)
- **Chat** — ask sales questions via `/api/chat` (loading dots while waiting)

### 5. Test chat from the command line (optional)

```bash
curl -s -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"Which region had the highest net revenue in Q1 2024?"}'
```

Expected shape: `{ "answer": "..." }`.

### 6. Production build (optional)

```bash
cd frontend
VITE_API_URL=http://localhost:3001 npm run build
npm run preview
```

Set `VITE_API_URL` to your deployed API URL when the frontend and backend are not on the same host.

### Troubleshooting

| Symptom | Fix |
|---|---|
| `OPENAI_API_KEY is not configured` | Set the key in root `.env` and restart the backend |
| Frontend can't reach API | Ensure backend is on `:3001`; leave `VITE_API_URL` unset during dev |
| `transactions: 0` on `/health` | Delete `data/novabite.db` and restart to re-seed |
| Port already in use | Change `PORT` in `.env` and update the Vite proxy target in `frontend/vite.config.js` |

---

## LLM choice

**OpenAI `gpt-4o-mini`**

| Reason | Detail |
|---|---|
| Cost & latency | Cheapest/fastest GPT-4-class model; chat is not streaming so response time matters |
| Structured grounding | Strong at following system instructions when numbers are precomputed in JSON |
| Dataset fit | 1,000 rows, ~5 predictable question types — no need for a larger model or tool-calling loop |
| Determinism | `temperature: 0` gives stable, reproducible answers for demo/testing |

Anthropic Claude would work equally well; OpenAI was chosen for familiar SDK ergonomics and free-tier credits.

---

## `/api/chat` — data strategy

Hybrid of **precomputed SQL aggregates** (not raw rows) plus **keyword-driven context selection**:

```
User question
    → analyzeQuestion()        (regex/keyword entity detection)
    → buildChatContext()       (targeted SQLite aggregates + answer_hints)
    → tryDirectAnswer()        (SQL-verified shortcut for common patterns)
        → if matched: { "answer": "..." }   (no LLM call)
        → else:
            → buildUserPrompt() (JSON context + question)
            → OpenAI chat completion (with retries + timeout)
            → { "answer": "..." }
```

Implementation: `backend/src/queries/chatContext.js` (context), `backend/src/services/chatInsights.js` (direct answers), and `backend/src/services/chat.js` (LLM call).

### Entity detection

`analyzeQuestion()` extracts:

- Quarter (`Q1 2024` → `Q1-2024`, `first quarter of 2024` → `Q1-2024`), year (`2024` / `2025`)
- Regions, categories, channels (word-boundary regex + aliases)
- Channel aliases: `ecommerce`, `e-commerce`, `dtc`, etc.
- Category aliases: `snack` → Snacks, etc.
- Intent flags: reps, margin, products, region ranking, channel comparison
- Product vs region disambiguation (e.g. “best product in West” is not treated as a region revenue question)

### Context slices (included only when relevant)

| Context key | SQL source | Triggered by |
|---|---|---|
| `global_summary` | Always | Baseline KPIs from `/api/summary` logic |
| `revenue_by_region` | `GROUP BY region` | Region/revenue/quarter keywords |
| `category_metrics` | `GROUP BY category` + margin % | Margin or category mention |
| `units_by_sales_rep` | `GROUP BY sales_rep` | Rep / "most units" phrasing |
| `revenue_by_channel` | `GROUP BY channel` | Channel or comparison keywords |
| `top_products` | `GROUP BY sku` | Product keywords or single region |

If no keywords match, a **fallback bundle** (all regions, categories, channels, reps, top 5 products) is sent so the model still has enough data.

We did **not** use LLM tool/function calling — unnecessary for this dataset size and adds latency, cost, and SQL-injection surface.

---

## `/api/chat` — prompt design

Every request sends two messages to OpenAI:

### 1. System message (`SYSTEM_PROMPT`)

Defined in `backend/src/services/chat.js`:

- Role: RevMind AI sales insights assistant for NovaBite
- Hard constraint: answer **only** from the JSON context; never invent metrics
- Format rules: concise (2–4 sentences), lead with the answer, USD to 2 decimals, margin % = `(gross_profit / net_revenue) × 100`
- Fallback: say data is insufficient if context doesn't cover the question

### 2. User message (`buildUserPrompt`)

Single user turn containing:

1. **Data context** — pretty-printed JSON from `buildChatContext(question)`
2. **Question** — the raw manager question

Example context shape:

```json
{
  "global_summary": { "total_net_revenue": 1234567.89, "top_region": "South", "..." : "..." },
  "revenue_by_region": [{ "region": "South", "net_revenue": 37640.11, "units": 1234, "gross_profit": 8901.23 }],
  "category_metrics": [{ "category": "Snacks", "gross_profit_margin_pct": 52.04, "..." : "..." }]
}
```

Only slices relevant to the question are included (plus `global_summary`).

### Model settings

```js
{ model: 'gpt-4o-mini', temperature: 0 }
```

---

## Chat robustness improvements

Post-submission hardening for more reliable answers in demo and production:

### 1. Smarter question parsing
- Informal channel phrasing (`ecommerce` vs `E-Commerce`, `dtc`, etc.)
- Category aliases (`snack` → Snacks)
- Natural quarter phrasing (`first quarter of 2024`)
- Clearer intent detection so product and region questions do not collide

### 2. SQL-verified direct answers
For the five assignment-style questions (and similar patterns), the backend:
1. Precomputes **answer hints** from SQLite (`computeAnswerHints()`)
2. Returns the answer **directly from SQL** via `tryDirectAnswer()` — no LLM call
3. Falls back to OpenAI only for open-ended questions

Benefits: accurate numbers, faster responses, lower API cost, no hallucinated metrics on known question types.

### 3. Answer hints for LLM fallback
When the LLM is used, `answer_hints` are included in the JSON context so the model prefers SQL-verified facts over re-deriving from raw slices.

### 4. Resilient API layer
- Max question length (500 characters)
- OpenAI retry on rate limits / 5xx (2 retries with backoff)
- 30s request timeout with user-friendly error messages
- Request body validation on `POST /api/chat`

### 5. Chat UI improvements
- Clearer production error messages (including cold-start hint for Render free tier)
- **Retry** button on failed questions

---

## Required chat questions (verified against SQL)

| Question | Expected answer (from DB) |
|---|---|
| Which region had the highest net revenue in Q1 2024? | **South** — $37,640.11 |
| What is the gross profit margin for the Snacks category? | **52.04%** |
| Which sales rep closed the most units in 2025? | **Rohan Gupta** — 14,826 units |
| Compare E-Commerce vs Modern Trade net revenue. | **E-Commerce** $360,607.55 vs Modern Trade $334,635.29 |
| What was the best performing product in the West region? | **NovaBite Shampoo Coconut 400ml** (NB-SHMP-001) — $44,129.81 |

```bash
curl -s -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"<question here>"}' | jq .
```

---

## Tradeoffs / shortcuts

Honest list of deliberate compromises:

- **Keyword parsing, not an LLM router** — `analyzeQuestion()` uses regex/keyword heuristics (with aliases). Fast and free, but still brittle on unusual phrasing (e.g. "Southwest" won't map to a region).
- **Pre-aggregated context only** — the model never writes SQL. Eliminates hallucinated numbers and injection risk, but can't answer arbitrary ad-hoc queries outside the prepared slices.
- **No tool/function-calling loop** — one LLM call per question. Simpler and cheaper; can't self-correct if the wrong context slice was selected.
- **Inconsistent API response shapes** — `/api/chat` returns `{ "answer": "..." }` (per assignment spec); other routes wrap payloads in `{ "data": ... }`.
- **No Docker / docker-compose** — two-terminal local setup only.
- **Chat history is client-side only** — messages live in React state; refreshing the page clears the thread; nothing is persisted server-side.
- **Single-process SQLite** — fine for a take-home; would need Postgres + connection pooling for production concurrency.

---

## Tests

Backend unit/integration tests use Node's built-in test runner (no extra test framework):

```bash
npm test
```

From `backend/`:

```bash
npm test
```

`backend/test/chatContext.test.js` covers:

- `analyzeQuestion()` entity detection for all five assignment chat questions
- Alias and informal phrasing detection (e.g. `ecommerce`, `snack`, `first quarter of 2024`)
- SQL-backed checks for Q1 2024 top region, Snacks margin %, and 2025 top rep
- `buildChatContext()` slice selection for targeted questions
- `tryDirectAnswer()` SQL-verified responses for all five assignment questions
- `computeAnswerHints()` channel comparison values

Tests seed a temporary SQLite file under `/tmp` so your local `data/novabite.db` is untouched.

---

## Bonus features

- **Second dashboard chart** — `GET /api/categories` + “Net revenue by category” bar chart alongside monthly trends
- **Backend tests** — see [Tests](#tests) above
- **Chat robustness** — SQL direct answers, answer hints, alias parsing, API retries — see [Chat robustness improvements](#chat-robustness-improvements)
- **Production deploy** — backend on Render, frontend on Vercel (`frontend/vercel.json` SPA rewrites for `/dashboard` and `/chat` refresh)

---

## What I'd improve with more time

- **Streaming SSE** from the LLM with a typewriter effect in the chat UI.
- **Smarter entity extraction** — embeddings or a small classifier for paraphrases regex still misses.
- **Response caching** — hash `(question + context)` to skip duplicate OpenAI calls (direct SQL path already skips LLM for common questions).
- **Persistent chat sessions** — store threads in SQLite or localStorage with export.
- **docker-compose.yml** — one-command spin-up for reviewers.
- **Rate limiting & API key validation** on `/api/chat` before hitting OpenAI.
- **Unified error envelope** across all endpoints (`{ error: { code, message } }`).

---

## Project layout

```
├── backend/
│   ├── seed.js                 # CSV → SQLite loader
│   ├── test/                   # node:test unit/integration tests
│   └── src/
│       ├── index.js            # Express app entry
│       ├── queries/            # SQL for summary, trends, categories, chat context
│       ├── routes/             # /api/products, summary, trends, categories, chat
│       └── services/
│           ├── chat.js         # OpenAI integration + retries
│           └── chatInsights.js # SQL-verified direct answers
├── frontend/
│   ├── vercel.json             # SPA rewrites for client-side routes
│   └── src/pages/              # Dashboard, Chat
├── data/
│   ├── novabite_sales_data.csv
│   └── novabite.db             # generated on first run (gitignored)
├── .env.example
└── README.md
```
