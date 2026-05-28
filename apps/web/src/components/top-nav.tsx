import { Link } from "@tanstack/react-router";

export const TopNav = () => {
  return (
    <nav className="top-nav" aria-label="Primary">
      <div className="nav-left">
        <span className="brand-mark">MM</span>
        <span className="brand-name">Market Maker</span>
      </div>
      <div className="nav-links">
        <Link to="/trade/$symbol" params={{ symbol: "BTC" }}>
          Exchange
        </Link>
        <Link to="/markets">Markets</Link>
        <a href="#">Futures</a>
      </div>
      <button type="button" className="primary-pill">
        Deposit
      </button>
    </nav>
  );
};
