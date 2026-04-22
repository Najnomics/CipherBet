"use client";

import { motion } from "framer-motion";
import { useAccount, useBalance, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

import { truncateAddress } from "@/lib/utils";

export function ConnectButton() {
  const { address, isConnected, chain } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });

  if (isConnected && address) {
    return (
      <motion.div
        className="cb-connected"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <span className="cb-dot" />
        <span className="cb-info">
          <span className="cb-address">{truncateAddress(address)}</span>
          {balance && (
            <span className="cb-balance">
              {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
            </span>
          )}
        </span>
        {chain && <span className="cb-network">{chain.name}</span>}
        <button type="button" className="cb-disconnect" onClick={() => disconnect()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </motion.div>
    );
  }

  return (
    <motion.button
      type="button"
      className="cb-connect"
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
    >
      {isPending ? "Connecting..." : "Connect Wallet"}
    </motion.button>
  );
}
