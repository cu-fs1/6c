# 6c

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create a `.env` file:

```env
PORT=3000
MONGO_URI=your_mongo_connection_string
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=1d
SOLARWINDS_TOKEN=optional
```

3. Run server:

```bash
pnpm dev
```

## Auth APIs

- `POST /users/register` → Register a user
- `POST /users/login` → Login and receive JWT token
- `GET /users/me` → Protected route (requires `Authorization: Bearer <token>`)

Each user has a `balance` field embedded directly in the `User` model — there is no separate `Account` model.
Transactions are stored in a `Transaction` model whose `fromAccount` and `toAccount` fields reference `User` documents.

## Banking APIs

All banking routes require `Authorization: Bearer <token>`.

- `GET /banking/balance` → Get current user account balance
- `GET /banking/transactions` → Get current user transaction history
- `POST /banking/deposit` → Deposit money
	- Body: `{ "amount": 100, "description": "Initial deposit" }`
- `POST /banking/withdraw` → Withdraw money
	- Body: `{ "amount": 40, "description": "ATM cash" }`
- `POST /banking/transfer` → Transfer money to another user by email
	- Body: `{ "toEmail": "alice@example.com", "amount": 25, "description": "Dinner split" }`
