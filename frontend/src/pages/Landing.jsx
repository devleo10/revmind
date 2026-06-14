import { Link } from 'react-router-dom';
import './Landing.css';

function Landing() {
  return (
    <section className="landing">
      <div className="landing__content">
        <p className="landing__proof">
          <span className="landing__avatars" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          Trusted insights for NovaBite Consumer Goods
        </p>

        <h1 className="landing__title">Clarity Above the Noise</h1>

        <p className="landing__lead">
          Ask natural language questions about sales, explore KPIs, and make
          sense of your CPG data — in a space designed for insight, not
          distraction.
        </p>

        <div className="landing__actions">
          <Link to="/dashboard" className="landing__btn landing__btn--primary">
            View Dashboard
          </Link>
          <Link to="/chat" className="landing__btn landing__btn--secondary">
            Ask AI
          </Link>
        </div>
      </div>
    </section>
  );
}

export default Landing;
