# RevMind AI — NovaBite Sales Insights

Conversational BI chatbot for NovaBite Consumer Goods sales data.

## Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key

## Run locally

1. Clone the repo and install dependencies:

```bash
npm run install:all
# or: cd backend && npm install && cd ../frontend && npm install
```

2. Copy env template and add your OpenAI key:

```bash
cp .env.example .env
# Edit .env and set OPENAI_API_KEY=sk-...
```

3. Start the API (seeds SQLite from `data/novabite_sales_data.csv` on first run):

```bash
npm run dev:backend
# or: cd backend && npm run dev
```

4. In a second terminal, start the frontend (proxies `/api` to the backend):

```bash
npm run dev:frontend
# or: cd frontend && npm run dev
```

5. Open **http://localhost:5173** — Dashboard KPIs and the revenue chart load from `/api/summary` and `/api/trends`; use **Chat** to ask sales questions via `/api/chat`.

6. Verify the API directly (optional):

```bash
curl http://localhost:3001/health
```

7. Ask a question:

```bash
curl -s -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"Which region had the highest net revenue in Q1 2024?"}'
```

**Env notes:** `VITE_API_URL` is optional. Leave it unset during local dev so the Vite proxy forwards `/api` to `http://localhost:3001` (no CORS setup needed). Set it when the frontend must call the API directly (e.g. a production build).

## LLM choice

**OpenAI (`gpt-4o-mini`)** — fast, inexpensive, and strong at following structured instructions when given precomputed numbers. The assignment dataset is small and question types are predictable, so a lightweight model with tight prompts is sufficient.

## `/api/chat` data strategy

Hybrid of **Option A** (keyword-driven SQL) and **Option B** (precomputed aggregates):

1. Parse the user question for entities: quarter, year, region, category, channel, sales rep, margin, product ranking, comparisons.
2. Run targeted SQLite aggregate queries via `backend/src/queries/chatContext.js`.
3. Always include global summary KPIs as baseline context.
4. If no keywords match, fall back to a broad reference bundle (regions, categories, channels, reps, top products).

We did **not** use tool/function calling (Option C) — unnecessary for this dataset size and adds latency/complexity.

## Prompt structure

Three parts are sent to OpenAI on every request:

### 1. System message (role + answer rules)

- Role: RevMind AI sales insights assistant for NovaBite.
- Constraint: answer **only** from provided JSON context; never invent metrics.
- Format rules: concise, lead with the answer, USD to 2 decimals, margin % formula documented.

Defined in `backend/src/services/chat.js` as `SYSTEM_PROMPT`.

### 2. User message — data context (precomputed SQL)

JSON blob built by `buildChatContext(question)`, e.g.:

```json
{
  "global_summary": { "total_net_revenue": ..., "top_region": ... },
  "revenue_by_region": [{ "region": "South", "net_revenue": 37640.11, ... }],
  "category_metrics": [{ "category": "Snacks", "gross_profit_margin_pct": 52.04, ... }],
  "units_by_sales_rep": [{ "sales_rep": "Rohan Gupta", "units": 14826, ... }],
  "revenue_by_channel": [{ "channel": "E-Commerce", "net_revenue": 360607.55, ... }],
  "top_products": [{ "product_name": "NovaBite Shampoo Coconut 400ml", ... }]
}
```

Only slices relevant to the question are included (plus global summary).

### 3. User message — question

The raw manager question appended after the context block.

**Model settings:** `gpt-4o-mini`, `temperature: 0` (deterministic, grounded answers).

## Required chat questions (verified against SQL)

| Question | Expected answer (from DB) |
|---|---|
| Which region had the highest net revenue in Q1 2024? | **South** — $37,640.11 |
| What is the gross profit margin for the Snacks category? | **52.04%** |
| Which sales rep closed the most units in 2025? | **Rohan Gupta** — 14,826 units |
| Compare E-Commerce vs Modern Trade net revenue. | **E-Commerce** $360,607.55 vs Modern Trade $334,635.29 |
| What was the best performing product in the West region? | **NovaBite Shampoo Coconut 400ml** (NB-SHMP-001) — $44,129.81 |

Test each with:

```bash
curl -s -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"<question here>"}' | jq .
```

## Tradeoffs / shortcuts

- Keyword parsing instead of an LLM router or function-calling loop — simpler and cheaper, but brittle on unusual phrasing.
- Pre-aggregated context only; no ad-hoc SQL generation by the model (avoids hallucination and injection risk).
- Chat returns `{ "answer": "..." }` at the top level (per assignment); other endpoints use `{ "data": ... }`.

## What I'd improve with more time

- Frontend chat UI with loading state and conversation history.
- Streaming SSE responses for typewriter effect.
- Unit tests for `analyzeQuestion` and `buildChatContext`.
- Smarter entity extraction (embeddings or a lightweight classifier) for edge-case phrasing.
- Response caching for repeated questions.
