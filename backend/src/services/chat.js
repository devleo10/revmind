const OpenAI = require('openai');
const config = require('../config');
const { buildChatContext } = require('../queries/chatContext');

const SYSTEM_PROMPT = `You are RevMind AI, a sales insights assistant for NovaBite Consumer Goods.

You answer questions about NovaBite sales data using ONLY the JSON data context provided in the user message.
Do not invent numbers, products, regions, channels, or sales reps that are not in the context.

Answer rules:
- Be concise and direct (2-4 sentences unless comparison detail is needed).
- Lead with the specific answer (name, region, product, rep, or percentage).
- Include the key metric with USD amounts rounded to 2 decimal places and percentages to 2 decimal places.
- For comparisons, state both values and which is higher.
- For rankings, name the top result and its metric; mention the runner-up only when useful.
- Gross profit margin % = (gross_profit / net_revenue) * 100 using values from the context.
- If the context lacks data to answer, say you do not have enough data in the provided context.`;

function buildUserPrompt(question, context) {
  return `Data context (precomputed from NovaBite SQLite sales database):
${JSON.stringify(context, null, 2)}

Question: ${question}

Answer using only the data context above.`;
}

function createOpenAIClient() {
  if (!config.openaiApiKey) {
    const error = new Error('OPENAI_API_KEY is not configured');
    error.statusCode = 500;
    throw error;
  }

  return new OpenAI({ apiKey: config.openaiApiKey });
}

async function answerQuestion(question) {
  const trimmedQuestion = question?.trim();

  if (!trimmedQuestion) {
    const error = new Error('question is required');
    error.statusCode = 400;
    throw error;
  }

  const context = buildChatContext(trimmedQuestion);
  const client = createOpenAIClient();

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(trimmedQuestion, context) },
    ],
  });

  const answer = response.choices[0]?.message?.content?.trim();

  if (!answer) {
    const error = new Error('LLM returned an empty response');
    error.statusCode = 502;
    throw error;
  }

  return { answer };
}

module.exports = {
  SYSTEM_PROMPT,
  buildUserPrompt,
  answerQuestion,
};
