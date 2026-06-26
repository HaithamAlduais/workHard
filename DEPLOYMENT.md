# Deployment

## Supabase

1. Create a Supabase project
2. Set environment variables from `.env.example`
3. Link CLI: `supabase link --project-ref your-ref`
4. Push migrations: `supabase db push`
5. Apply seed: `supabase seed run`

## Web (PWA)

```bash
cd apps/mobile
npm run build:web
```

Deploy the `dist` folder to Vercel, Netlify, or any static host.

## Mobile

Install EAS CLI:

```bash
npm install -g eas-cli
eas login
eas build:configure
```

Build preview APK:

```bash
cd apps/mobile
eas build -p android --profile preview
```

Build iOS:

```bash
eas build -p ios --profile production
```

## EAS Update

```bash
cd apps/mobile
eas update --branch preview --message "Update"
```

## Environment Variables

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EAS_PROJECT_ID`
- `OPENAI_API_KEY` (optional, for AI coach)
