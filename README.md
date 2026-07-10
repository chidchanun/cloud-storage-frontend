# AnuCloud Frontend

Angular frontend for AnuCloud, a Google Drive / OneDrive style cloud storage app.

## Stack

- Angular 21
- Angular SSR with Express
- Tailwind CSS
- Lucide Angular icons
- Local Kanit font from `public/fonts/Kanit`

## Main Features

- Login, register, Google OAuth callback
- Email verification flow
- Dashboard
- My Drive with folders, grid/list view, upload progress, chunk upload, rename, move, delete, share, and star
- Shared with me
- Starred files and folders
- Recent files
- Trash
- Profile update and password setup
- Plan upgrade UI

## Requirements

- Node.js 24 or compatible with the Docker image
- npm
- Backend API running locally or deployed

## Environment

Frontend API URLs are configured in:

- Local: `src/environments/environment.ts`
- Production: `src/environments/environment.production.ts`

Current values:

```ts
// local
apiUrl: 'http://localhost:9000/api'

// production
apiUrl: 'https://cloudstorageapi.chidchanun.online/api'
```

If the backend port/domain changes, update these files before building.

## Install

```bash
npm ci
```

## Development

```bash
npm start
```

Open:

```text
http://localhost:4200
```

## Build

```bash
npm run build
```

Build output:

```text
dist/cloud-storage-frontend
```

## Run SSR Build Locally

```bash
npm run build
node dist/cloud-storage-frontend/server/server.mjs
```

Default port:

```text
4000
```

You can override it:

```bash
PORT=4000 node dist/cloud-storage-frontend/server/server.mjs
```

PowerShell:

```powershell
$env:PORT="4000"
node dist/cloud-storage-frontend/server/server.mjs
```

## Docker

Build image:

```bash
docker build -t anucloud-frontend:latest .
```

Run container:

```bash
docker run -d \
  --name anucloud-frontend \
  --restart unless-stopped \
  -p 4000:4000 \
  anucloud-frontend:latest
```

PowerShell:

```powershell
docker run -d `
  --name anucloud-frontend `
  --restart unless-stopped `
  -p 4000:4000 `
  anucloud-frontend:latest
```

## Cloudflare Tunnel

Recommended public hostname mapping:

```text
cloudstorage.chidchanun.online -> http://anucloud-frontend:4000
```

If `cloudflared` is not in the same Docker network, use the host address:

```text
cloudstorage.chidchanun.online -> http://host.docker.internal:4000
```

## Performance Notes

- Static files are served by the SSR Express server from `dist/cloud-storage-frontend/browser`.
- `src/server.ts` uses long-lived static cache headers.
- `src/index.html` preconnects to the production API domain.
- Kanit is loaded locally from `public/fonts/Kanit`.
- For better production performance, place Nginx/Caddy in front of the SSR server to enable gzip/brotli and stricter cache rules.

## Useful Commands

```bash
npm run build
npm test
```

## Project Structure

```text
src/app/core        Shared services, guards, API clients
src/app/features    Pages and feature modules
src/app/shared      Shared UI components
src/environments    API URL configuration
public/fonts        Local font files
```
