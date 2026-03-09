import { homedir, platform } from 'os';
import { join } from 'path';

export interface AgentConfig {
  name: string;
  configPath: string;
  configKey: string;
  serverKey: string;
}

const AGENTS: Record<string, () => AgentConfig> = {
  'claude-code': () => ({
    name: 'Claude Code',
    configPath: join(homedir(), '.claude.json'),
    configKey: 'mcpServers',
    serverKey: 'tigris',
  }),
  'claude-desktop': () => {
    let base: string;
    if (platform() === 'win32') {
      base = join(process.env.APPDATA || '', 'Claude');
    } else if (platform() === 'linux') {
      base = join(homedir(), '.config', 'Claude');
    } else {
      base = join(homedir(), 'Library', 'Application Support', 'Claude');
    }
    return {
      name: 'Claude Desktop',
      configPath: join(base, 'claude_desktop_config.json'),
      configKey: 'mcpServers',
      serverKey: 'tigris',
    };
  },
  cursor: () => ({
    name: 'Cursor',
    configPath: join(homedir(), '.cursor', 'mcp.json'),
    configKey: 'mcpServers',
    serverKey: 'tigris',
  }),
  windsurf: () => ({
    name: 'Windsurf',
    configPath: join(homedir(), '.codeium', 'windsurf', 'mcp_config.json'),
    configKey: 'mcpServers',
    serverKey: 'tigris',
  }),
  vscode: () => {
    let base: string;
    if (platform() === 'win32') {
      base = join(process.env.APPDATA || '', 'Code', 'User');
    } else if (platform() === 'linux') {
      base = join(homedir(), '.config', 'Code', 'User');
    } else {
      base = join(homedir(), 'Library', 'Application Support', 'Code', 'User');
    }
    return {
      name: 'VS Code',
      configPath: join(base, 'mcp.json'),
      configKey: 'mcpServers',
      serverKey: 'tigris',
    };
  },
};

export const VALID_AGENTS = Object.keys(AGENTS);

export function getAgentConfig(agent: string): AgentConfig | null {
  const factory = AGENTS[agent];
  return factory ? factory() : null;
}
