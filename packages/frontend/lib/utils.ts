import { formatEther as viemFormatEther } from "viem";

export function truncateAddress(addr: string, chars = 4): string {
  if (!addr) return "";
  return `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}`;
}

export function formatEth(wei: bigint, decimals = 4): string {
  const raw = viemFormatEther(wei);
  const num = parseFloat(raw);
  return num.toFixed(decimals);
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (d > 0) return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function bpsToPercent(bps: number): string {
  return `${(bps / 100).toFixed(1)}%`;
}

export function baseScanTx(hash: string): string {
  return `https://sepolia.basescan.org/tx/${hash}`;
}

export function baseScanAddress(addr: string): string {
  return `https://sepolia.basescan.org/address/${addr}`;
}
