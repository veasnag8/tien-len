# Architecture

## Authoritative game loop

1. Host starts game via Socket.IO `room:start`
2. Backend deals cards with `Shared` engine and stores full state in Redis
3. Clients receive public state + private hand only for their user
4. Plays/passes include a unique `requestId` (anti-duplicate)
5. Turn timer (30s) auto-passes on the server
6. Finish order becomes ranking; results persist to PostgreSQL

## Modules

| Module | Responsibility |
|--------|----------------|
| Auth | Email/OAuth/Guest + JWT |
| Rooms | Create/join/lobby/host controls |
| Game | Move validation + rankings |
| Gateway | Realtime sync + reconnect |
| Leaderboard | Daily/weekly/monthly/all-time |
| Users | Profile + history |

## Chopping rules (TLMN)

- Three consecutive pairs chop a single 2
- Four of a kind chops single/pair 2s and three consecutive pairs
- Four consecutive pairs chop stronger bombs
- Five consecutive pairs optional via room setting
