# Munchledger

Bilingual English and Tamil stock, sales, and customer-history app for a snacks manufacturing business. Built with Next.js App Router and Supabase.

## Run locally

1. Install Node.js 20.9 or newer.
2. Create a Supabase project.
3. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from **Supabase Dashboard → Project Settings → API**. The legacy anon key can also be supplied as `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Open `supabase/schema.sql` in **Supabase Dashboard → SQL Editor**, run the script, and confirm it completes.
5. Run `npm install`, then `npm run dev`, and open `http://localhost:3000`.

## Data and access

Products, raw materials, sales, customers, employee records, attendance, and wages are stored in one shared Supabase workspace. The app has no sign-in flow: visitors see and can edit the same records. The Inventory menu tracks raw materials in kilograms or whole units, with low-stock reminders and add/use adjustments. Sale recording and finished-product stock deduction happen together in a database function, so two sales cannot oversell the same stock.

The app uses the Supabase publishable key in the browser. Do not put a Supabase secret or service-role key in `NEXT_PUBLIC_*` variables.

Run the updated `supabase/schema.sql` in the SQL Editor to enable shared public access and create the raw-material table and adjustment function. Existing records are preserved.
