export const TradePanel = () => {
  return (
    <section className="panel trade-panel">
      <div className="panel-title-row trade-head">
        <h2>Spot / Perps</h2>
      </div>
      <div className="trade-tabs buy-sell">
        <button type="button" className="active buy">
          Buy
        </button>
        <button type="button" className="sell">Sell</button>
      </div>
      <div className="inline-tabs order-kind">
        <button type="button" className="is-active">Limit</button>
        <button type="button">Market</button>
        <button type="button">Stop Limit</button>
      </div>
      <div className="trade-form">
        <label htmlFor="priceInput">Price</label>
        <input id="priceInput" value="3748.20 USDT" readOnly />
        <label htmlFor="sizeInput">Amount</label>
        <input id="sizeInput" placeholder="0.00 ETH" disabled />
        <label htmlFor="levInput">Leverage</label>
        <input id="levInput" value="25x" readOnly />
        <button type="button" className="primary-button" disabled>
          Buy Long
        </button>
        <button type="button" className="secondary-button">
          Deposit
        </button>
        <p className="trade-warning">Insufficient balance. Deposit to start trading.</p>
      </div>
    </section>
  );
};
