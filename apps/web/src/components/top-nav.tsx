import { Link } from "@tanstack/react-router";

export const TopNav = () => {
  return (
    <nav className="top-nav panel" aria-label="Primary">
      <div className="nav-left">
        <span className="brand-mark">PP</span>
        <span className="brand-name">Perps Platform</span>
      </div>
      <div className="nav-links">
        <Link to="/trade/$symbol" params={{ symbol: "BTC" }}>
          Trade
        </Link>
        <Link to="/markets">Markets</Link>
      </div>
      <button type="button" className="text-button">
        Connect Wallet
      </button>
    </nav>
  );
};
