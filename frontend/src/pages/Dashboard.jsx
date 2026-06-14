import { useEffect, useState } from 'react';
import { fetchSummary, fetchTrends } from '../api/sales';
import { formatCurrency, formatNumber, formatPercent } from '../utils/format';
import './Dashboard.css';

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [summaryData, trendsData] = await Promise.all([
          fetchSummary(),
          fetchTrends(),
        ]);

        if (!cancelled) {
          setSummary(summaryData);
          setTrends(trendsData);
        }
      } catch {
        if (!cancelled) {
          setError(
            'Could not load dashboard data. Make sure the backend is running (npm run dev:backend).',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section>
        <header className="dashboard__header">
          <h1>Dashboard</h1>
          <p className="page-lead">Loading NovaBite sales overview…</p>
        </header>
        <div className="dashboard-state">Fetching KPIs from the API…</div>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <header className="dashboard__header">
          <h1>Dashboard</h1>
        </header>
        <div className="dashboard-state dashboard-state--error" role="alert">
          {error}
        </div>
      </section>
    );
  }

  const maxRevenue = Math.max(...trends.map((row) => row.net_revenue), 1);

  return (
    <section>
      <header className="dashboard__header">
        <h1>Dashboard</h1>
        <p className="page-lead">
          Key performance indicators across NovaBite sales transactions.
        </p>
      </header>

      <div className="kpi-grid">
        <article className="kpi-card">
          <p className="kpi-card__label">Total net revenue</p>
          <p className="kpi-card__value">
            {formatCurrency(summary.total_net_revenue)}
          </p>
        </article>
        <article className="kpi-card">
          <p className="kpi-card__label">Units sold</p>
          <p className="kpi-card__value">
            {formatNumber(summary.total_units)}
          </p>
        </article>
        <article className="kpi-card">
          <p className="kpi-card__label">Gross profit margin</p>
          <p className="kpi-card__value">
            {formatPercent(summary.gross_profit_margin_pct)}
          </p>
        </article>
      </div>

      <div className="highlight-grid">
        <article className="highlight-card">
          <p className="highlight-card__label">Top region</p>
          <p className="highlight-card__title">{summary.top_region.name}</p>
          <p className="highlight-card__meta">
            {formatCurrency(summary.top_region.net_revenue)} net revenue
          </p>
        </article>
        <article className="highlight-card">
          <p className="highlight-card__label">Top channel</p>
          <p className="highlight-card__title">{summary.top_channel.name}</p>
          <p className="highlight-card__meta">
            {formatCurrency(summary.top_channel.net_revenue)} net revenue
          </p>
        </article>
        <article className="highlight-card">
          <p className="highlight-card__label">Top product</p>
          <p className="highlight-card__title">
            {summary.top_product.product_name}
          </p>
          <p className="highlight-card__meta">
            {summary.top_product.sku} ·{' '}
            {formatCurrency(summary.top_product.net_revenue)}
          </p>
        </article>
      </div>

      {trends.length > 0 ? (
        <article className="trends-card">
          <h2 className="trends-card__title">Monthly net revenue</h2>
          <div className="trends-list">
            {trends.map((row) => (
              <div key={row.month} className="trend-row">
                <span className="trend-row__month">{row.month}</span>
                <div className="trend-row__bar-wrap">
                  <div
                    className="trend-row__bar"
                    style={{
                      width: `${(row.net_revenue / maxRevenue) * 100}%`,
                    }}
                  />
                </div>
                <span className="trend-row__value">
                  {formatCurrency(row.net_revenue)}
                </span>
              </div>
            ))}
          </div>
        </article>
      ) : null}
    </section>
  );
}

export default Dashboard;
