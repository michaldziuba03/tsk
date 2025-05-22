CREATE TABLE orders (
    "orderID"     VARCHAR PRIMARY KEY,
    "orderWorth"  NUMERIC(12, 2) NOT NULL,
    "products"    JSONB NOT NULL
);

CREATE INDEX idx_orders_order_worth ON orders("orderWorth");
CREATE UNIQUE INDEX idx_orders_order_id ON orders("orderID");

CREATE TABLE sync_attempts (
    "createdAt" TIMESTAMPTZ NOT NULL,
    "status"    VARCHAR NOT NULL
);

CREATE INDEX idx_sync_attempts_timestamp ON sync_attempts("createdAt");
