# Deployment Guide

## Local Development

For local development with full multiplayer support:

```bash
npm run dev
```

This runs the custom Socket.IO server at `http://localhost:3000`.

## Netlify Deployment

Netlify is a static hosting platform and doesn't support custom Node.js servers like our Socket.IO implementation. Here are your options:

### Option 1: Deploy Frontend Only (Current Setup)

The current Netlify deployment will work but without multiplayer features. Users will see a message indicating multiplayer is not available.

### Option 2: Separate Socket.IO Server

To enable multiplayer on Netlify, you need to deploy the Socket.IO server separately:

1. **Deploy Socket.IO server to a platform that supports Node.js:**
   - Heroku
   - Railway
   - Render
   - DigitalOcean App Platform
   - AWS/Google Cloud/Azure

2. **Set up the server:**
   ```bash
   # Create a separate repository for the server
   # Copy server.js and package.json (with socket.io dependency)
   # Deploy to your chosen platform
   ```

3. **Configure Netlify environment variable:**
   - In Netlify dashboard, go to Site settings > Environment variables
   - Add: `NEXT_PUBLIC_SOCKET_URL=https://your-socket-server.herokuapp.com`

### Option 3: Alternative Platforms

For full-stack deployment with Socket.IO support, consider:
- **Vercel**: Supports serverless functions but limited WebSocket support
- **Railway**: Full Node.js support with easy deployment
- **Render**: Free tier with Node.js support
- **Heroku**: Classic platform with Node.js support

## Environment Variables

- `NEXT_PUBLIC_SOCKET_URL`: URL of your Socket.IO server (required for production multiplayer)

## Build Configuration

The project uses a custom server for development but builds as a static site for Netlify. The `package.json` scripts are:

- `dev`: Custom server with Socket.IO
- `build`: Standard Next.js build for static deployment
- `start`: Standard Next.js start (for platforms supporting it)

## Troubleshooting

If you see Socket.IO connection errors in production:
1. Verify `NEXT_PUBLIC_SOCKET_URL` is set correctly
2. Ensure your Socket.IO server is running and accessible
3. Check CORS settings on your Socket.IO server
4. Verify the server supports WebSocket connections