# RevMind AI — NovaBite Sales Insights

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
git clone <your-repo-url>
cd revmind-assignment
npm run install:all
```

This installs packages in both `backend/` and `frontend/`. Alternatively:

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment

Copy the env template at the **repo root** (the backend reads `../../.env` relative to its config):

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

- **Dashboard** — KPI cards and monthly revenue chart (`/api/summary`, `/api/trends`)
- **Chat** — ask sales questions via `/api/chat` (loading dots while waiting)

### 5. Test chat from the command line (optional)

```bash
curl -s -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"Which region had the highest net revenue in Q1 2024?"}'
```

Expected shape: `{ "answer": "..." }`.

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
    → analyzeQuestion()     (regex/keyword entity detection)
    → buildChatContext()    (targeted SQLite aggregates)
    → buildUserPrompt()     (JSON context + question)
    → OpenAI chat completion
    → { "answer": "..." }
```

Implementation: `backend/src/queries/chatContext.js` (context) and `backend/src/services/chat.js` (LLM call).

### Entity detection

`analyzeQuestion()` extracts:

- Quarter (`Q1 2024` → `Q1-2024`), year (`2024` / `2025`)
- Regions, categories, channels (word-boundary regex)
- Intent flags: reps, margin, products, region ranking, channel comparison

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

- **Keyword parsing, not an LLM router** — `analyzeQuestion()` uses regex/keyword heuristics. Fast and free, but brittle on unusual phrasing (e.g. "Southwest" won't map to a region).
- **Pre-aggregated context only** — the model never writes SQL. Eliminates hallucinated numbers and injection risk, but can't answer arbitrary ad-hoc queries outside the prepared slices.
- **No tool/function-calling loop** — one LLM call per question. Simpler and cheaper; can't self-correct if the wrong context slice was selected.
- **Inconsistent API response shapes** — `/api/chat` returns `{ "answer": "..." }` (per assignment spec); other routes wrap payloads in `{ "data": ... }`.
- **No automated tests** — accuracy was verified manually against the five required questions and `/health` row count.
- **No Docker / docker-compose** — two-terminal local setup only.
- **Chat history is client-side only** — messages live in React state; refreshing the page clears the thread; nothing is persisted server-side.
- **Single-process SQLite** — fine for a take-home; would need Postgres + connection pooling for production concurrency.

---

## What I'd improve with more time

- **Unit/integration tests** for `analyzeQuestion`, `buildChatContext`, and the five required chat answers (regression guard).
- **Streaming SSE** from the LLM with a typewriter effect in the chat UI.
- **Smarter entity extraction** — lightweight classifier or embeddings instead of regex, to handle paraphrased questions.
- **Response caching** — hash `(question + context)` to skip duplicate OpenAI calls.
- **Persistent chat sessions** — store threads in SQLite or localStorage with export.
- **Second dashboard chart** — revenue breakdown by category or region.
- **docker-compose.yml** — one-command spin-up for reviewers.
- **Rate limiting & API key validation** on `/api/chat` before hitting OpenAI.
- **Unified error envelope** across all endpoints (`{ error: { code, message } }`).
- **Production build docs** — `npm run build` in frontend with `VITE_API_URL` pointing at a deployed API.

---

## Project layout

```
├── backend/
│   ├── seed.js                 # CSV → SQLite loader
│   └── src/
│       ├── index.js            # Express app entry
│       ├── queries/            # SQL for summary, trends, chat context
│       ├── routes/             # /api/products, summary, trends, chat
│       └── services/chat.js    # OpenAI integration
├── frontend/
│   └── src/pages/              # Dashboard, Chat
├── data/
│   ├── novabite_sales_data.csv
│   └── novabite.db             # generated on first run (gitignored)
├── .env.example
└── README.md
```
