# Deployment Guide

## Firebase Setup (Recommended)

The project now uses Firebase Realtime Database for multiplayer functionality, which works perfectly with Netlify and other static hosting platforms.

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Follow the setup wizard
4. Enable "Realtime Database" in the Firebase console
5. Set database rules to allow read/write (for development):

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

### 2. Get Firebase Configuration

1. Go to Project Settings > General
2. Scroll down to "Your apps"
3. Click "Web" icon to create a web app
4. Copy the configuration values

### 3. Set Environment Variables

Create a `.env.local` file (copy from `.env.example`):

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com/
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Local Development

For local development with full multiplayer support:

```bash
npm run dev
```

This runs the custom Socket.IO server at `http://localhost:3000` (fallback) or Firebase (recommended).

## Netlify Deployment

With Firebase, Netlify deployment is straightforward:

### 1. Configure Environment Variables in Netlify

1. Go to your Netlify site dashboard
2. Navigate to Site settings > Environment variables
3. Add all Firebase environment variables:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`

### 2. Deploy

Push your code to your connected Git repository. Netlify will automatically build and deploy with full multiplayer support!

## Alternative: Socket.IO Server (Legacy)

If you prefer to use Socket.IO instead of Firebase:

1. **Deploy Socket.IO server separately:**
   - Heroku, Railway, Render, or DigitalOcean App Platform
   - Copy `server.js` and relevant dependencies

2. **Set environment variable:**
   - `NEXT_PUBLIC_SOCKET_URL=https://your-socket-server.herokuapp.com`

## Alternative Platforms

For full-stack deployment with the custom server:
- **Railway**: Full Node.js support with easy deployment
- **Render**: Free tier with Node.js support
- **Heroku**: Classic platform with Node.js support
- **Vercel**: Limited WebSocket support

## Environment Variables

### Firebase (Recommended)
- All `NEXT_PUBLIC_FIREBASE_*` variables listed above

### Socket.IO (Alternative)
- `NEXT_PUBLIC_SOCKET_URL`: URL of your Socket.IO server

## Build Configuration

- `dev`: Custom server with Socket.IO (fallback)
- `dev:next`: Standard Next.js dev server
- `build`: Static build for deployment
- `start`: Standard Next.js start
- `start:server`: Custom server for platforms supporting it

## Troubleshooting

### Firebase Issues
1. Verify all Firebase environment variables are set
2. Check Firebase Realtime Database rules
3. Ensure your Firebase project has Realtime Database enabled
4. Check browser console for Firebase connection errors

### Socket.IO Issues (if using legacy approach)
1. Verify `NEXT_PUBLIC_SOCKET_URL` is set correctly
2. Ensure your Socket.IO server is running and accessible
3. Check CORS settings on your Socket.IO server
4. Verify the server supports WebSocket connections