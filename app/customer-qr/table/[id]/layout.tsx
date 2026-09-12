/**
 * Per-table layout.
 *
 * The kitchen-status simulator (OrderLifecycleDriver) is intentionally
 * disabled for now: once an order is created it is simply "sent to the
 * kitchen" with no live status progression or tracking timeline. To restore
 * live tracking later, mount <OrderLifecycleDriver tableId={id} /> here again
 * (and re-show the status banner / timeline + tracking links).
 */
export default function TableLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
