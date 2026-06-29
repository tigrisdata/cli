import { getAuthClient } from '@auth/client.js';
import { getIAMConfig } from '@auth/iam.js';
import { getStorageConfig } from '@auth/provider.js';
import { storeSelectedOrganization } from '@auth/storage.js';
import {
  assignBucketRoles,
  createAccessKey,
  createOrganization,
} from '@tigrisdata/iam';
import { exitWithError } from '@utils/exit.js';
import { requireInteractive } from '@utils/interactive.js';
import { type MessageContext, printStart } from '@utils/messages.js';
import { spawnSync } from 'child_process';
import enquirer from 'enquirer';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

import { DEFAULT_STORAGE_ENDPOINT } from '../../constants.js';
import {
  buildMcpServerEntry,
  buildSkillsArgs,
  detectEditors,
  type EditorInfo,
  MCP_SERVER_NAME,
  mergeMcpServers,
  SUPPORTED_EDITORS,
} from './shared.js';

const { prompt } = enquirer;

const AGENT_COMMAND = 'npx @tigrisdata/cli init --agent --getting-started';

/**
 * Interactive setup (`tigris init`): pick the AI editor(s), configure the
 * Tigris MCP server, install the agent skills, then hand the user a command to
 * give their AI agent (which provisions buckets/keys via the --agent plan).
 */
export async function runInteractive(context: MessageContext) {
  requireInteractive('Run `tigris init` in an interactive terminal.');

  printStart(context);
  console.log('\n  Connect Tigris to your AI coding agent.\n');

  // 1. Which editor(s) to configure (detected ones are pre-checked).
  const detected = detectEditors({
    env: process.env,
    cwd: process.cwd(),
    home: process.env.HOME ?? '',
    fileExists: existsSync,
  });

  const { editorIds } = await prompt<{ editorIds: string[] }>({
    type: 'multiselect',
    name: 'editorIds',
    message:
      'Which editor(s) should use Tigris? (space to toggle, enter to confirm)',
    choices: SUPPORTED_EDITORS.map((e) => ({
      name: e.id,
      message: e.label,
      enabled: detected.includes(e.id),
    })),
  });

  const editors = SUPPORTED_EDITORS.filter((e) => editorIds.includes(e.id));
  if (editors.length === 0) {
    exitWithError('Select at least one editor to configure.', context);
  }

  // 2. Authenticate (reuse existing session, else OAuth device flow).
  const authClient = getAuthClient();
  if (!(await authClient.isAuthenticated())) {
    await authClient.login({
      onDeviceCode: (code: string, uri: string) => {
        console.log(`\n  Your confirmation code: ${code}`);
        console.log(`  If the browser doesn't open, visit: ${uri}\n`);
      },
      onWaiting: () => console.log('  Waiting for authentication...'),
    });
  }
  console.log('  ✔ Signed in');

  // 3. Organization (auto when there's only one).
  await resolveOrg(context);

  // 4. Mint an org-wide key for the MCP server so the agent can manage buckets.
  const iamConfig = await getIAMConfig(context);
  const keyName = `tigris-agent-${Date.now()}`;
  const created = await createAccessKey(keyName, { config: iamConfig });
  if (created.error) exitWithError(created.error, context);

  const secret = created.data.secret;
  if (!secret) {
    exitWithError('Access key was created without a secret', context);
  }

  const assigned = await assignBucketRoles(
    created.data.id,
    [{ bucket: '*', role: 'NamespaceAdmin' }],
    { config: iamConfig }
  );
  if (assigned.error) exitWithError(assigned.error, context);
  console.log(`  ✔ Created access key for the agent (${created.data.id})`);

  // 5. Write the MCP server config for each selected editor.
  const endpoint =
    (await getStorageConfig()).endpoint ?? DEFAULT_STORAGE_ENDPOINT;
  const entry = buildMcpServerEntry({
    accessKeyId: created.data.id,
    secretAccessKey: secret,
    endpoint,
  });

  for (const editor of editors) {
    const written = await writeMcpConfig(editor, entry, context);
    console.log(
      written
        ? `  ✔ ${editor.label}: wrote ${editor.mcpPath}`
        : `  • ${editor.label}: kept existing ${editor.mcpPath}`
    );
  }

  // 6. Install the Tigris agent skills (once — project-level, all agents read).
  installSkills();

  // 7. Hand off to the agent.
  console.log(
    '\n  ⚠ MCP config files contain your access key — add them to .gitignore.'
  );
  console.log('\n  To complete setup, paste this to your AI coding agent:\n');
  console.log(`    ${AGENT_COMMAND}\n`);
}

/** Auto-select the only org, otherwise prompt (creating one if none exist). */
async function resolveOrg(context: MessageContext): Promise<void> {
  const authClient = getAuthClient();
  const orgs = await authClient.getOrganizations();

  let orgId: string;
  let orgName: string;
  if (orgs.length === 0) {
    const { newOrg } = await prompt<{ newOrg: string }>({
      type: 'input',
      name: 'newOrg',
      message: 'Name your first organization:',
      required: true,
    });
    const { data, error } = await createOrganization(newOrg, {
      config: await getStorageConfig(),
    });
    if (error) exitWithError(error, context);
    orgId = data.id;
    orgName = newOrg;
  } else if (orgs.length === 1) {
    orgId = orgs[0].id;
    orgName = orgs[0].name;
  } else {
    const { chosen } = await prompt<{ chosen: string }>({
      type: 'select',
      name: 'chosen',
      message: 'Select an organization:',
      choices: orgs.map((o) => ({ name: o.id, message: o.name })),
    });
    orgId = chosen;
    orgName = orgs.find((o) => o.id === chosen)?.name ?? chosen;
  }

  await storeSelectedOrganization(orgId);
  console.log(`  ✔ Organization: ${orgName}`);
}

/**
 * Merge the Tigris MCP entry into an editor's mcp.json, prompting before
 * replacing an existing entry. Returns whether the file was written.
 */
async function writeMcpConfig(
  editor: EditorInfo,
  entry: ReturnType<typeof buildMcpServerEntry>,
  context: MessageContext
): Promise<boolean> {
  const mcpPath = join(process.cwd(), editor.mcpPath);
  const existing = existsSync(mcpPath) ? readFileSync(mcpPath, 'utf8') : null;

  let merged: { content: string; replaced: boolean };
  try {
    merged = mergeMcpServers(existing, MCP_SERVER_NAME, entry);
  } catch {
    exitWithError(
      `Could not parse existing ${editor.mcpPath} as JSON. Fix or remove it, then re-run.`,
      context
    );
  }

  if (merged.replaced) {
    const { ok } = await prompt<{ ok: boolean }>({
      type: 'confirm',
      name: 'ok',
      message: `${editor.mcpPath} already has a "${MCP_SERVER_NAME}" entry. Overwrite?`,
      initial: true,
    });
    if (!ok) return false;
  }

  mkdirSync(dirname(mcpPath), { recursive: true });
  writeFileSync(mcpPath, merged.content);
  return true;
}

/** Install the Tigris agent skills once (best-effort; soft-warn on failure). */
function installSkills(): void {
  console.log('  • Installing Tigris agent skills…');
  const result = spawnSync('npx', buildSkillsArgs(), { stdio: 'inherit' });
  if (result.status !== 0) {
    console.log(
      `  ⚠ Skills install did not complete. Run later:\n` +
        `      npx ${buildSkillsArgs().join(' ')}`
    );
  }
}
