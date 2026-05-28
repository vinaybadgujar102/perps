export const TradePanel = () => {
  return (
    <section className="panel trade-panel">
      <div className="panel-title-row">
        <h2>Place Order</h2>
      </div>
      <div className="trade-tabs">
        <button type="button" className="active">
          Long
        </button>
        <button type="button">Short</button>
      </div>
      <div className="trade-form">
        <label htmlFor="sizeInput">Size</label>
        <input id="sizeInput" placeholder="0.00" disabled />
        <label htmlFor="priceInput">Price</label>
        <input id="priceInput" placeholder="Market" disabled />
        <button type="button" className="primary-button" disabled>
          Sign in to Trade
        </button>
      </div>
    </section>
  );
};
