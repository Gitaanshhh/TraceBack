# TraceBack

**A community recovery board powered by Ethereum**

TraceBack helps people reconnect with lost belongings without relying on an informal promise. A person can publish a missing-item report, optionally lock a thank-you reward in the contract, and release that reward to a finder after the return is confirmed.

## How it works

1. **Publish a report** with the item name, useful details, last known location, and an optional ETH reward.
2. **A finder leaves a recovery note** describing where the owner can collect the item.
3. **The owner confirms the safe return.** The contract pays the finder and marks the report as returned.
4. An owner can dismiss a report or close their post and receive any escrowed reward back. The board steward can remove spam.

## Project map

```
TraceBack/
├── contracts/LostFoundBoard.sol
├── frontend/
│   ├── index.html       # TraceBack interface
│   ├── style.css        # visual theme and responsive layout
│   ├── config.js        # deployed address and contract ABI
│   └── app.js           # wallet connection and board interactions
├── deployment/
├── screenshots/
└── test-results/
```

## Technology

- Solidity `^0.8.20`
- Ethereum Sepolia testnet (`11155111`)
- Ethers.js `5.7.2`
- MetaMask
- Plain HTML, CSS, and JavaScript

## Current deployment

| Detail | Value |
| --- | --- |
| Network | Sepolia Testnet |
| Contract | `0x44c6212714c9711057baAA5dE2463Ad71bea0920` |
| Board steward | `0xDCe4402C6af5a7dA0C90265Fc285Dfd423AB6143` |
| Compiler | Solidity 0.8.20 |

[View the contract on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x44c6212714c9711057baAA5dE2463Ad71bea0920)

## Run TraceBack locally

1. Install MetaMask and switch the site to the Sepolia network.
2. Make sure the browser has some Sepolia test ETH.
3. Start a static server from the frontend directory:

   ```bash
   cd frontend
   python3 -m http.server 8000
   ```

4. Open [http://localhost:8000](http://localhost:8000), then select **Connect wallet**.

The app must be served over a local web server; opening `index.html` directly can prevent wallet or browser APIs from working correctly.

## Interface highlights

- TraceBack branding with a recovery-focused visual language.
- Responsive report form with clearer field labels and client-side validation.
- Search reports by title or location.
- Filter the board by looking, found, returned, or closed status.
- Transaction progress and failure messages remain visible in the interface.
- A confirmation prompt protects the close/refund action.

## Contract safeguards

The smart contract validates item IDs, title and location requirements, report notes, ownership, and status transitions. It updates state before transferring ETH and emits events for each important change.

## Test scenarios

The existing test notes in [`test-results/test-cases.md`](test-results/test-cases.md) cover publishing a report, reporting a found item, confirming a return, invalid input, and unauthorized cancellation. The redesign does not change the deployed contract methods or their permissions.

## Security note

This repository contains no private keys, seed phrases, passwords, or other credentials. The addresses above are public Sepolia testnet addresses. Never place a real wallet secret in frontend code or configuration.
