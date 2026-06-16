-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "marketSymbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "orderType" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "qty" INTEGER NOT NULL,
    "filledQty" INTEGER NOT NULL DEFAULT 0,
    "price" INTEGER NOT NULL,
    "placedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClosedPosition" (
    "id" SERIAL NOT NULL,
    "positionId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "marketSymbol" TEXT NOT NULL,
    "openingOrderId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "averageEntryPrice" INTEGER NOT NULL,
    "realizedPnl" INTEGER NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClosedPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fill" (
    "id" SERIAL NOT NULL,
    "fillId" TEXT NOT NULL,
    "marketSymbol" TEXT NOT NULL,
    "makerId" INTEGER NOT NULL,
    "takerId" INTEGER NOT NULL,
    "makerOrderId" TEXT NOT NULL,
    "takerOrderId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "filledQty" INTEGER NOT NULL,
    "makerSide" TEXT NOT NULL,
    "takerSide" TEXT NOT NULL,
    "filledAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderId_key" ON "Order"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "ClosedPosition_positionId_key" ON "ClosedPosition"("positionId");

-- CreateIndex
CREATE UNIQUE INDEX "Fill_fillId_key" ON "Fill"("fillId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_marketSymbol_fkey" FOREIGN KEY ("marketSymbol") REFERENCES "Market"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosedPosition" ADD CONSTRAINT "ClosedPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosedPosition" ADD CONSTRAINT "ClosedPosition_marketSymbol_fkey" FOREIGN KEY ("marketSymbol") REFERENCES "Market"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosedPosition" ADD CONSTRAINT "ClosedPosition_openingOrderId_fkey" FOREIGN KEY ("openingOrderId") REFERENCES "Order"("orderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fill" ADD CONSTRAINT "Fill_marketSymbol_fkey" FOREIGN KEY ("marketSymbol") REFERENCES "Market"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fill" ADD CONSTRAINT "Fill_makerId_fkey" FOREIGN KEY ("makerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fill" ADD CONSTRAINT "Fill_takerId_fkey" FOREIGN KEY ("takerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fill" ADD CONSTRAINT "Fill_makerOrderId_fkey" FOREIGN KEY ("makerOrderId") REFERENCES "Order"("orderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fill" ADD CONSTRAINT "Fill_takerOrderId_fkey" FOREIGN KEY ("takerOrderId") REFERENCES "Order"("orderId") ON DELETE RESTRICT ON UPDATE CASCADE;
