const OpenAI = require('openai');
const config = require('../config');
const { buildChatContext } = require('../queries/chatContext');
const { tryDirectAnswer } = require('./chatInsights');

const MAX_QUESTION_LENGTH = 500;
const LLM_TIMEOUT_MS = 30_000;
const LLM_MAX_RETRIES = 2;
const LLM_RETRY_DELAY_MS = 1_000;

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
- When answer_hints are present, treat them as SQL-verified facts and prefer them over re-deriving from raw slices.
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

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableOpenAiError(error) {
  const status = error?.status ?? error?.statusCode;
  return status === 429 || (status >= 500 && status <= 599);
}

function mapOpenAiError(error) {
  const status = error?.status ?? error?.statusCode;

  if (status === 429) {
    const mapped = new Error(
      'The AI service is busy right now. Please try again in a moment.',
    );
    mapped.statusCode = 503;
    return mapped;
  }

  if (status === 401) {
    const mapped = new Error('OpenAI API key is invalid or expired.');
    mapped.statusCode = 500;
    return mapped;
  }

  if (error?.name === 'AbortError') {
    const mapped = new Error('The AI request timed out. Please try again.');
    mapped.statusCode = 504;
    return mapped;
  }

  const mapped = new Error('Unable to generate an answer right now. Please try again.');
  mapped.statusCode = 502;
  return mapped;
}

async function createChatCompletion(client, messages) {
  let lastError;

  for (let attempt = 0; attempt <= LLM_MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

    try {
      return await client.chat.completions.create(
        {
          model: 'gpt-4o-mini',
          temperature: 0,
          messages,
        },
        { signal: controller.signal },
      );
    } catch (error) {
      lastError = error;

      if (attempt < LLM_MAX_RETRIES && isRetryableOpenAiError(error)) {
        await sleep(LLM_RETRY_DELAY_MS * (attempt + 1));
        continue;
      }

      throw mapOpenAiError(error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw mapOpenAiError(lastError);
}

async function answerQuestion(question) {
  const trimmedQuestion = typeof question === 'string' ? question.trim() : '';

  if (!trimmedQuestion) {
    const error = new Error('question is required');
    error.statusCode = 400;
    throw error;
  }

  if (trimmedQuestion.length > MAX_QUESTION_LENGTH) {
    const error = new Error(
      `question must be ${MAX_QUESTION_LENGTH} characters or fewer`,
    );
    error.statusCode = 400;
    throw error;
  }

  const { context, analysis, answerHints } = buildChatContext(trimmedQuestion);
  const directAnswer = tryDirectAnswer(analysis, answerHints);

  if (directAnswer) {
    return { answer: directAnswer, source: 'sql' };
  }

  const client = createOpenAIClient();
  const response = await createChatCompletion(client, [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(trimmedQuestion, context) },
  ]);

  const answer = response.choices[0]?.message?.content?.trim();

  if (!answer) {
    const error = new Error('LLM returned an empty response');
    error.statusCode = 502;
    throw error;
  }

  return { answer, source: 'llm' };
}

module.exports = {
  SYSTEM_PROMPT,
  buildUserPrompt,
  answerQuestion,
  MAX_QUESTION_LENGTH,
};
