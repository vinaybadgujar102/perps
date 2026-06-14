import { SIDE, type Side } from "@repo/sharedtypes";
import { Button } from "#/components/ui/button";

type SubmitButtonsProps = {
  canSubmit: boolean;
  isPending: boolean;
  orderSide: Side;
  onSubmit: (side: Side) => void;
};

export function SubmitButtons({
  canSubmit,
  isPending,
  orderSide,
  onSubmit,
}: SubmitButtonsProps) {
  return (
    <div className="mb-4 flex gap-2 text-xs tracking-widest">
      <Button
        type="button"
        className="flex-1 bg-trading-green font-bold tracking-widest text-black"
        disabled={!canSubmit}
        onClick={() => onSubmit(SIDE.LONG)}
      >
        {isPending && orderSide === SIDE.LONG ? "Placing..." : "BUY / LONG"}
      </Button>
      <Button
        type="button"
        className="flex-1 bg-accent font-bold"
        disabled={!canSubmit}
        onClick={() => onSubmit(SIDE.SHORT)}
      >
        {isPending && orderSide === SIDE.SHORT ? "Placing..." : "SELL / SHORT"}
      </Button>
    </div>
  );
}
