use uuid::Uuid;

enum Side {
    LONG, SHORT,
}

struct Order {
    id: Uuid,
    side: Side,
    price: i32,
    qty: i32,
    filled_qty: i32,
    market:
}
