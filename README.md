# LedgerAndPay

#vercel deployment link- https://ledger-and-kkxdxea71-vijayditya-sarkers-projects.vercel.app/

A Solana + Anchor on-chain program (and React front-end) for managing shared expense groups, logging expenses, and settling them in USDC via SPL tokens.

Program id = "4UUkEZrwe8PoseD6Ph7WuUHJJ1ob5P4WevNcpFZt2LTC" Deployed in devnet

## 📦 Repository Structure

```text
.
├── Anchor.toml                   # Anchor config (cluster, programs, scripts)
├── programs/ledgerandpay/        # On-chain program (Rust + Anchor)
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs                # Program entrypoint
│       ├── group.rs              # Group CRUD logic
│       ├── expense.rs            # Expense-logging logic
│       └── settlement.rs         # USDC settlement CPI
├── app/                          # React front-end (CRA + TypeScript)
│   ├── package.json
│   └── src/
│       └── components/           # UI components (CreateGroup, etc.)
├── tests/                        # Anchor/Mocha test suites
│   ├── group.ts
│   ├── expense.ts
│   └── settlement.ts
├── .gitignore
├── package.json                  # Root workspace (scripts, deps)
├── yarn.lock                     # Yarn lockfile
├── tsconfig.json
└── README.md                     # ← You are here

```

## 🔑 Prerequisites

- [Node.js](https://nodejs.org) ≥ 16  
- [Yarn](https://yarnpkg.com/) (or npm)  
- [Rust toolchain](https://www.rust-lang.org/tools/install) (with `rustup`)  
- [Solana CLI & test validator](https://docs.solana.com/cli/install-solana-cli-tools)  
- [Anchor CLI](https://www.anchor-lang.com/docs/installation)  

---

## 🚀 Getting Started

### 1. Start a local Solana validator

```bash
solana-test-validator --reset

## 🛠️ Running Tests

All tests run against **Devnet** (`https://api.devnet.solana.com`).

1. **Fund your Devnet wallet** (if you haven’t already):

    ```bash
    solana airdrop 1 --url https://api.devnet.solana.com
    ```

2. **Run the tests**:

    ```bash
    ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
    ANCHOR_WALLET=~/.config/solana/devnet-wallet.json \
    yarn test
    ```

Your `ANCHOR_PROVIDER_URL` and `ANCHOR_WALLET` environment variables tell Anchor to point at Devnet and use your test‐wallet keypair. The `yarn test` script will then run:

- `tests/group.ts`  
- `tests/expense.ts`  
- `tests/settlement.ts`  

against the program you’ve deployed on Devnet.  

