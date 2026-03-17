import { baseSepolia } from "wagmi/chains";

export const APP_CONFIG = {
  chain: baseSepolia,
  factoryAddress: process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}` | undefined,
  gameAddress: process.env.NEXT_PUBLIC_GAME_ADDRESS as `0x${string}` | undefined,
  subgraphUrl: process.env.NEXT_PUBLIC_SUBGRAPH_URL,
};
