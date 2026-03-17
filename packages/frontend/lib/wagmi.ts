import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { arbitrumSepolia, baseSepolia } from "wagmi/chains";

const baseSepoliaRpc =
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const arbitrumSepoliaRpc =
  process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";

export const wagmiConfig = createConfig({
  chains: [baseSepolia, arbitrumSepolia],
  connectors: [injected()],
  transports: {
    [baseSepolia.id]: http(baseSepoliaRpc),
    [arbitrumSepolia.id]: http(arbitrumSepoliaRpc),
  },
});
