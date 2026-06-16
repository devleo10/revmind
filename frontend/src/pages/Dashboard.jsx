import { useEffect, useState } from 'react';
import {
  fetchCategoryBreakdown,
  fetchSummary,
  fetchTrends,
} from '../api/sales';
import { formatCurrency, formatNumber, formatPercent } from '../utils/format';
import './Dashboard.css';

const CATEGORY_BAR_COLORS = [
  'linear-gradient(90deg, #7c3aed, #c4b5fd)',
  'linear-gradient(90deg, #2563eb, #93c5fd)',
  'linear-gradient(90deg, #059669, #6ee7b7)',
  'linear-gradient(90deg, #d97706, #fcd34d)',
];

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [summaryData, trendsData, categoryData] = await Promise.all([
          fetchSummary(),
          fetchTrends(),
          fetchCategoryBreakdown(),
        ]);

        if (!cancelled) {
          setSummary(summaryData);
          setTrends(trendsData);
          setCategories(categoryData);
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
      <section className="dashboard">
        <header className="dashboard__header">
          <h1>Dashboard</h1>
          <p className="page-lead">Loading NovaBite sales overview…</p>
        </header>
        <div className="dashboard-state glass-card">Fetching KPIs from the API…</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="dashboard">
        <header className="dashboard__header">
          <h1>Dashboard</h1>
        </header>
        <div className="dashboard-state dashboard-state--error glass-card" role="alert">
          {error}
        </div>
      </section>
    );
  }

  const maxRevenue = Math.max(...trends.map((row) => row.net_revenue), 1);
  const maxCategoryRevenue = Math.max(
    ...categories.map((row) => row.net_revenue),
    1,
  );

  return (
    <section className="dashboard">
      <header className="dashboard__header">
        <h1>Dashboard</h1>
        <p className="page-lead">
          Key performance indicators across NovaBite sales transactions.
        </p>
      </header>

      <div className="kpi-grid">
        <article className="kpi-card glass-card">
          <p className="kpi-card__label">Total net revenue</p>
          <p className="kpi-card__value">
            {formatCurrency(summary.total_net_revenue)}
          </p>
        </article>
        <article className="kpi-card glass-card">
          <p className="kpi-card__label">Gross profit margin</p>
          <p className="kpi-card__value">
            {formatPercent(summary.gross_profit_margin_pct)}
          </p>
        </article>
        <article className="kpi-card glass-card">
          <p className="kpi-card__label">Top region</p>
          <p className="kpi-card__value">{summary.top_region.name}</p>
          <p className="kpi-card__meta">
            {formatCurrency(summary.top_region.net_revenue)} net revenue
          </p>
        </article>
      </div>

      <div className="highlight-grid">
        <article className="highlight-card glass-card">
          <p className="highlight-card__label">Units sold</p>
          <p className="highlight-card__title">
            {formatNumber(summary.total_units)}
          </p>
          <p className="highlight-card__meta">Across all transactions</p>
        </article>
        <article className="highlight-card glass-card">
          <p className="highlight-card__label">Top channel</p>
          <p className="highlight-card__title">{summary.top_channel.name}</p>
          <p className="highlight-card__meta">
            {formatCurrency(summary.top_channel.net_revenue)} net revenue
          </p>
        </article>
        <article className="highlight-card glass-card">
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

      <div className="charts-grid">
        {trends.length > 0 ? (
          <article className="trends-card glass-card">
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

        {categories.length > 0 ? (
          <article className="trends-card glass-card">
            <h2 className="trends-card__title">Net revenue by category</h2>
            <div className="trends-list">
              {categories.map((row, index) => (
                <div key={row.category} className="trend-row trend-row--category">
                  <span className="trend-row__month">{row.category}</span>
                  <div className="trend-row__bar-wrap">
                    <div
                      className="trend-row__bar"
                      style={{
                        width: `${(row.net_revenue / maxCategoryRevenue) * 100}%`,
                        background:
                          CATEGORY_BAR_COLORS[index % CATEGORY_BAR_COLORS.length],
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
      </div>
    </section>
  );
}

export default Dashboard;
