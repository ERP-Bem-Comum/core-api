# Deploying a Static Site

## Building the App

Execute `npm run build` to compile your application. By default, output goes to the `dist` folder, which you can deploy to any platform.

### Testing Locally

Run `npm run preview` to start a local static server at `http://localhost:4173` for testing your production build. You can customize the port using the `--port` flag.

## Deployment Platforms

### GitHub Pages

1. Update `vite.config.js` with the correct `base`:
   - Use `'/'` for `https://<USERNAME>.github.io/`
   - Use `'/<REPO>/'` for repository-based deployments

2. Enable GitHub Pages in repository Settings → Pages, selecting "GitHub Actions" as the source

3. Create `.github/workflows/deploy.yml` with a workflow that installs dependencies, builds, and deploys on pushes to `main`

### GitLab Pages

Set `base` in `vite.config.js` appropriately, then create `.gitlab-ci.yml` that builds and copies `dist/` to `public/` on commits to the default branch.

### Netlify

**Via CLI:** Install Netlify CLI, run `netlify init`, then deploy with `netlify deploy` (use `--prod` flag for production)

**Via Git:** Connect your repository to Netlify and specify the output directory as `dist`

### Vercel

**Via CLI:** Install Vercel CLI and run `vercel`

**Via Git:** Import your project to Vercel; it auto-detects Vite and configures deployment settings

### Cloudflare

**Workers:** Install `@cloudflare/vite-plugin`, add to config, then deploy with `npx wrangler deploy`

**Pages:** Connect your Git repository in Cloudflare dashboard, select your framework preset, and deploy

### Google Firebase

1. Install `firebase-tools` globally
2. Create `firebase.json` and `.firebaserc` files
3. Run `npm run build` then `firebase deploy`

### Additional Platforms

- **Surge:** Install surge CLI, build, then run `surge dist`
- **Azure Static Web Apps:** Use VS Code extension to create and deploy
- **Render:** Create Static Site, connect repository, set build command and publish directory
- **Others:** Flightcontrol, Kinsta, xmit, Zephyr Cloud, EdgeOne Pages (see documentation links)

> **Nota da captura:** esta página foi parcialmente resumida pelo WebFetch. Para os snippets YAML/JSON completos de cada provedor, consulte https://vite.dev/guide/static-deploy
