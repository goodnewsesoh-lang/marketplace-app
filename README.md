# Marketplace

A social marketplace phone app (Android and iOS) built with Expo (React Native), TypeScript and Supabase.
Buyers discover products, follow sellers and contact them directly. V1 has no in-app payments.

## Run it

1. Install Node.js (LTS) from nodejs.org.
2. In this folder run:
   ```
   npm install
   npx expo install --fix
   ```
   The second command adjusts package versions so they match your Expo version.
3. Copy `.env.example` to `.env` and fill in your Supabase values
   (Project Settings -> API: the Project URL and the Publishable key).
   Never use the secret or service_role key, and never commit `.env`.
4. Start the app:
   ```
   npx expo start --tunnel
   ```
5. Install **Expo Go** on your phone and scan the QR code.

## Build steps

1. Foundation, login, sign up, password reset, tab navigation (current)
2. Profiles and Become a Seller
3. Products with photos
4. Home, Explore and Search
5. Product page, seller store, contact seller
6. Save, follow, share
7. Seller dashboard
8. Admin and moderation
9. Polish, then installable Android and iPhone builds

## Database

The Supabase tables, security rules and storage buckets are created from SQL (kept in `supabase/`
as it is added). Row Level Security is on for every table.
