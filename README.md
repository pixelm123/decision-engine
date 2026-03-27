# Decision Engine

A real-time collaborative decision-making tool. Groups evaluate options against weighted criteria, score them live, and reach a data-backed consensus.

## What it does

- A host creates a room and defines the options being evaluated and the criteria to score them against, each with a weight that sums to 1
- Participants join via an invite link — no account required
- Once scoring opens, everyone rates each option against each criterion on a 1–10 scale
- Scores are aggregated in real time using a weighted average and broadcast to all participants via WebSocket
- The host can run multiple rounds, review a per-criterion breakdown, and finalize the decision

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Angular 18, Tailwind CSS, RxJS, Angular CDK |
| Backend | NestJS, TypeScript, Socket.io |
| Database | PostgreSQL via Prisma ORM |
| Auth | JWT — full tokens for hosts, room-scoped tokens for guests |
| Hosting | Vercel (frontend), Render (backend + DB) |

## Running locally

**Prerequisites:** Node 20+, PostgreSQL

```bash
git clone https://github.com/your-username/decision-engine
cd decision-engine
```

**Backend**

```bash
cd backend
cp .env.example .env        # set DATABASE_URL and JWT_SECRET
npm install
npx prisma migrate dev
npm run start:dev
```

**Frontend**

```bash
cd frontend
npm install
ng serve
```

App runs at `http://localhost:4200`, API at `http://localhost:3000`.

**Seed data**

```bash
cd backend
npm run seed
```

Creates 5 users across 5 rooms in different states. All accounts use `password123`.

| Email | Hosts |
|---|---|
| alice@test.com | Best JS Framework 2026, Senior Backend Engineer Shortlist |
| bob@test.com | Q3 Design Tool Evaluation |
| nalitha@test.com | Cloud Provider Selection |
| sara@test.com | Office Catering Vendor |

## Project structure

```
decision-engine/
  backend/
    prisma/           schema, migrations, seed
    src/
      auth/           JWT strategy, guards, guest join flow
      rooms/          room CRUD + state machine (OPEN → SCORING → REVIEWING → FINALIZED)
      options/        option CRUD
      criteria/       criterion CRUD + weight validation + reorder endpoint
      scores/         batch submit, weighted aggregation, per-criterion breakdown
      gateway/        Socket.io gateway, room-scoped broadcasting
      audit/          fire-and-forget audit logging
      common/         ZodValidationPipe, CurrentUser decorator, typed event payloads
  frontend/
    src/app/
      core/           auth service, API service, WebSocket service, guards, interceptors
      features/       auth, dashboard, room (lobby, scoring, results, audit, join, create)
      shared/         TypeScript models
```

## Key design decisions

**Aggregated scores are stored, not computed on read.** Each score submission recalculates and upserts the weighted aggregate inside a Prisma transaction. The results endpoint stays fast regardless of participant count.

**Room state transitions are enforced server-side.** The state machine only allows explicit transitions. Invalid transitions are rejected with a 400.

**Guest auth uses room-scoped JWTs.** Participants join with a display name only. Their token encodes `roomId` and `role: PARTICIPANT` so they can only interact with that room.

**Audit logging is fire-and-forget.** `AuditService` catches and discards its own errors so a logging failure never breaks the main request path.
