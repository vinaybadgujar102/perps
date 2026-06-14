export function formatOrderSuccessMessage(
  message: string,
  fillCount: number,
): string {
  if (fillCount <= 0) return message;
  return `${message} (${fillCount} fill${fillCount === 1 ? "" : "s"})`;
}
