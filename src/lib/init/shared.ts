import { join } from 'path';

export type AgentTarget = 'claude-code' | 'cursor';

// ---------------------------------------------------------------------------
// .env helpers
// ---------------------------------------------------------------------------

export const ENV_KEYS = {
  accessKeyId: 'TIGRIS_STORAGE_ACCESS_KEY_ID',
  secretAccessKey: 'TIGRIS_STORAGE_SECRET_ACCESS_KEY',
  endpoint: 'TIGRIS_STORAGE_ENDPOINT',
  bucket: 'TIGRIS_STORAGE_BUCKET',
} as const;

// ---------------------------------------------------------------------------
// MCP config (verified against @tigrisdata/tigris-mcp-server)
// ---------------------------------------------------------------------------

export const MCP_SERVER_NAME = 'tigris-mcp-server';

export interface McpServerEntry {
  command: string;
  args: string[];
  env: Record<string, string>;
}

/**
 * Build the MCP server entry for the Tigris MCP server. The server reads
 * AWS_* env names (not TIGRIS_STORAGE_*) and has no bucket variable.
 */
export function buildMcpServerEntry(creds: {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
}): McpServerEntry {
  return {
    command: 'npx',
    args: ['-y', '@tigrisdata/tigris-mcp-server', 'run'],
    env: {
      AWS_ACCESS_KEY_ID: creds.accessKeyId,
      AWS_SECRET_ACCESS_KEY: creds.secretAccessKey,
      AWS_ENDPOINT_URL_S3: creds.endpoint,
    },
  };
}

/**
 * Merge an MCP server entry into existing mcp.json content (or a fresh file),
 * preserving any other servers. Reports whether an entry of the same name was
 * already present. Throws if the existing content is not valid JSON.
 */
export function mergeMcpServers(
  existing: string | null,
  name: string,
  entry: McpServerEntry
): { content: string; replaced: boolean } {
  let root: Record<string, unknown> = {};
  if (existing && existing.trim()) {
    root = JSON.parse(existing) as Record<string, unknown>;
  }

  const servers = (root.mcpServers as Record<string, unknown>) ?? {};
  const replaced = Object.prototype.hasOwnProperty.call(servers, name);

  const nextRoot = {
    ...root,
    mcpServers: { ...servers, [name]: entry },
  };

  return { content: JSON.stringify(nextRoot, null, 2) + '\n', replaced };
}

// ---------------------------------------------------------------------------
// Supported editors + skills
// ---------------------------------------------------------------------------

export interface EditorInfo {
  id: AgentTarget;
  label: string;
  /** Project-relative MCP config path. */
  mcpPath: string;
  /** Agent flag passed to `npx skills add ... -a <skillsAgent>`. */
  skillsAgent: string;
}

export const SUPPORTED_EDITORS: EditorInfo[] = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    mcpPath: '.mcp.json',
    skillsAgent: 'claude-code',
  },
  {
    id: 'cursor',
    label: 'Cursor',
    mcpPath: join('.cursor', 'mcp.json'),
    skillsAgent: 'cursor',
  },
];

/**
 * Best-effort detection of which supported editors are present, used to
 * pre-check the multi-select. Returns the editor ids that look configured.
 */
export function detectEditors(deps: {
  env: NodeJS.ProcessEnv;
  cwd: string;
  home: string;
  fileExists: (p: string) => boolean;
}): AgentTarget[] {
  const { env, cwd, home, fileExists } = deps;
  const found: AgentTarget[] = [];

  if (
    env.CLAUDECODE === '1' ||
    fileExists(join(cwd, '.claude')) ||
    fileExists(join(home, '.claude.json'))
  ) {
    found.push('claude-code');
  }

  if (
    env.TERM_PROGRAM === 'cursor' ||
    fileExists(join(cwd, '.cursor')) ||
    fileExists(join(home, '.cursor'))
  ) {
    found.push('cursor');
  }

  return found;
}

export const TIGRIS_SKILLS_REPO = 'github.com/tigrisdata/skills';

/**
 * Args for the `npx` skills installer (project-level — installed once; all
 * detected agents pick up the SKILL.md files). Run as `npx <args>`, i.e.
 * `npx -y skills add github.com/tigrisdata/skills`.
 */
export function buildSkillsArgs(): string[] {
  return ['-y', 'skills', 'add', TIGRIS_SKILLS_REPO];
}
