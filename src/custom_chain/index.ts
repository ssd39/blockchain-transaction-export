import { defineChain } from 'viem'

export const redstone = defineChain({
    id: 17001,
    name: 'Redstone Holesky',
    nativeCurrency: {
      decimals: 18,
      name: 'Holesky',
      symbol: 'ETH',
    },
    rpcUrls: {
      default: {
        http: ['https://rpc.holesky.redstone.xyz'],
        webSocket: ['wss://rpc.holesky.redstone.xyz/ws'],
      },
    },
    blockExplorers: {
      default: { name: 'Explorer', url: 'https://explorer.holesky.redstone.xyz' },
    },
  })