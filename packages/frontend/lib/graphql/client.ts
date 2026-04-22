import { GraphQLClient } from "graphql-request";

import { APP_CONFIG } from "@/lib/config";

const FALLBACK = "https://api.studio.thegraph.com/query/0/cipherbet-base-sepolia/version/latest";

export const graphClient = new GraphQLClient(APP_CONFIG.subgraphUrl || FALLBACK);
