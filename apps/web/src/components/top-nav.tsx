import { Link } from "@tanstack/react-router";
import { useAuth } from "../context/auth-context";

export const TopNav = () => {
  const { isAuthenticated, isLoading, user, logout } = useAuth();

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
      <div className="nav-auth">
        {isLoading ? null : isAuthenticated && user ? (
          <>
            <span className="nav-user" title={user.email}>
              {user.name}
            </span>
            <button type="button" className="secondary-button" onClick={logout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-button">
              Log in
            </Link>
            <Link to="/signup" className="primary-pill">
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};
