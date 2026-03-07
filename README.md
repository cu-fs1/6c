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
