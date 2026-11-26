# Trade Seekerz

A unified Next.js marketplace and administration app for New Zealand homeowners and tradespeople. The public site and account workflows use the same local Supabase instance as the staff workspace at `/admin`.

## Run locally

Use Node.js 22 or newer and a running Docker engine.

```sh
npm ci
npm run db:start
npm run demo
npm run dev
```

- The app opens at [http://127.0.0.1:3000](http://127.0.0.1:3000).
- Supabase Studio opens at [http://127.0.0.1:55423](http://127.0.0.1:55423).
- Captured verification, password reset, and marketplace emails are visible in [Mailpit](http://127.0.0.1:55424).

The database command uses this repository’s local Supabase configuration, applies migrations to a new local stack, and writes the stack’s keys to the ignored `.env.local` file. The seed includes trade categories and the local pricing catalog. The optional demo command creates synthetic accounts and job listings. Docker’s Supabase services use the CLI’s normal development port bindings. Use the synthetic data on a trusted development machine.

### Demo accounts

All four demo accounts use `TradeSeekerzLocal2026!`. The seed verifies these addresses during setup. New registrations use the normal verification email flow.

| Email | Role |
| --- | --- |
| `owner@tradeseekerz.test` | Homeowner |
| `trade@tradeseekerz.test` | Tradesperson |
| `plumber@tradeseekerz.test` | Tradesperson |
| `admin@tradeseekerz.test` | Staff, with access to `/admin` |

To stop Supabase while retaining local data, run `npm run db:stop`. Start it again with `npm run db:start`. Next.js listens on loopback.

## Marketplace behaviour

- Homeowners post, edit, and cancel open jobs. They can request a specific tradesperson by opening that business’s directory profile. A direct request is visible to the homeowner, the invited tradesperson, and staff.
- Tradespeople start with three tokens. A successful application spends one token in the same transaction that creates the application. Each tradesperson can apply once per listing. A withdrawn application releases the slot and keeps its original charge.
- The applicant and homeowner can exchange messages and quotes. The homeowner awards a job by accepting a quote. The awarded tradesperson can receive one review after completion.
- Project photos and trade documents use separate private Storage buckets. RLS controls who can read them. Staff can review licences and insurance documents. Affected files need to be removed through the app before permanent account deletion.
- Database checks govern status and role. A staff grant is independent of the marketplace account role. Deactivation, banning, staff access removal, and confirmed hard deletion are distinct actions. Moderation decisions and their staff attribution are recorded.

## Local billing and email

Checkout defaults to a local simulator. It supports successful and failed payments and local membership cancellation. The same database fulfillment logic checks order totals and currency, records events, and guards against duplicate credits. Refunds reverse credits in proportion to the cumulative refunded amount. An opened dispute reverses the disputed portion, and a won dispute restores the amount beyond any refund. A customer can have a negative balance after a reversal and needs a positive balance before applying again.

App notifications enter a database outbox in the same transaction as the triggering activity. The app processes due deliveries after the response. Staff can also process due deliveries from Admin Settings. Supabase Auth templates and marketplace notifications are captured by Mailpit locally.

Optional provider adapters are present for Stripe Checkout and Resend. Hosted Resend notifications use `RESEND_ENABLED=1`, `RESEND_API_KEY`, and `EMAIL_FROM`. Stripe uses its own `LIVE_INTEGRATIONS` flag. Both require a non-loopback app origin. Connecting a real environment requires confirming the Stripe prices and webhook configuration, verifying the Resend sender and setting custom SMTP in Supabase Auth, and running an integration rehearsal with separate provider test credentials.

## Verify changes

With local Supabase running, run `npm run check` for lint, type checking, database tests, and the production build. For browser coverage, start the app, install Playwright’s Chromium with `npx playwright install chromium` if needed, and run `npm run test:e2e`. Screenshots are written under `.local/visual`.

Run `npm run db:types` after applying a local schema change. Add new migrations with the pinned Supabase CLI and check the local migration history before editing schema files. The RLS and billing tests require a disposable local environment and create their own test accounts.

## Backup and recovery

Run `npx supabase db dump --local --schema public,auth --data-only --file .local/trade-seekerz-data.sql` to export local rows and retain the migrations as the schema source. Back up uploaded files independently of the database dump. Rehearse restoring the export and files to a separate local stack before relying on it. Keep provider credentials out of exports and out of Git.
