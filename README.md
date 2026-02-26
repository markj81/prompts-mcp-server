# prompts-mcp-server

## Stop Copy-Pasting Prompts

Every team that uses AI seriously eventually hits the same wall.

Someone writes a brilliant prompt for reviewing pull requests. It lives in their notes app. A colleague asks for it, gets it over Slack, tweaks it slightly, saves their own version. Three months later there are six variants floating around, nobody knows which is current, and half the team isn't using any of them because they never got the memo.

This is the prompt sprawl problem. And it's more damaging than it looks.

### What's Actually at Stake

Prompts are intellectual property. When your team figures out how to reliably get a certain quality of output from an AI — a code review that catches the right things, a summary that hits the right level of detail, a customer email that lands the right tone — that's hard-won knowledge. It deserves to be treated like shared infrastructure, not a sticky note.

The cost of sprawl isn't just inconsistency. It's:

- **Onboarding friction** — new team members improvise instead of inheriting what works
- **Quality variance** — the same task done ten different ways produces ten different quality levels
- **Lost iteration** — when someone improves a prompt, nobody else gets the benefit
- **No history** — you can't see what changed, when, or why

### Prompts as Shared Infrastructure

The fix is straightforward: treat your best prompts the way you treat your best code. Put them in one place, version them, and make them available to everyone.

This MCP server does exactly this. Your templates live in a repository as plain markdown files — readable by anyone, editable like any other text, reviewed like any other change. When someone improves the code review prompt, they open a pull request. The team discusses it. It merges. Everyone gets the update automatically.

No Slack messages. No "which version are you on?" No copy-pasting.

### Variables, Not Walls of Text

Good shared prompts aren't static. They have placeholders — `{{language}}`, `{{tone}}`, `{{context}}` — that let you apply the same structure to different situations without rewriting from scratch.

Think of it like a form. The *shape* of what makes a good code review is stable. The language, the codebase, the specific focus area — those change every time. With variable substitution, your team maintains one high-quality template and fills in the blanks, rather than maintaining dozens of near-identical variants.

### One Source, Every Tool

The other problem with prompts living in notes apps and Slack threads is that they're tied to one person's workflow. This server means the same templates are available in every tool that speaks MCP — your terminal, your editor, your desktop app. Write the prompt once, use it everywhere.

### The Practical Upside

When prompts are shared infrastructure:

- A new hire can be productive on day one — the team's best patterns are right there
- Quality becomes consistent and ratchets upward — improvements compound
- You can actually measure what works — when everyone uses the same templates, you can compare results and iterate deliberately
- Ownership is clear — templates are in version control, with authors, history, and review

---

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

## Connecting to Claude Code

```bash
claude mcp add --transport http prompts https://your-app.up.railway.app/mcp
```

## Claude Desktop Config

```json
{
  "mcpServers": {
    "prompts": {
      "url": "https://your-app.up.railway.app/mcp"
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

### Environment variables (optional)

| Variable | Default | Notes |
|----------|---------|-------|
| `PORT` | `3000` | Injected automatically by Railway |
| `TEMPLATES_DIR` | `/app/templates` | Override if using a mounted volume |

### Updating templates

Edit `.md` files, commit, push → Railway redeploys automatically.

For editing templates at runtime without redeployment: add a **Railway Volume** mounted at `/app/templates`.