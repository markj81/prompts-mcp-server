# prompts-mcp-server

MCP server for reusable prompt templates loaded from markdown files. Templates support `{{variable}}` placeholder substitution and are hot-reloadable without restarting the server.

## Setup

```bash
npm install
npm run build
```

## Running

```bash
# Default port 3000, templates from ./templates
npm start

# Custom config
TEMPLATES_DIR=/path/to/your/templates PORT=8080 npm start
```

The MCP endpoint is available at `http://localhost:3000/mcp`.

## Template Format

Templates are `.md` files in the `templates/` directory. Optionally add a description via HTML comment frontmatter:

```markdown
<!-- description: A short description of what this template does -->
Your prompt content here with {{variable}} placeholders.

More content referencing {{another_variable}}.
```

- Variables use `{{double_curly_braces}}` syntax
- Any `{{variable}}` not provided at render time is left as-is
- Templates are loaded fresh from disk on every call (no restart needed after edits)

## Tools

| Tool | Description |
|------|-------------|
| `prompts_list_templates` | List all templates with their variables |
| `prompts_get_template` | Get raw content of a specific template |
| `prompts_render_template` | Render a template with variable substitution |
| `prompts_reload_templates` | Force reload from disk (after adding/editing files) |

## Example Usage

**List templates:**
```json
{ "tool": "prompts_list_templates" }
```

**Render a template:**
```json
{
  "tool": "prompts_render_template",
  "name": "code-review",
  "variables": {
    "language": "TypeScript",
    "code": "const x = 1"
  }
}
```

## Claude Desktop Config

```json
{
  "mcpServers": {
    "prompts": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

---

## Deploying to Railway

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/prompts-mcp-server.git
git push -u origin main
```

### 2. Create a Railway project

1. Go to [railway.app](https://railway.app) and sign in
2. **New Project → Deploy from GitHub repo** → select your repo
3. Railway auto-detects the `Dockerfile` and builds it

### 3. Get your public URL

Railway assigns a URL — enable it under your service → **Settings → Networking → Generate Domain**.

Update your MCP client config:

```json
{
  "mcpServers": {
    "prompts": {
      "url": "https://your-app.up.railway.app/mcp"
    }
  }
}
```

### Environment variables (optional)

| Variable | Default | Notes |
|----------|---------|-------|
| `PORT` | `3000` | Injected automatically by Railway |
| `TEMPLATES_DIR` | `/app/templates` | Override if using a mounted volume |

### Updating templates

Edit `.md` files, commit, push → Railway redeploys automatically.

For editing templates at runtime without redeployment: add a **Railway Volume** mounted at `/app/templates`.
