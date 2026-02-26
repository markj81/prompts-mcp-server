import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import { z } from "zod";
import fs from "fs";
import path from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PromptTemplate {
  name: string;
  description: string;
  variables: string[];
  content: string;
  [key: string]: unknown;
}

interface Skill {
  name: string;
  description: string;
  triggers: string[];
  content: string;
  [key: string]: unknown;
}

interface TemplateMetadata {
  description?: string;
}

interface SkillMetadata {
  description?: string;
  triggers?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLATES_DIR = process.env.TEMPLATES_DIR
  ? path.resolve(process.env.TEMPLATES_DIR)
  : path.join(process.cwd(), "templates");

const SKILLS_DIR = process.env.SKILLS_DIR
  ? path.resolve(process.env.SKILLS_DIR)
  : path.join(process.cwd(), "skills");

const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

// ─── Template Loader ──────────────────────────────────────────────────────────

function extractVariables(content: string): string[] {
  const vars = new Set<string>();
  let match: RegExpExecArray | null;
  const regex = new RegExp(VARIABLE_PATTERN.source, "g");
  while ((match = regex.exec(content)) !== null) {
    vars.add(match[1]);
  }
  return Array.from(vars);
}

function parseTemplateMetadata(content: string): { metadata: TemplateMetadata; body: string } {
  const frontmatterMatch = content.match(/^<!--\s*([\s\S]*?)\s*-->\n?([\s\S]*)$/);
  if (!frontmatterMatch) {
    return { metadata: {}, body: content };
  }

  const rawMeta = frontmatterMatch[1];
  const body = frontmatterMatch[2];
  const metadata: TemplateMetadata = {};

  const descMatch = rawMeta.match(/description:\s*(.+)/);
  if (descMatch) metadata.description = descMatch[1].trim();

  return { metadata, body };
}

function loadTemplate(filePath: string): PromptTemplate {
  const raw = fs.readFileSync(filePath, "utf-8");
  const name = path.basename(filePath, ".md");
  const { metadata, body } = parseTemplateMetadata(raw);
  const variables = extractVariables(body);

  return {
    name,
    description: metadata.description ?? `Prompt template: ${name}`,
    variables,
    content: body,
  };
}

function loadAllTemplates(): PromptTemplate[] {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    console.error(`Templates directory not found: ${TEMPLATES_DIR}`);
    return [];
  }

  return fs
    .readdirSync(TEMPLATES_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => loadTemplate(path.join(TEMPLATES_DIR, f)));
}

function renderTemplate(content: string, variables: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return key in variables ? variables[key] : match;
  });
}

// ─── Skill Loader ─────────────────────────────────────────────────────────────

function parseSkillMetadata(content: string): { metadata: SkillMetadata; body: string } {
  // Support YAML-style frontmatter: --- ... ---
  const yamlMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (yamlMatch) {
    const rawMeta = yamlMatch[1];
    const body = yamlMatch[2];
    const metadata: SkillMetadata = {};

    const descMatch = rawMeta.match(/description:\s*(.+)/);
    if (descMatch) metadata.description = descMatch[1].trim();

    const triggersMatch = rawMeta.match(/triggers:\s*(.+)/);
    if (triggersMatch) metadata.triggers = triggersMatch[1].trim();

    return { metadata, body };
  }

  // Fallback: HTML comment frontmatter (same as templates)
  const commentMatch = content.match(/^<!--\s*([\s\S]*?)\s*-->\n?([\s\S]*)$/);
  if (commentMatch) {
    const rawMeta = commentMatch[1];
    const body = commentMatch[2];
    const metadata: SkillMetadata = {};

    const descMatch = rawMeta.match(/description:\s*(.+)/);
    if (descMatch) metadata.description = descMatch[1].trim();

    return { metadata, body };
  }

  return { metadata: {}, body: content };
}

function loadSkill(filePath: string): Skill {
  const raw = fs.readFileSync(filePath, "utf-8");
  const name = path.basename(filePath, ".md");
  const { metadata, body } = parseSkillMetadata(raw);

  const triggers = metadata.triggers
    ? metadata.triggers.split(",").map((t) => t.trim())
    : [];

  return {
    name,
    description: metadata.description ?? `Skill: ${name}`,
    triggers,
    content: body,
  };
}

