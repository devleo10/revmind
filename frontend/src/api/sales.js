import { api } from './client';

export async function fetchSummary() {
  const response = await api.get('/api/summary');
  return response.data;
}

export async function fetchTrends() {
  const response = await api.get('/api/trends');
  return response.data.trends;
}

export async function askQuestion(question) {
  const response = await api.post('/api/chat', { question });
  return response.answer;
}
