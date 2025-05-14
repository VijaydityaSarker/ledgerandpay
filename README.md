# LedgerAndPay

A Solana + Anchor on-chain program (and React front-end) for managing shared expense groups, logging expenses, and settling them in USDC via SPL tokens.

<p align="center">
  <img width="400" alt="Group view" src="app/public/screenshot.png">
</p>

## 📦 Repository Structure

├── Anchor.toml # Anchor config (cluster, programs, scripts)
├── programs/ledgerandpay/ # Anchor/Rust on-chain program
│ ├── Cargo.toml
│ └── src/
│ ├── lib.rs
│ ├── group.rs # group CRUD logic
│ ├── expense.rs # expense-logging logic
│ └── settlement.rs # CPI for settling expenses in USDC
├── app/ # React front-end (Create React App + TypeScript)
│ ├── package.json
│ └── src/
│ └── components/ # UI components (CreateGroup, etc.)
├── tests/ # Mocha/Anchor test suites
│ ├── group.ts
│ ├── expense.ts
│ └── settlement.ts
├── .gitignore
├── package.json
├── yarn.lock
├── tsconfig.json
└── README.md # ← You are here



---

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