function loadAllSkills(): Skill[] {
  if (!fs.existsSync(SKILLS_DIR)) {
    console.error(`Skills directory not found: ${SKILLS_DIR}`);
    return [];
  }

  return fs
    .readdirSync(SKILLS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => loadSkill(path.join(SKILLS_DIR, f)));
}

// ─── MCP Server ───────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "prompts-mcp-server",
  version: "1.0.0",
});

// Tool: List all available templates
server.registerTool(
  "prompts_list_templates",
  {
    title: "List Prompt Templates",
    description: `List all available prompt templates loaded from the templates directory.

Returns each template's name, description, and the variable placeholders it accepts (e.g. {{name}}, {{context}}).

Use this tool first to discover what templates are available before calling prompts_render_template.

Returns:
{
  "templates": [
    {
      "name": string,         // Template filename without .md extension
      "description": string,  // From <!-- description: ... --> frontmatter
      "variables": string[]   // List of {{variable}} names found in the template
    }
  ],
  "count": number
}`,
    inputSchema: z.object({}),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async () => {
    const templates = loadAllTemplates();
    const output = {
      templates: templates.map(({ name, description, variables }) => ({
        name,
        description,
        variables,
      })),
      count: templates.length,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
      structuredContent: output,
    };
  }
);

// Tool: Get raw template content (without rendering)
server.registerTool(
  "prompts_get_template",
  {
    title: "Get Prompt Template",
    description: `Retrieve the raw markdown content of a specific prompt template by name.

Use this to inspect a template before rendering it, or when you want the raw content with {{variable}} placeholders still intact.

Args:
  - name (string): Template name (filename without .md extension, e.g. "code-review")

Returns:
{
  "name": string,
  "description": string,
  "variables": string[],  // Variables that need to be provided for rendering
  "content": string       // Raw markdown content with {{variable}} placeholders
}

Errors:
  - Returns error if template name is not found`,
    inputSchema: z.object({
      name: z.string().min(1).describe("Template name (without .md extension)"),
    }),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ name }) => {
    const filePath = path.join(TEMPLATES_DIR, `${name}.md`);

    if (!fs.existsSync(filePath)) {
      const available = loadAllTemplates().map((t) => t.name).join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Error: Template "${name}" not found. Available templates: ${available || "none"}`,
          },
        ],
        isError: true,
      };
    }

    const template = loadTemplate(filePath);
    return {
      content: [{ type: "text", text: JSON.stringify(template, null, 2) }],
      structuredContent: template,
    };
  }
);

// Tool: Render a template with variable substitution
server.registerTool(
  "prompts_render_template",
  {
    title: "Render Prompt Template",
    description: `Render a prompt template by substituting {{variable}} placeholders with provided values.

Use prompts_list_templates first to discover available templates and their required variables.

Args:
  - name (string): Template name (without .md extension)
  - variables (object): Key-value pairs for variable substitution. Keys should match the {{variable}} names in the template.
    Any {{variable}} not provided will remain as-is in the output.

Returns:
{
  "name": string,
  "rendered": string,           // Final markdown with all variables substituted
  "unresolved": string[]        // Variables that were NOT substituted (missing from input)
}

Examples:
  - Template "code-review" has {{language}} and {{code}} -> provide { "language": "TypeScript", "code": "..." }
  - Template "email-draft" has {{recipient}} and {{topic}} -> provide { "recipient": "Alice", "topic": "Q3 report" }

Errors:
  - Returns error if template name is not found`,
    inputSchema: z.object({
      name: z.string().min(1).describe("Template name (without .md extension)"),
      variables: z
        .record(z.string())
        .default({})
        .describe("Variable values to substitute into the template"),
    }),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ name, variables }) => {
    const filePath = path.join(TEMPLATES_DIR, `${name}.md`);

    if (!fs.existsSync(filePath)) {
      const available = loadAllTemplates().map((t) => t.name).join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Error: Template "${name}" not found. Available templates: ${available || "none"}`,
          },
        ],
        isError: true,
      };
    }

    const template = loadTemplate(filePath);
    const rendered = renderTemplate(template.content, variables);

    const unresolved = template.variables.filter((v) => !(v in variables));

    const output = { name, rendered, unresolved };
    return {
      content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
      structuredContent: output,
    };
  }
);

