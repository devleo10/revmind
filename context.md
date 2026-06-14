# RevMind AI — Full-Stack Take-Home Assignment
**Role:** Full-Stack Engineer (Fresher)
**Time budget:** 48–72 hours

---

## Background

RevMind AI builds AI-enabled business intelligence tools for CPG and Pharma companies.
One of our core products is a **conversational insights chatbot** that lets sales managers
ask natural language questions about their business — on mobile or web — and get instant answers.

Your task is to build a **miniature version of this product** for a fictional CPG company called
**NovaBite Consumer Goods**.

---

## How to Work on This Assignment

- **Do not work locally and upload at the end.** Commit and push incrementally to GitHub as you build. We should be able to see your progress unfold in real time.
- **Your Git history is part of the submission.** We want to see how you designed the architecture, what decisions you made along the way, and what mistakes you caught and fixed. Issues and pull requests are an important part of this assessment — use them.
- **You may use AI tools** (ChatGPT, Claude, Copilot, etc.). However, make sure you fully understand every piece of code you submit. If you are selected from this round, you will be expected to walk through your implementation in detail during the final interview — including design choices, tradeoffs, and anything AI helped you with.

---

## The Dataset

You are provided `novabite_sales_data.csv` — 1,000 transaction rows spanning Jan 2024 to Dec 2025.

| Column | Description |
|---|---|
| `transaction_id` | Unique ID per sale event |
| `date` | Transaction date (YYYY-MM-DD) |
| `month` | Year-month (YYYY-MM) |
| `quarter` | Quarter label (e.g. Q1-2024) |
| `sku` | Product SKU code |
| `product_name` | Full product name |
| `category` | Product category (Personal Care, Snacks, Beverages, Home Care) |
| `subcategory` | Product subcategory |
| `region` | Sales region (North, South, East, West, Central) |
| `channel` | Sales channel (Modern Trade, General Trade, E-Commerce, Direct to Consumer) |
| `sales_rep` | Sales representative name |
| `units_sold` | Number of units sold |
| `unit_price_usd` | Price per unit in USD |
| `gross_revenue_usd` | Revenue before discount |
| `discount_pct` | Discount applied (%) |
| `net_revenue_usd` | Revenue after discount |
| `cogs_usd` | Cost of goods sold |
| `gross_profit_usd` | Gross profit (net revenue - COGS) |

---

## What You Must Build

### 1. Backend API

Build a REST API (Node.js/Express or Python/FastAPI — your choice).

**Required endpoints:**

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/products` | Return distinct products with total net revenue and units sold |
| `GET` | `/api/summary` | Return top-level KPIs: total net revenue, total units, gross profit margin %, top region, top channel, top product |
| `GET` | `/api/trends` | Return monthly net revenue aggregated by month (for chart rendering) |
| `POST` | `/api/chat` | Accept `{ "question": "..." }`, return `{ "answer": "..." }` |

**Rules:**
- Load `novabite_sales_data.csv` into SQLite on startup using a seed script
- The `/api/chat` endpoint must call an LLM API (Anthropic Claude or OpenAI) and include relevant data context in the prompt so it answers accurately
- No hosted database required — SQLite file is fine

---

### 2. Frontend

Build a web UI (React — create-react-app or Vite).

**Required screens:**

**Dashboard screen:**
- 3 KPI cards: Total Net Revenue, Gross Profit Margin %, Top Region
- A line or bar chart showing monthly net revenue trend (use any charting library)

**Chat screen:**
- A text input where the manager types a question
- The question is sent to `/api/chat`
- The response is displayed below in a clean, readable format
- Show a loading state while waiting

---

### 3. Example questions the chat should answer correctly

Your LLM integration will be tested against these:

1. "Which region had the highest net revenue in Q1 2024?"
2. "What is the gross profit margin for the Snacks category?"
3. "Which sales rep closed the most units in 2025?"
4. "Compare E-Commerce vs Modern Trade net revenue."
5. "What was the best performing product in the West region?"

---

## How to Submit

1. Push your work to a **public GitHub repository**.
2. Once done, submit your repo link using this form (one submission per candidate): **[(https://docs.google.com/forms/d/1rKNEQQcB39G_UeK0UKbCUshl1D1Wj-t-AVJ8m615KSc/edit)]**

> Submissions sent via email or any other channel will not be reviewed.

---

## Submission Requirements

Your GitHub repo must contain:

```
├── backend/
│   ├── ... your API code
│   └── seed.js (or seed.py)
├── frontend/
│   └── ... your React code
├── data/
│   └── novabite_sales_data.csv
├── .env.example         ← required, no real keys
├── README.md            ← required (see below)
└── docker-compose.yml   ← optional but valued
```

**README.md must include:**
1. How to run the project locally (step by step)
2. Which LLM you used and why
3. How you structured the prompt in `/api/chat`
4. What you would improve with more time
5. Any tradeoffs or shortcuts you knowingly made

---

## Evaluation Rubric

| Dimension | Weight |
|---|---|
| Working product (runs from README without help) | 25% |
| LLM integration quality (prompt design, answer accuracy) | 20% |
| Code quality (naming, structure, no spaghetti) | 20% |
| Git hygiene (commit history, no secrets, logical progression) | 15% |
| API design (sensible routes, consistent responses, error handling) | 10% |
| README / communication (clear tradeoffs, honest about gaps) | 10% |

**Automatic disqualifiers:**
- Repo does not run from the README
- API keys or secrets committed to git
- Single commit containing all the work
- README is a framework default (not written by you)

---

## Bonus (not required)

These are not expected but will stand out:

- Streaming response from the LLM (typewriter effect in UI)
- Unit tests on at least one backend module
- React Native screen instead of (or alongside) web
- A second chart (e.g. revenue by category or region breakdown)

---

## Notes

- Use free-tier API keys. Anthropic and OpenAI both offer free credits for new accounts.
- You are not being judged on UI polish. A clean, functional interface beats a styled but broken one.
- Commit as you go. We read the git history — a single final commit is a red flag.
- If something is genuinely too complex, skip it and document why in the README. Honesty about tradeoffs is valued.

---

Good luck. Build something you'd be proud to show in an interview.
