# Hunar (हुनर): Kaam Bhi, Pehchaan Bhi

A mobile-first web app that helps skilled daily-wage workers (plumbers, electricians, carpenters, painters,
masons, cleaners, labourers) find fair work, show their record without a resume, and reach their rights.
Built for the **Beyond the Waiting Line** brief. The product thinking lives in
[hunar-technical-design.md](hunar-technical-design.md); this file is about running and deploying the code.

There is **no mock data**. Jobs, workers, ratings, earnings and Hunar Cards all come from MongoDB.
The Rights Hub is reference content about real government schemes (see "Reference content" below).

## Quick start

You need Node 20.12 or newer, a MongoDB database and a Gemini API key (see "Before you start").

```bash
git clone https://github.com/Vinayak314/Hunar_Artemis.git
cd Hunar_Artemis
npm run install:all                 # installs client/ and server/
cp server/.env.example server/.env  # then open server/.env and fill in the values
npm run check                       # confirms MongoDB and Gemini both work
npm run dev                         # starts the API and the app together
```

Open **http://localhost:3000**. That is the whole setup.

Run every `npm run ...` command from the repo root, the folder that contains this README and the top-level
`package.json`. Running it anywhere else gives "Missing script".

## Before you start

| You need | How to get it |
|---|---|
| Node 20.12+ and npm | https://nodejs.org (check with `node -v`) |
| MongoDB | A free Atlas cluster works. Create a database user, copy the connection string, and under **Network Access** allow your IP address (use 0.0.0.0/0 for quick testing only) |
| Gemini API key | Create one in Google AI Studio (https://aistudio.google.com). It stays on the server and is never sent to the browser |

## Configure

Copy the template and fill it in. It lives in `server/` and is ignored by git, so real values are never committed.

```bash
cp server/.env.example server/.env
```

| Variable | Required | What it does |
|---|---|---|
| `MONGODB_URI` | yes | Connection string. The database named in its path (for example `/hunar`) is used |
| `GEMINI_API_KEY` | yes | Key for the job-posting assistant |
| `MONGODB_DB` | no | Overrides the database name from the URI. The tests set it to `hunar_test` |
| `GEMINI_MODEL` | no | Main model, default `gemini-3.5-flash` |
| `GEMINI_FALLBACK_MODEL` | no | Used when the main model is overloaded, default `gemini-3.5-flash-lite` |
| `PORT` | no | API port, default `4000` |
| `CLIENT_ORIGIN` | no | Browser origins allowed to call the API with cookies. Only needed if the client is on a different origin |
| `SESSION_TTL_DAYS` | no | How long a sign-in lasts, default `30` |
| `COOKIE_SAMESITE` | no | `lax` (default), `strict` or `none` (needs HTTPS) |
| `CLIENT_DIST` | no | Folder of the built client to serve, default `client/dist` |

Run `npm run check` after editing. It prints `[ok]` or `[fail]` for MongoDB and Gemini, with the reason.

## Run it

```bash
npm run dev
```

| What | Where |
|---|---|
| The app | http://localhost:3000 (use `localhost`, not `127.0.0.1`) |
| The API | http://localhost:4000, health check at `/api/health` |

The app proxies `/api` to the API, so one URL is enough. Press **Ctrl+C** once to stop both. To run them in two
terminals instead, use `npm run dev:server` and `npm run dev:client`.

### Try both roles

A browser holds one sign-in at a time, so open the second role in a **private window** (or a second browser).

1. Window A, **customer**: sign up with any valid Indian mobile number (10 digits starting 6 to 9), choose
   "I need work done", and post a job in the chat. Describe it in a sentence, answer the questions, then press Post.
2. Window B, **worker**: sign up with a different number and your trade. The job appears under "Work near you".
   Open it, accept it, then mark it finished from "My work".
3. Back in window A, open "My jobs", rate the worker, then open their Hunar Card to see the earned score.

Sign-in has no OTP yet (see "Known gaps"), so any number works.

## Test on your phone

Hunar is built for phones, so try it on a real one while you work. There are two ways: the same Wi-Fi (quick, but
no location, copy/share or voice typing) and an HTTPS link (everything works).

### 1. Same Wi-Fi (quick)

From the repo root:

```bash
MONGODB_DB=hunar_dev npm run dev:phone
```

This is `npm run dev` (API on 4000, app on 3000) with the app also reachable from other devices on your network.
It prints your computer's address, for example:

```
[phone] Open this on your phone (the phone and this laptop must be on the same Wi-Fi):
[phone]     http://192.168.1.20:3000   (en0)
```

1. Put the phone on the **same Wi-Fi** as the computer (not mobile data, not a guest network).
2. Type the printed address into the phone's browser. Use the address from *your* terminal; `192.168.1.20` is only
   an example. If several addresses are printed, try the `en0` one first (usually Wi-Fi on a Mac).
3. The first time, macOS may ask whether `node` may accept incoming network connections. Choose **Allow**. If you
   clicked "Don't Allow" by mistake, open System Settings > Network > Firewall > Options and allow `node`.
4. A new database starts empty. Use the computer (http://localhost:3000) as the customer to post a job and the phone
   as the worker to accept it (see "Try both roles").
5. Press Ctrl+C in the terminal when you are done. That stops the app and frees ports 3000 and 4000.

If the page will not load on the phone, check that both devices are on the same Wi-Fi. Some networks (offices,
campuses, hotels, "guest" Wi-Fi) stop devices from reaching each other; use the tunnel below, which does not need
the same Wi-Fi. If the terminal says `Port 3000 is already in use`, stop the other dev server first (see
Troubleshooting).

**Why HTTPS matters.** Browsers only switch on some features for secure pages: `https://` or `localhost`. On a phone,
`http://192.168.1.20:3000` is neither (and `localhost` would mean the phone itself). So over plain Wi-Fi:

| Works | Needs HTTPS (use section 2) |
|---|---|
| Sign in, jobs, the posting chat, ratings, Hunar Card, Rights Hub | "Use my location" |
| Photo capture with the phone's camera | Copy and share buttons |
| Voice read-aloud on job cards | Microphone (speech input) |

### 2. HTTPS (location, copy/share, voice typing)

- **Any phone, with a free Cloudflare tunnel.** A "quick tunnel" gives your local app a temporary `https://`
  address. No account is needed. Install it once, keep `npm run dev:phone` running, and in a **second terminal**
  run:

  ```bash
  brew install cloudflared                          # once
  cloudflared tunnel --url http://localhost:3000
  ```

  Open the `https://...trycloudflare.com` link it prints on the phone (it works on mobile data too). Start the app
  with `npm run dev:phone`, not plain `npm run dev`: only phone mode accepts the tunnel's address. The link changes
  every time you start the tunnel, and anyone who has it can reach your dev app from anywhere on the internet while
  it runs. Do not share it, and press Ctrl+C in the tunnel terminal when you are done.
- **Android only, no install.** Connect by USB with USB debugging on. In desktop Chrome open
  `chrome://inspect/#devices`, add port forwarding `3000` to `localhost:3000`, then open `http://localhost:3000`
  in the phone's Chrome. Chrome treats that as a secure page, so the microphone and location work.

### Safety checklist

- **Use a throwaway database.** The dev server writes to the real database named in `server/.env`, so everything
  you do on the phone (sign-ups, jobs, ratings) is saved there. `MONGODB_DB=hunar_dev` points the server at a
  separate database called `hunar_dev` on the same MongoDB server (it is created on first use). Delete it in Atlas
  when you are finished.
- **Only on Wi-Fi you trust** (home, or your own phone hotspot). Phone mode lets everyone on that network open the
  app and its API, and sign-in has no OTP yet (see "Known gaps"), so a stranger could sign in with someone else's
  phone number. Do not use it in cafes, campuses or hotels.
- The API server (port 4000) listens on all network interfaces whenever it runs, even with plain `npm run dev`.
  Keep the macOS firewall on and stop the servers when you are not testing.

### Add it to the phone's home screen

- **iPhone (Safari):** open the address, tap the Share button, then **Add to Home Screen**, then **Add**.
- **Android (Chrome):** open the address, tap the three-dot menu, then **Add to Home screen** (or **Install app**),
  then **Add**.

Hunar then opens from its own icon without the browser bar (it ships a web app manifest). The icon remembers the
address you added it from: a Wi-Fi address stops working when your computer's address changes, and a tunnel address
stops working each time the tunnel restarts. Treat the icon as temporary and delete it after testing.

## Commands

| Command | What it does |
|---|---|
| `npm run install:all` | Installs dependencies in `client/` and `server/` |
| `npm run dev` | API and app together, on localhost only |
| `npm run dev:phone` | Same, but reachable from your phone on the same Wi-Fi |
| `npm run dev:server` / `dev:client` | Run one side only |
| `npm run check` | Verifies MongoDB and Gemini connectivity |
| `npm run typecheck` | TypeScript check for both packages |
| `npm test` | Server and client tests |
| `npm run build` | Builds the client, then compiles the server |
| `npm start` | Runs the built server (it also serves the built client) |

## Tests

```bash
npm run typecheck
npm test                                    # server unit and API tests, client unit tests
HUNAR_TEST_AI=1 npm --prefix server test    # also runs the real Gemini fan-story chat
```

The API tests run against a database named **`hunar_test`**, refuse to run against any other, and drop it when
finished. The live AI test is skipped unless `HUNAR_TEST_AI=1` is set, because it calls Gemini.

## Production

```bash
npm run build
NODE_ENV=production npm start
```

One Node process serves the API and the built client from the same origin, so the session cookie stays first-party.
Put it behind HTTPS (a platform proxy or load balancer). In production the server trusts one proxy hop and sets
`Secure` cookies. Set `MONGODB_URI`, `GEMINI_API_KEY` and `PORT` in the host's environment instead of using
a `.env` file. Health check: `GET /api/health`.

## Troubleshooting

| You see | Why and what to do |
|---|---|
| `Missing script: "dev"` | You are not in the repo root. `cd` to the folder with the top-level `package.json` |
| `Invalid server environment` | `server/.env` is missing or incomplete. The message names the variables |
| MongoDB `ENOTFOUND`, `server selection timed out` or `ReplicaSetNoPrimary` | Atlas is blocking your IP (Network Access), the URI is wrong, or DNS flickered. The server retries 5 times on start |
| Gemini `404 ... no longer available to new users` | That model is closed to your key. Set `GEMINI_MODEL` to one that `npm run check` lists |
| Gemini `503 high demand` | Temporary. The server retries and switches to the fallback model; the chat also offers a form |
| `Port 3000 is already in use` | Another dev server is running. Stop it, or find it with `lsof -nP -iTCP:3000 -sTCP:LISTEN` |
| Blank banner on the landing page | `client/public/images/naka-workers.jpg` is missing |
| Shows Hindi or Marathi, not English | The language you chose last is saved in the browser. Tap **EN** |
| Cannot test the second role | You are still signed in. Use a private window |
| `Cannot find module './routeTree.gen'` | That file is generated, not committed. Run `npm run dev`, `npm run typecheck` or `npm --prefix client run generate` once |

## Layout

```
client/                    React 19 + TanStack Router/Query + Tailwind 4 (Vite)
  src/routes/              pages (landing, login, worker, customer, rights, check-job, public card)
  src/components/          job-chat.tsx (AI chat), job-form.tsx, job-card.tsx, hunar-card.tsx, ...
  src/content/schemes.ts   Rights Hub scheme data
  src/routeTree.gen.ts     generated route map (not committed; dev, build and typecheck create it)
  src/lib/                 api client, i18n, queries, chat helpers, device helpers
server/                    Express 5 + MongoDB driver + Google Gemini (TypeScript)
  src/routes/              auth, me, jobs, workers
  src/ai/jobChat.ts        the posting chat: prompt, validation, what is missing
  src/domain/              score.ts (Hunar score), fairPay.ts (fair-pay check)
  test/                    unit tests and end-to-end API tests
scripts/dev.mjs            runs the API and client together
```

## How the posting chat works

A customer describes a job (text, voice or a photo). `POST /api/jobs/chat` is stateless: each turn sends the
conversation plus the draft built so far, so a photo is uploaded once. Gemini fills in the draft and suggests the
next question, but the server decides what is still missing (problem, when, budget, place, payment) and when the
ticket is complete. The model can never invent a budget, place or payment term. The result is either one question
with tap-chips, or a finished ticket shown as a preview. If the assistant fails or asks too many questions, the
customer lands on the manual form with everything so far filled in.

## Data model (MongoDB)

`users` (workers and customers, unique phone, public Hunar Card id), `jobs`, `reviews` (one per side per job),
`sessions` (hashed tokens, expire on their own). Collections and indexes are created on first start.

## Security notes

- Sessions are random tokens in an `httpOnly` cookie; only their SHA-256 is stored.
- Who you are always comes from the session. The client never sends a worker or customer id.
- Job state changes are atomic and rule-checked on the server: one worker per job, only the two parties can
  complete or rate, rating only after completion and only once per side.
- Phone numbers are shared only between the customer and the assigned worker, after a job is accepted.
- State-changing requests must be JSON (CSRF guard), sign-in and the AI assistant are rate limited, and helmet
  headers with a content security policy are on.

## Reference content

`client/src/content/schemes.ts` holds the Rights Hub scheme information. Each entry was checked against the
scheme's official site or a Government of India page on the date in `CHECKED_ON`. Amounts and rules change:
re-verify before each release and update the date.

## Known gaps

- **Sign-in has no OTP.** Anyone who knows a phone number can sign in as that user, and the app shows each party the
  other's number after a job is accepted. Add an SMS provider (for example Firebase Auth or Twilio Verify) before
  real public use.
- **Fair-pay rule is a placeholder.** `server/src/domain/fairPay.ts` flags anything under ₹500. It needs per-trade
  rates, and the budget chips in the chat are model suggestions until it has them.
- Rate limiting is in memory (per process). Use a shared store if you run several instances.
- Voice input uses the browser's speech recognition, which works best in Chrome on Android and needs HTTPS.
