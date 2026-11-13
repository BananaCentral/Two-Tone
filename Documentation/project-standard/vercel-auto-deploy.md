# Vercel Auto-Deploy

Pushes to `prototype` deploy the repository contents to the existing `two-tone` Vercel production project using the Vercel CLI.

GitHub Actions requires a repository secret named `VERCEL_TOKEN`. Add it under **Settings → Secrets and variables → Actions**. The workflow keeps the token in the Actions secret store and does not write it to the repository.

The organization and project IDs are set in the workflow. The Vercel project is not connected to Git through Vercel's Git integration, so the workflow deploys source files directly with the CLI.
