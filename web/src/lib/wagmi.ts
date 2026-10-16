import { http, createConfig, cookieStorage, createStorage, injected } from "wagmi";
import { arcTestnet } from "viem/chains";
import { env } from "@/lib/env";

export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  connectors: [injected()],
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
  transports: {
    [arcTestnet.id]: http(env.ARC_RPC_URL),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
