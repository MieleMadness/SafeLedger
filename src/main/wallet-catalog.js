'use strict';

// SafeLedger default wallet catalog.
// Reviewed: 2026-08-19
//
// Modern wallets often support dynamic token catalogs containing thousands or
// millions of token contracts. SafeLedger therefore seeds native networks and
// token standards/families instead of freezing every token contract into the
// encrypted database. Users can still add individual tokens/coins as records.
//
// Sources are retained with each wallet so this catalog can be reviewed and
// refreshed as wallet support changes.

const record = (name, symbol, today, notes) => ({
  name,
  symbol,
  created: today,
  notes: notes || ''
});

const networkRecords = (items, today) => items.map(([name, symbol, notes]) => record(name, symbol, today, notes));

const catalog = [
  {
    name: 'Ledger',
    type: 'Hardware',
    source: 'https://www.ledger.com/supported-crypto-assets',
    records: [
      ['Bitcoin', 'BTC'], ['Ethereum', 'ETH', 'Includes ERC-20 tokens'], ['Tether', 'USDT'],
      ['BNB Smart Chain', 'BNB', 'Includes BEP-20 tokens'], ['USD Coin', 'USDC'], ['XRP Ledger', 'XRP'],
      ['Solana', 'SOL', 'Includes SPL tokens'], ['TRON', 'TRX', 'Includes TRC-20 tokens'], ['Cardano', 'ADA'],
      ['Polkadot', 'DOT'], ['Cosmos Hub', 'ATOM'], ['Litecoin', 'LTC'], ['Dogecoin', 'DOGE'],
      ['Bitcoin Cash', 'BCH'], ['Stellar', 'XLM'], ['Algorand', 'ALGO'], ['Avalanche C-Chain', 'AVAX'],
      ['Polygon', 'POL'], ['Arbitrum', 'ARB'], ['Optimism', 'OP'], ['Base', 'BASE'], ['Tezos', 'XTZ'],
      ['Zcash', 'ZEC'], ['Ethereum Classic', 'ETC'], ['ERC-20 Tokens', 'ERC-20', 'Dynamic Ethereum token support'],
      ['SPL Tokens', 'SPL', 'Dynamic Solana token support'], ['EVM Tokens', 'EVM', 'Additional supported EVM assets may be managed through Ledger Wallet or compatible third-party wallets']
    ]
  },
  {
    name: 'Trezor',
    type: 'Hardware',
    source: 'https://trezor.io/coins',
    records: [
      ['Bitcoin', 'BTC'], ['Ethereum', 'ETH', 'Includes ERC-20 tokens and supported EVM networks'], ['Tether', 'USDT'],
      ['BNB', 'BNB'], ['USD Coin', 'USDC'], ['XRP Ledger', 'XRP'], ['Solana', 'SOL', 'Includes SPL tokens'],
      ['TRON', 'TRX'], ['Dogecoin', 'DOGE'], ['Zcash', 'ZEC'], ['Stellar', 'XLM'], ['Cardano', 'ADA'],
      ['Bitcoin Cash', 'BCH'], ['Litecoin', 'LTC'], ['Avalanche', 'AVAX'], ['Ethereum Classic', 'ETC'],
      ['Monero', 'XMR', 'Supported on compatible Trezor models through third-party wallet software'],
      ['Tezos', 'XTZ', 'Supported through third-party wallet software'], ['ERC-20 Tokens', 'ERC-20'], ['SPL Tokens', 'SPL']
    ]
  },
  {
    name: 'Tangem',
    type: 'Hardware',
    source: 'https://tangem.com/en-GB/help-center/coinstokens/',
    records: [
      ['ADI', 'ADI'], ['Alephium', 'ALPH'], ['Aleph Zero', 'AZERO'], ['Algorand', 'ALGO'], ['ApeChain', 'APE'],
      ['Aptos', 'APT'], ['Arbitrum', 'ARB'], ['Arbitrum Nova', 'ARB-NOVA'], ['Areon', 'AREA'], ['Aurora', 'AURORA'],
      ['Avalanche C-Chain', 'AVAX'], ['Base', 'BASE'], ['Blast', 'BLAST'], ['BNB Beacon Chain', 'BNB'],
      ['BNB Smart Chain', 'BNB'], ['Bitcoin', 'BTC'], ['Bitcoin Cash', 'BCH'], ['Bitrock', 'BROCK'],
      ['Bittensor', 'TAO'], ['Canxium EVM', 'CAU'], ['Casper', 'CSPR'], ['Cardano', 'ADA'], ['Chia', 'XCH'],
      ['Chiliz EVM', 'CHZ'], ['Clore.ai', 'CLORE'], ['Cosmos Hub', 'ATOM'], ['Core', 'CORE'], ['Cronos EVM', 'CRO'],
      ['Cyber', 'CYBER'], ['Dash', 'DASH'], ['Decimal', 'DEL'], ['Dione', 'DIONE'], ['Dischain / EthereumFair', 'ETHF'],
      ['Dogecoin', 'DOGE'], ['Ducatus', 'DUC'], ['Energy Web Chain', 'EWT'], ['Energy Web X', 'EWTX'],
      ['Ethereum', 'ETH'], ['Ethereum Classic', 'ETC'], ['EthereumPoW', 'ETHW'], ['Fact0rn', 'FACT'],
      ['Fantom Opera', 'FTM'], ['Filecoin', 'FIL'], ['Flare', 'FLR'], ['Gnosis Chain', 'GNO'], ['Hedera', 'HBAR'],
      ['Hyperliquid EVM', 'HYPE'], ['Internet Computer', 'ICP'], ['Joystream', 'JOY'], ['Kaspa', 'KAS'],
      ['Kava EVM', 'KAVA'], ['Koinos', 'KOIN'], ['Kusama', 'KSM'], ['Linea EVM', 'LINEA'], ['Litecoin', 'LTC'],
      ['Manta Pacific', 'MANTA'], ['Mantle', 'MNT'], ['Monad', 'MON'], ['Moonbeam', 'GLMR'], ['Moonriver', 'MOVR'],
      ['NEAR Protocol', 'NEAR'], ['OctaSpace', 'OCTA'], ['Optimism', 'OP'], ['Pepecoin', 'PEP'], ['Plasma EVM', 'XPL'],
      ['PLAYA3ULL GAMES', '3ULL'], ['Polkadot Asset Hub', 'DOT'], ['Polygon', 'POL'], ['Polygon zkEVM', 'POL-ZKEVM'],
      ['PulseChain', 'PLS'], ['Quai', 'QUAI'], ['Radiant', 'RXD'], ['Ravencoin', 'RVN'], ['Rootstock', 'RBTC'],
      ['Scroll EVM', 'SCR'], ['Sei', 'SEI'], ['Shibarium', 'BONE'], ['Solana', 'SOL'], ['Sonic', 'S'],
      ['Stellar', 'XLM'], ['Sui', 'SUI'], ['Taraxa', 'TARA'], ['Telos EVM', 'TLOS'], ['Terra', 'LUNA'],
      ['Terra Classic', 'LUNC'], ['Tezos', 'XTZ'], ['TON', 'TON'], ['TRON', 'TRX'], ['VeChain', 'VET'],
      ['XDC Network', 'XDC'], ['Xodex', 'XODEX'], ['XRP Ledger', 'XRP'], ['zkSync Era', 'ZK'],
      ['EVM Tokens', 'EVM', 'Custom tokens supported on compatible EVM networks'], ['SPL Tokens', 'SPL'],
      ['TRC-20 Tokens', 'TRC-20'], ['Cardano Native Tokens', 'CNT']
    ]
  },
  {
    name: 'Keystone',
    type: 'Hardware',
    source: 'https://www.keyst.one/supported-wallets-and-assets',
    records: [
      ['Bitcoin', 'BTC'], ['Ethereum', 'ETH'], ['TRON', 'TRX'], ['Cardano', 'ADA'], ['Zcash', 'ZEC'],
      ['Solana', 'SOL'], ['Cosmos Hub', 'ATOM'], ['Aptos', 'APT'], ['Sui', 'SUI'], ['XRP Ledger', 'XRP'],
      ['Arweave', 'AR'], ['TON', 'TON'], ['Stellar', 'XLM'], ['Monero', 'XMR'],
      ['EVM Networks', 'EVM', 'Keystone supports 200+ blockchains through compatible software wallets'],
      ['ERC-20 Tokens', 'ERC-20'], ['SPL Tokens', 'SPL'], ['TRC-20 Tokens', 'TRC-20']
    ]
  },
  {
    name: 'OneKey',
    type: 'Hardware',
    source: 'https://onekey.so/chains/',
    records: [
      ['Bitcoin', 'BTC'], ['Ethereum', 'ETH'], ['Solana', 'SOL'], ['Kaspa', 'KAS'], ['BNB Smart Chain', 'BNB'],
      ['Polygon', 'POL'], ['Arbitrum', 'ARB'], ['Optimism', 'OP'], ['Base', 'BASE'], ['Avalanche C-Chain', 'AVAX'],
      ['TRON', 'TRX'], ['Cosmos Hub', 'ATOM'], ['Polkadot', 'DOT'], ['Cardano', 'ADA'], ['Sui', 'SUI'],
      ['Aptos', 'APT'], ['XRP Ledger', 'XRP'], ['Litecoin', 'LTC'], ['Dogecoin', 'DOGE'],
      ['EVM Tokens', 'EVM', 'OneKey supports thousands of assets across 60+ blockchains'], ['ERC-20 Tokens', 'ERC-20'], ['SPL Tokens', 'SPL']
    ]
  },
  {
    name: 'BitBox02 Multi',
    type: 'Hardware',
    source: 'https://support.bitbox.swiss/en_US/criptomonedas-redes-compatibles-bitbox02',
    records: [
      ['Bitcoin', 'BTC'], ['Litecoin', 'LTC'], ['Ethereum', 'ETH'], ['Cardano', 'ADA'],
      ['ERC-20 Tokens', 'ERC-20', 'Popular tokens natively; broader ERC-20 support via compatible external wallets'],
      ['EVM Networks', 'EVM', '100+ EVM-compatible chains through compatible external wallets such as Rabby or MyEtherWallet']
    ]
  },
  {
    name: 'COLDCARD',
    type: 'Hardware',
    source: 'https://coldcard.com/docs/compatible-wallets/',
    records: [
      ['Bitcoin', 'BTC', 'Bitcoin-focused hardware wallet; compatible with PSBT software wallets including Electrum, Sparrow and Nunchuk']
    ]
  },
  {
    name: 'SafePal',
    type: 'Hardware',
    source: 'https://www.safepal.com/en/coin/lists',
    records: [
      ['Bitcoin', 'BTC'], ['Ethereum', 'ETH'], ['XRP Ledger', 'XRP'], ['Bitcoin Cash', 'BCH'], ['Litecoin', 'LTC'],
      ['BNB Smart Chain', 'BNB'], ['Stellar', 'XLM'], ['TRON', 'TRX'], ['Dash', 'DASH'], ['Ethereum Classic', 'ETC'],
      ['NEO', 'NEO'], ['Dogecoin', 'DOGE'], ['Zcash', 'ZEC'], ['DigiByte', 'DGB'], ['Harmony', 'ONE'],
      ['Qtum', 'QTUM'], ['Polkadot', 'DOT'], ['Kusama', 'KSM'], ['VeChain', 'VET'], ['Polygon', 'POL'],
      ['Solana', 'SOL'], ['Avalanche', 'AVAX'], ['Cardano', 'ADA'], ['Optimism', 'OP'], ['NEAR Protocol', 'NEAR'],
      ['Arbitrum', 'ARB'], ['EVM Networks', 'EVM', 'SafePal supports 200+ blockchains and dynamic token catalogs'],
      ['ERC-20 Tokens', 'ERC-20'], ['BEP-20 Tokens', 'BEP-20'], ['SPL Tokens', 'SPL'], ['TRC-20 Tokens', 'TRC-20']
    ]
  },
  {
    name: 'MetaMask',
    type: 'Software',
    source: 'https://support.metamask.io/configure/networks/how-to-add-a-custom-network-rpc',
    records: [
      ['Ethereum', 'ETH'], ['Bitcoin', 'BTC'], ['Linea', 'LINEA'], ['Base', 'BASE'], ['Solana', 'SOL'], ['TRON', 'TRX'],
      ['Polygon', 'POL'], ['BNB Chain', 'BNB'], ['Arbitrum', 'ARB'], ['Monad', 'MON'], ['Robinhood Chain', 'RHC'],
      ['Optimism', 'OP'], ['Sei', 'SEI'], ['Avalanche', 'AVAX'], ['zkSync Era', 'ZK'], ['MegaETH', 'MEGAETH'],
      ['HyperEVM', 'HYPE'], ['Tempo', 'TEMPO'], ['ERC-20 / EVM Tokens', 'EVM'], ['SPL Tokens', 'SPL'], ['TRC-20 Tokens', 'TRC-20']
    ]
  },
  {
    name: 'Trust Wallet',
    type: 'Software',
    source: 'https://trustwallet.com/browser-extension',
    records: [
      ['Bitcoin', 'BTC'], ['Ethereum', 'ETH'], ['BNB Smart Chain', 'BNB'], ['Solana', 'SOL'], ['TRON', 'TRX'],
      ['XRP Ledger', 'XRP'], ['Cardano', 'ADA'], ['Polygon', 'POL'], ['Arbitrum', 'ARB'], ['Optimism', 'OP'],
      ['Avalanche C-Chain', 'AVAX'], ['Base', 'BASE'], ['Aptos', 'APT'], ['Algorand', 'ALGO'], ['Cosmos Hub', 'ATOM'],
      ['Polkadot', 'DOT'], ['Sui', 'SUI'], ['NEAR Protocol', 'NEAR'], ['Stellar', 'XLM'], ['Bitcoin Cash', 'BCH'],
      ['Litecoin', 'LTC'], ['Dogecoin', 'DOGE'], ['Tezos', 'XTZ'], ['Cronos', 'CRO'], ['Gnosis Chain', 'GNO'],
      ['Moonbeam', 'GLMR'], ['Moonriver', 'MOVR'], ['Celo', 'CELO'], ['zkSync Era', 'ZK'], ['Linea', 'LINEA'],
      ['Scroll', 'SCR'], ['Mantle', 'MNT'], ['Monad', 'MON'], ['Acala', 'ACA'], ['Akash', 'AKT'], ['Axelar', 'AXL'],
      ['EVM Networks', 'EVM', 'Trust Wallet supports 100+ blockchain networks'], ['ERC-20 Tokens', 'ERC-20'],
      ['BEP-20 Tokens', 'BEP-20'], ['SPL Tokens', 'SPL'], ['TRC-20 Tokens', 'TRC-20']
    ]
  },
  {
    name: 'Exodus',
    type: 'Software',
    source: 'https://www.exodus.com/assets/',
    records: [
      ['Bitcoin', 'BTC'], ['Ethereum', 'ETH'], ['Tether', 'USDT'], ['BNB', 'BNB'], ['USD Coin', 'USDC'],
      ['XRP Ledger', 'XRP'], ['Solana', 'SOL'], ['TRON', 'TRX'], ['Dogecoin', 'DOGE'], ['Zcash', 'ZEC'],
      ['Cardano', 'ADA'], ['Stellar', 'XLM'], ['Chainlink', 'LINK'], ['Litecoin', 'LTC'], ['Bitcoin Cash', 'BCH'],
      ['Algorand', 'ALGO'], ['Aptos', 'APT'], ['Avalanche C-Chain', 'AVAX'], ['Base', 'BASE'], ['Arbitrum One', 'ARB'],
      ['Optimism', 'OP'], ['Polygon', 'POL'], ['Flare', 'FLR'], ['Rootstock', 'RBTC'],
      ['Custom Tokens', 'TOKEN', 'Exodus supports 50+ crypto networks and unlimited custom-token support on supported Web3 networks']
    ]
  },
  {
    name: 'Phantom',
    type: 'Software',
    source: 'https://help.phantom.com/hc/en-us/articles/41372840389651-What-blockchain-networks-does-Phantom-support',
    records: [
      ['Solana', 'SOL'], ['Ethereum', 'ETH'], ['Base', 'BASE'], ['Polygon', 'POL'], ['Sui', 'SUI'],
      ['Monad', 'MON'], ['Bitcoin', 'BTC'], ['HyperEVM', 'HYPE'],
      ['Network Tokens', 'TOKEN', 'Phantom automatically detects supported tokens on its supported networks']
    ]
  },
  {
    name: 'Base App (Coinbase Wallet)',
    type: 'Software',
    source: 'https://help.coinbase.com/wallet/browser-extension/supported-networks-and-assets',
    records: [
      ['Bitcoin', 'BTC'], ['Ethereum', 'ETH'], ['Solana', 'SOL'], ['Base', 'BASE'], ['Arbitrum', 'ARB'],
      ['Avalanche C-Chain', 'AVAX'], ['BNB Chain', 'BNB'], ['Optimism', 'OP'], ['Polygon', 'POL'], ['Zora', 'ZORA'],
      ['ERC-20 / EVM Tokens', 'EVM', 'Supports thousands of assets and EVM-compatible networks']
    ]
  },
  {
    name: 'Rabby Wallet',
    type: 'Software',
    source: 'https://github.com/RabbyHub/Rabby',
    records: [
      ['Ethereum', 'ETH'], ['BNB Chain', 'BNB'], ['Avalanche C-Chain', 'AVAX'], ['Fantom', 'FTM'], ['Celo', 'CELO'],
      ['Gnosis Chain', 'GNO'], ['Cronos', 'CRO'], ['Kava', 'KAVA'], ['Harmony', 'ONE'], ['Arbitrum', 'ARB'],
      ['Arbitrum Nova', 'ARB-NOVA'], ['Optimism', 'OP'], ['Base', 'BASE'], ['Polygon', 'POL'], ['zkSync Era', 'ZK'],
      ['Linea', 'LINEA'], ['Scroll', 'SCR'], ['Mantle', 'MNT'], ['Blast', 'BLAST'], ['Taiko', 'TAIKO'],
      ['Fraxtal', 'FXTL'], ['Mode', 'MODE'], ['World Chain', 'WORLD'], ['Manta Pacific', 'MANTA'],
      ['Berachain', 'BERA'], ['Monad', 'MON'], ['Sei', 'SEI'], ['Story', 'IP'], ['Canto', 'CANTO'],
      ['IoTeX', 'IOTX'], ['Moonbeam', 'GLMR'], ['Moonriver', 'MOVR'], ['Telos', 'TLOS'], ['Aurora', 'AURORA'],
      ['Rootstock', 'RBTC'], ['opBNB', 'OPBNB'], ['EVM Networks', 'EVM', 'Rabby is designed for Ethereum and all EVM-compatible chains, including custom EVM networks'],
      ['ERC-20 Tokens', 'ERC-20']
    ]
  },
  {
    name: 'Electrum',
    type: 'Software',
    source: 'https://electrum.org/',
    records: [
      ['Bitcoin', 'BTC', 'Electrum is a Bitcoin wallet']
    ]
  }
];

exports.buildDefaultGroups = (today) => catalog.map((wallet) => ({
  name: wallet.name,
  created: today,
  notes: `${wallet.type} wallet. Support catalog reviewed 2026-08-19. Source: ${wallet.source}`,
  records: networkRecords(wallet.records, today)
}));

exports.catalog = catalog;
