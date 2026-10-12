# Munchledger

Bilingual English and Tamil stock, sales, and customer-history app for a snacks manufacturing business. Built with Next.js App Router and Supabase.

## Run locally

1. Install Node.js 20.9 or newer.
2. Create a Supabase project.
3. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from **Supabase Dashboard → Project Settings → API**. The legacy anon key can also be supplied as `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Open `supabase/schema.sql` in **Supabase Dashboard → SQL Editor**, run the script, and confirm it completes.
5. Run `npm install`, then `npm run dev`, and open `http://localhost:3000`.
6. Create the business account from the app. Supabase Auth may require email confirmation, depending on your project’s Auth settings.

## Data and access

Products, raw materials, and sales are stored in Supabase Postgres. Row Level Security restricts each account to its own records. The Inventory menu tracks raw materials in kilograms or whole units, with configurable low-stock reminders and add/use adjustments. Sale recording and finished-product stock deduction happen together in a database function, so two sales cannot oversell the same stock. Restocking and raw-material adjustments also use database functions.

The app uses the Supabase publishable key in the browser. Do not put a Supabase secret or service-role key in `NEXT_PUBLIC_*` variables.

If the app was already set up before raw-material inventory was added, run the updated `supabase/schema.sql` in the SQL Editor to create the raw-material table and adjustment function.
