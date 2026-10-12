# Google sign-in setup

The app uses Supabase OAuth with PKCE. On Android, Google opens in the system browser and returns to the app through the registered deep link `com.prepareai.app://auth/callback`. Google sign-in also creates a Supabase user on first use.

## Configure Google OAuth

1. In Google Auth Platform, create an OAuth client with application type **Web application**.
2. Add `http://localhost:3000` as an authorized JavaScript origin for local web testing.
3. Add this authorized redirect URI to the Google OAuth client:

   `https://ldnxazsdxtrjwpxowoim.supabase.co/auth/v1/callback`

4. In Supabase Dashboard → Authentication → Sign In / Providers → Google, enable Google and enter that OAuth client's client ID and client secret. Keep the secret in Supabase Dashboard; do not put it in frontend code or commit it.
5. In Supabase Dashboard → Authentication → URL Configuration → Additional Redirect URLs, allow:

   - `http://localhost:3000/auth`
   - `com.prepareai.app://auth/callback`

   Add the production website callback separately before release.

## Run and verify on Android

From the frontend project directory, start the Android-mode Vite server and launch the emulator app:

```sh
npm run dev -- --mode android --host 0.0.0.0 --port 3000
npx cap run android --live-reload --host 10.0.2.2 --port 3000 --target Pixel_8_Pro
```

Tap **Continue with Google**. A first-time Google user should return to the app signed in with a new Supabase account. The Python backend will recognize the same Supabase identity on its next authenticated API request.
