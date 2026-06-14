import { useEffect, useRef, useState } from 'react';
import { askQuestion } from '../api/sales';
import { ApiError } from '../api/client';
import './Chat.css';

const SUGGESTED_QUESTIONS = [
  'Which region had the highest net revenue in Q1 2024?',
  'What is the gross profit margin for the Snacks category?',
  'Which sales rep closed the most units in 2025?',
  'Compare E-Commerce vs Modern Trade net revenue.',
  'What was the best performing product in the West region?',
];

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(question) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setError(null);
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setLoading(true);

    try {
      const answer = await askQuestion(trimmed);
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Something went wrong. Is the backend running (npm run dev:backend)?';
      setError(message);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input);
    }
  }

  const isEmpty = messages.length === 0 && !loading;

  return (
    <section className="chat-page">
      <header className="chat-page__header">
        <h1>Chat</h1>
        <p className="page-lead">
          Ask RevMind AI about NovaBite sales — revenue, margins, reps, and
          products.
        </p>
      </header>

      <div className="chat-panel glass-card">
        <div className="chat-messages" aria-live="polite">
          {isEmpty ? (
            <div className="chat-empty">
              <p className="chat-empty__title">Start a conversation</p>
              <p className="chat-empty__text">
                Try one of these sample questions or type your own below.
              </p>
              <div className="chat-suggestions">
                {SUGGESTED_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    className="chat-suggestion"
                    disabled={loading}
                    onClick={() => sendMessage(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`chat-message chat-message--${message.role}`}
                >
                  <div className="chat-bubble">{message.content}</div>
                </div>
              ))}
              {loading ? (
                <div className="chat-message chat-message--assistant">
                  <div className="chat-bubble chat-bubble--loading">
                    <span className="chat-dot" />
                    <span className="chat-dot" />
                    <span className="chat-dot" />
                  </div>
                </div>
              ) : null}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {error ? (
          <p className="chat-error" role="alert">
            {error}
          </p>
        ) : null}

        <form className="chat-composer" onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            className="chat-input"
            rows={1}
            placeholder="Ask a sales question…"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            aria-label="Question"
          />
          <button
            type="submit"
            className="chat-send"
            disabled={loading || !input.trim()}
          >
            {loading ? 'Sending…' : 'Send'}
          </button>
        </form>
      </div>
    </section>
  );
}

export default Chat;