// Tool: Reload templates from disk (without restarting)
server.registerTool(
  "prompts_reload_templates",
  {
    title: "Reload Templates",
    description: `Reload all prompt templates from the templates directory on disk.

Use this after adding, editing, or removing .md template files — no server restart needed.

Returns the updated list of templates after reload.`,
    inputSchema: z.object({}),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async () => {
    const templates = loadAllTemplates();
    const output = {
      message: `Reloaded ${templates.length} templates from ${TEMPLATES_DIR}`,
      templates: templates.map(({ name, description, variables }) => ({
        name,
        description,
        variables,
      })),
      count: templates.length,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
      structuredContent: output,
    };
  }
);

// ─── Skills Tools ─────────────────────────────────────────────────────────────

// Tool: List all available skills
server.registerTool(
  "skills_list_skills",
  {
    title: "List Skills",
    description: `List all available skills loaded from the skills directory.

Returns each skill's name, description, and trigger keywords.

Returns:
{
  "skills": [
    {
      "name": string,       // Skill filename without .md extension
      "description": string,
      "triggers": string[]  // Keywords indicating when to use this skill
    }
  ],
  "count": number
}`,
    inputSchema: z.object({}),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async () => {
    const skills = loadAllSkills();
    const output = {
      skills: skills.map(({ name, description, triggers }) => ({
        name,
        description,
        triggers,
      })),
      count: skills.length,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
      structuredContent: output,
    };
  }
);

// Tool: Get raw skill content
server.registerTool(
  "skills_get_skill",
  {
    title: "Get Skill",
    description: `Retrieve the full content of a specific skill by name.

Args:
  - name (string): Skill name (filename without .md extension, e.g. "docx")

Returns:
{
  "name": string,
  "description": string,
  "triggers": string[],
  "content": string   // Full skill instructions in markdown
}

Errors:
  - Returns error if skill name is not found`,
    inputSchema: z.object({
      name: z.string().min(1).describe("Skill name (without .md extension)"),
    }),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ name }) => {
    const filePath = path.join(SKILLS_DIR, `${name}.md`);

    if (!fs.existsSync(filePath)) {
      const available = loadAllSkills().map((s) => s.name).join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Error: Skill "${name}" not found. Available skills: ${available || "none"}`,
          },
        ],
        isError: true,
      };
    }

    const skill = loadSkill(filePath);
    return {
      content: [{ type: "text", text: JSON.stringify(skill, null, 2) }],
      structuredContent: skill,
    };
  }
);

// Tool: Reload skills from disk (without restarting)
server.registerTool(
  "skills_reload_skills",
  {
    title: "Reload Skills",
    description: `Reload all skills from the skills directory on disk.

Use this after adding, editing, or removing .md skill files — no server restart needed.

Returns the updated list of skills after reload.`,
    inputSchema: z.object({}),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async () => {
    const skills = loadAllSkills();
    const output = {
      message: `Reloaded ${skills.length} skills from ${SKILLS_DIR}`,
      skills: skills.map(({ name, description, triggers }) => ({
        name,
        description,
        triggers,
      })),
      count: skills.length,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
      structuredContent: output,
    };
  }
);

// ─── HTTP Transport ───────────────────────────────────────────────────────────

async function runHTTP(): Promise<void> {
  const app = express();
  app.use(express.json());

  // Health check
  app.get("/health", (_req: Request, res: Response) => {
    const templates = loadAllTemplates();
    const skills = loadAllSkills();
    res.json({
      status: "ok",
      templates_loaded: templates.length,
      templates_dir: TEMPLATES_DIR,
      skills_loaded: skills.length,
      skills_dir: SKILLS_DIR,
    });
  });

  app.post("/mcp", async (req: Request, res: Response) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = parseInt(process.env.PORT ?? "3000");
  app.listen(port, () => {
    console.error(`prompts-mcp-server running on http://localhost:${port}/mcp`);
    console.error(`Templates directory: ${TEMPLATES_DIR}`);
    const templates = loadAllTemplates();
    console.error(`Loaded ${templates.length} template(s): ${templates.map((t) => t.name).join(", ") || "none"}`);
    console.error(`Skills directory: ${SKILLS_DIR}`);
    const skills = loadAllSkills();
    console.error(`Loaded ${skills.length} skill(s): ${skills.map((s) => s.name).join(", ") || "none"}`);
  });
}

runHTTP().catch((error: unknown) => {
  console.error("Server error:", error);
  process.exit(1);
});
