# FreeAgents Platform

Welcome to **FreeAgents**, a Next.js/Node platform for managing freelance sports talent, payments and community.  This monorepo is composed of several autonomous modules (agents) that have been merged together during integration.  The goal of this document is to make it easy to get a local copy running, understand how the various services fit together, and deploy the application to production.

## Table of contents

1. [Local development](#local-development)
2. [Environment configuration](#environment-configuration)
3. [Stripe setup](#stripe-setup)
4. [Discord OAuth & bot setup](#discord-oauth--bot-setup)
5. [Seeding your database](#seeding-your-database)
6. [Deployment on Render](#deployment-on-render)
7. [Legal and billing pages](#legal-and-billing-pages)

## Local development

This project uses **Node.js** and **Next.js**.  To run the app locally you will need a recent version of Node (≥18) and npm or yarn.

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/freeagents.git
   cd freeagents
   ```

2. **Install dependencies**

   ```bash
   # using npm
   npm install

   # or using yarn
   yarn install
   ```

3. **Configure your environment**

   Copy the provided `.env.example` to `.env` and fill in the values specific to your setup.  See the [Environment configuration](#environment-configuration) section for details on each key.

   ```bash
   cp .env.example .env
   # then edit .env in your editor of choice
   ```

4. **Run database migrations** (if using Prisma)

   The project uses Prisma as an ORM.  After setting up your `DATABASE_URL`, run the migrations and generate the client:

   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

5. **Seed the database**

   A seeding script is provided at `scripts/seed.js`.  Run it once after your database is created to insert sensible defaults:

   ```bash
   node scripts/seed.js
   ```

   The seeding script performs the following actions:

   - Creates a default pricing configuration if none exists.
   - Promotes the user with the email `theceoion@gmail.com` to the `OWNER` role when they first log in.
   - Adds a basic team, player and listing so that the application has some content to display out of the box.

6. **Start the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

   The app will be running at `http://localhost:3000`.  Visit it in your browser to verify everything works.

## Environment configuration

The app uses a number of environment variables to connect to external services such as PostgreSQL, Stripe, Discord and Redis.  All expected keys are enumerated in `.env.example`.  When running locally you should create a `.env` file at the project root and set the following values:

- **Application basics**
  - `NODE_ENV` – set to `development` locally.
  - `NEXT_PUBLIC_APP_URL` – the base URL of your frontend (e.g. `http://localhost:3000`).
  - `JWT_SECRET` – a random secret used to sign JSON Web Tokens.  Generate a long random string.
  - `NEXTAUTH_SECRET` – secret used by NextAuth for session encryption (can be the same as `JWT_SECRET`).
  - `NEXTAUTH_URL` – full URL where NextAuth callbacks will be served; usually matches `NEXT_PUBLIC_APP_URL` in development.

- **Database**
  - `DATABASE_URL` – your PostgreSQL connection string (e.g. `postgresql://user:password@localhost:5432/freeagents`).
  - `DIRECT_URL` – optional; override for direct DB connections in Prisma migrations.

- **Stripe**
  - `STRIPE_SECRET_KEY` – your Stripe secret key.
  - `STRIPE_PUBLISHABLE_KEY` – your Stripe publishable key for the frontend.
  - `STRIPE_WEBHOOK_SECRET` – webhook signing secret (see [Stripe setup](#stripe-setup)).
  - `STRIPE_PRICE_ID` – the ID of the recurring subscription price or product you want to charge for.

- **Discord**
  - `DISCORD_CLIENT_ID` – OAuth application client ID.
  - `DISCORD_CLIENT_SECRET` – OAuth application client secret.
  - `DISCORD_BOT_TOKEN` – token for your Discord bot (used for guild management or message interactions).
  - `DISCORD_PUBLIC_KEY` – public key used to verify slash‑command signatures.
  - `DISCORD_GUILD_ID` – ID of the Discord guild (server) your bot should join by default.
  - `DISCORD_BOT_ID` – optional; the bot’s user ID (not strictly necessary but convenient for invitations).

- **Supabase (optional)**
  - `SUPABASE_URL` – your Supabase project URL.
  - `SUPABASE_ANON_KEY` – the client’s anonymous key for Supabase.
  - `SUPABASE_SERVICE_KEY` – service role key for server-side actions.

- **OpenAI / LLM**
  - `OPENAI_API_KEY` – API key for OpenAI (used by chat/report modules).

- **Upstash Redis**
  - `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` – tokens for rate limiting or caching.

- **Miscellaneous**
  - `MAIL_FROM` – address used as the “from” field for transactional emails.
  - `MAIL_SERVER_URL` – SMTP connection string if you send emails locally.

Make sure to keep your `.env` file out of version control.  Never commit real secrets to the repository.

## Stripe setup

The billing system is powered by Stripe.  To enable payments you’ll need to create a Stripe account and configure a product and price.

1. **Create or log in to your Stripe account** at <https://dashboard.stripe.com>.
2. **Create a product** representing your subscription or one‑off service.  Under *Products*, click **Add product**, choose a name (e.g. _FreeAgents Pro_) and description.
3. **Create a price** under that product.  Set the currency and amount.  For recurring subscriptions choose a billing interval (monthly or yearly).  After saving, copy the **Price ID** – this value becomes `STRIPE_PRICE_ID` in your `.env`.
4. **Obtain your API keys** from the *Developers → API keys* section.  Use the **secret key** for `STRIPE_SECRET_KEY` and the **publishable key** for `STRIPE_PUBLISHABLE_KEY`.
5. **Configure a webhook endpoint** so Stripe can notify your app about successful payments, cancellations and billing events.  In the Stripe dashboard under *Developers → Webhooks*, add an endpoint pointing to `https://yourdomain.com/api/billing/webhook`.  Select the events you want to listen for (e.g. `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.updated`).  After creating the endpoint, copy the **Signing secret** and set it as `STRIPE_WEBHOOK_SECRET`.

With these values in place you can use the built‑in billing pages in FreeAgents to create checkout sessions, manage subscriptions and handle webhooks.

## Discord OAuth & bot setup

The application uses Discord both as an authentication provider and as a communication channel for chat and reports.  To configure Discord integration you will need to register an application and bot in the [Discord Developer Portal](https://discord.com/developers/applications).

1. **Create an application** – After logging in to the developer portal, click **New Application**.  Give your app a name (e.g. _FreeAgents_) and choose a team if applicable.
2. **Enable OAuth2** – Under **OAuth2 → General**, set a redirect URL to your site’s authentication callback.  For local development this is usually `http://localhost:3000/api/auth/callback/discord`.  Add additional URLs for staging or production as needed.  Note the **Client ID** and **Client Secret** and paste them into your `.env` as `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`.
3. **Add a bot** – In the sidebar click **Bot** and then **Add Bot**.  Copy the **Bot token** and set it as `DISCORD_BOT_TOKEN`.  Under **Privileged Gateway Intents** enable the `SERVER MEMBERS INTENT` and `MESSAGE CONTENT INTENT` if your bot will need to read messages or manage guild members.
4. **Invite the bot to your guild** – Generate an invite link under **OAuth2 → URL Generator**.  Select the `bot` scope and the necessary permissions (e.g. `Send Messages`, `Manage Roles`).  Use the link to add the bot to your Discord guild.  The guild’s unique ID can be copied by enabling *Developer Mode* in Discord settings and right‑clicking on your server icon.  Put this in your `.env` as `DISCORD_GUILD_ID`.
5. **Public key** – If your bot handles slash commands or interactions via a webhook, Discord will provide a **public key** on the **General Information** page.  This key is used to verify incoming requests and should be stored as `DISCORD_PUBLIC_KEY`.

Once configured, users can sign in with Discord, the bot will listen to events in your guild and the chat/reports modules will function correctly.

## Seeding your database

To bootstrap your environment with sensible defaults, run the seeding script in `scripts/seed.js` after running migrations.  The script is idempotent and can be run multiple times; it will not create duplicate records.

The script will:

1. Check for an existing pricing configuration.  If none exists, it inserts a default record with zero cost.
2. Look up the user with email `theceoion@gmail.com`.  If the user exists but is not yet an `OWNER`, the script updates their role to `OWNER`.  The actual promotion happens on first login; this script merely ensures the necessary role is available.
3. Insert a single test team, player and listing if your database is empty.  This test data is meant only for local development and can be removed in production.

Execute the script via:

```bash
node scripts/seed.js
```

## Deployment on Render

Render.com is an easy way to deploy full‑stack applications.  Below is a basic outline for deploying FreeAgents to Render.  You can adjust commands and environment variables for other providers such as Vercel, Netlify or your own infrastructure.

1. **Create a PostgreSQL database** – On Render create a new PostgreSQL instance and copy the connection string.  Set it as `DATABASE_URL` (and optionally `DIRECT_URL`) in your Render service’s environment variables.

2. **Provision a Redis instance** (optional) – For caching and rate limiting you may want to provision Upstash or Redis on Render.  Copy the REST URL and token into `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

3. **Create a new web service** – In Render choose **Blueprint Deploy** if deploying from a repository with a `render.yaml` file, or **Web Service** if deploying manually.  Point it at your GitHub repository and choose the appropriate branch.

4. **Set build and start commands** – Use the following commands:

   - **Build command**: `npm install && npm run build`
   - **Start command**: `npm run start`

5. **Environment variables** – In the service settings, add all variables from your local `.env` (except for values that differ in production).  Make sure your `NEXTAUTH_URL` is set to your Render domain (e.g. `https://freeagents.onrender.com`).

6. **Database migrations** – Add a [render.yaml](https://render.com/docs/bluprint-spec) file or use a build script to run `npx prisma migrate deploy` during the build phase.  If you choose not to use a blueprint, you can run migrations manually via the Render shell after deployment.

7. **Webhook endpoints** – Update your Stripe webhook endpoint to match your Render domain: `https://freeagents.onrender.com/api/billing/webhook`.  For Discord bots running as a separate process, consider deploying a background worker or serverless function that consumes events.

8. **Test your deployment** – Once deployed, open your Render URL and sign up.  Ensure that authentication, billing, chat and reports pages load correctly and that your Stripe and Discord integrations are functioning.

## Legal and billing pages

FreeAgents ships with bare‑bones legal and billing pages under `src/pages`.  These pages are required for compliance with payment providers and to meet common legal obligations.

- **/legal** – Contains links to your Terms of Service and Privacy Policy.  You should edit the placeholder content to reflect your organisation’s policies.
- **/billing** – Provides a self‑serve portal where authenticated users can manage their subscription, payment method and invoices.  The page uses Stripe’s billing APIs under the hood.

You can find these pages in this repository and customise them to your needs.  If you add new routes, remember to update your navigation component to include links to them.

---

If you run into issues while setting up or deploying the app, feel free to open an issue or reach out to the maintainers.  Contributions and improvements to the documentation are welcome.