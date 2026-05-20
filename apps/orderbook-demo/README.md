### MatchOrder: Input: Order Returns: Fills[]

1. Initialize empty fills array and check the order side
2. For each order side
  a. Loop through the price level
  b. Check if price is favouralble and the quantities are remaining to be filled for the given order
  c. If yes we can begin matching. Iterate through the orders and check fo the quantities. Increase the matched qty to the filledQty in both maker and taker order.
  d. push the fill
  f. also during the iteration of the orders array we have to check if our order is fully filled after the previosu iteration so just check it and if fully filled break out of that inner loop.
  g. after iteration of orders array we have to remove the fully filled maker order from there so just filter them out
  h. also we have to remove the pricelevel itself if no orders at that price level
