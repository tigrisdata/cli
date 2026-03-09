import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { getOption } from '../../utils/options.js';
import { getCredentials } from '../../auth/storage.js';
import {
  printStart,
  printSuccess,
  msg,
} from '../../utils/messages.js';
import { isJsonMode, jsonSuccess } from '../../utils/output.js';
import { handleError } from '../../utils/errors.js';
import { confirm } from '../../utils/confirm.js';
import { getAgentConfig, VALID_AGENTS } from './agents.js';

const context = msg('mcp', 'install');

function buildServerEntry(credentials: {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
}) {
  return {
    command: 'npx',
    args: ['-y', '@tigrisdata/tigris-mcp-server', 'run'],
    env: {
      AWS_ACCESS_KEY_ID: credentials.accessKeyId,
      AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
      AWS_ENDPOINT_URL_S3: credentials.endpoint,
    },
  };
}

function readJsonConfig(filePath: string): Record<string, unknown> {
  if (!existsSync(filePath)) {
    return {};
  }
  const content = readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(content);
  } catch (err) {
    handleError({
      message: `Failed to parse ${filePath}: ${err instanceof Error ? err.message : String(err)}. Fix the file or remove it before retrying.`,
    });
  }
}

export default async function install(options: Record<string, unknown>) {
  const agent = getOption<string>(options, ['agent']);
  const dryRun = !!getOption<boolean>(options, ['dryRun', 'dry-run']);
  const yes = getOption<boolean>(options, ['yes', 'y']);

  if (!agent) {
    handleError({
      message: `Agent is required. Valid agents: ${VALID_AGENTS.join(', ')}`,
    });
  }

  const agentConfig = getAgentConfig(agent);
  if (!agentConfig) {
    handleError({
      message: `Unknown agent "${agent}". Valid agents: ${VALID_AGENTS.join(', ')}`,
    });
  }

  printStart(context, { agent: agentConfig.name });

  const credentials = getCredentials();
  if (!credentials) {
    handleError({
      message:
        'No Tigris credentials found. Run "tigris login" or "tigris configure" first.',
    });
  }

  const serverEntry = buildServerEntry(credentials);
  const configPath = agentConfig.configPath;
  const existingConfig = readJsonConfig(configPath);

  const mcpServers =
    (existingConfig[agentConfig.configKey] as Record<string, unknown>) || {};
  const hasExisting = agentConfig.serverKey in mcpServers;

  if (hasExisting && !yes) {
    console.warn(
      `An existing "${agentConfig.serverKey}" entry was found in ${configPath}`
    );
    const confirmed = await confirm('Overwrite the existing entry?');
    if (!confirmed) {
      console.log('Aborted');
      return;
    }
  }

  const newConfig = {
    ...existingConfig,
    [agentConfig.configKey]: {
      ...mcpServers,
      [agentConfig.serverKey]: serverEntry,
    },
  };

  if (dryRun) {
    if (isJsonMode()) {
      jsonSuccess({
        agent,
        configPath,
        config: newConfig,
        hasExisting,
        action: 'would_install',
        dryRun: true,
      });
    } else {
      console.log(`[dry-run] Would write to ${configPath}:`);
      console.log(JSON.stringify(newConfig, null, 2));
    }
    return;
  }

  const parentDir = dirname(configPath);
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true });
  }

  try {
    writeFileSync(
      configPath,
      JSON.stringify(newConfig, null, 2) + '\n',
      'utf8'
    );
  } catch (error) {
    handleError({
      message: `Failed to write config to ${configPath}: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  if (isJsonMode()) {
    jsonSuccess({
      agent,
      configPath,
      hasExisting,
      action: 'installed',
    });
  } else {
    printSuccess(context, { agent: agentConfig.name });
    console.log(`  Config: ${configPath}`);
    if (hasExisting) {
      console.log('  (Previous entry was overwritten)');
    }
  }
}
