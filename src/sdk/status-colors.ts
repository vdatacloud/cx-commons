export const STATUS_HEX_COLORS: Record<string, string> = {
  DRAFT: '#94a3b8',
  FUNDED: '#3b82f6',
  ACTIVE: '#10b981',
  PROPOSED: '#f59e0b',
  DISPUTED: '#f43f5e',
  ARBITRATION: '#dc2626',
  SETTLED: '#a855f7',
  FIAT_PENDING: '#6366f1',
};

export function getStatusHexColor(status: string): string {
  const upper = status.toUpperCase();
  return STATUS_HEX_COLORS[upper] || STATUS_HEX_COLORS.DRAFT;
}
