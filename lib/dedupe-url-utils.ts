/** URL/query helpers for dedupe operations — regression tested. */

export function isLegacyRemoveAction(action: string | null | undefined): boolean {
  return action === 'remove';
}

export function redirectRemoveToScanParams(searchParams: string): string {
  const params = new URLSearchParams(searchParams);
  params.set('action', 'scan');
  return params.toString();
}