import * as YAML from 'yaml';
import specsYaml from '../specs.yaml';
import type { Specs, CommandSpec, OperationSpec, Argument } from '../types.js';

let cachedSpecs: Specs | null = null;

const specsSource = specsYaml as unknown;

function parseSpecs(): Specs {
  if (typeof specsSource === 'string') {
    return YAML.parse(specsSource, { schema: 'core' }) as Specs;
  }
  return specsSource as Specs;
}

export function loadSpecs(): Specs {
  if (!cachedSpecs) {
    cachedSpecs = parseSpecs();
  }
  return cachedSpecs!;
}

export function getCommandSpec(
  commandPath: string,
  operationName?: string
): OperationSpec | CommandSpec | null {
  const specs = loadSpecs();

  // Split command path for nested commands (e.g., "iam policies" -> ["iam", "policies"])
  const pathParts = commandPath.split(' ').filter(Boolean);

  // Traverse the command hierarchy
  let current: CommandSpec | undefined;
  let commands: CommandSpec[] = specs.commands;

  for (const part of pathParts) {
    current = commands.find((cmd: CommandSpec) => cmd.name === part);
    if (!current) {
      return null;
    }
    commands = current.commands || [];
  }

  if (!current) {
    return null;
  }

  // If operation specified, find it in the current command's children
  if (operationName && current.commands) {
    return (
      current.commands.find((cmd: CommandSpec) => cmd.name === operationName) ||
      null
    );
  }

  return current;
}

export function getArgumentSpec(
  commandName: string,
  argumentName: string,
  operationName?: string
): Argument | null {
  const spec = getCommandSpec(commandName, operationName);

  if (!spec || !spec.arguments) {
    return null;
  }

  return (
    spec.arguments.find((arg: Argument) => arg.name === argumentName) || null
  );
}

export function buildPromptChoices(argument: Argument) {
  if (!argument.options) {
    return null;
  }

  // Handle simple string array options
  if (
    Array.isArray(argument.options) &&
    typeof argument.options[0] === 'string'
  ) {
    return (argument.options as string[]).map((option) => ({
      name: option,
      message: option.charAt(0).toUpperCase() + option.slice(1),
      value: option,
    }));
  }

  // Handle complex option objects with name, value, and description
  if (
    Array.isArray(argument.options) &&
    typeof argument.options[0] === 'object'
  ) {
    return (
      argument.options as Array<{
        name: string;
        value: string;
        description?: string;
      }>
    ).map((option) => ({
      name: option.value,
      message: option.description
        ? `${option.name} - ${option.description}`
        : option.name,
      value: option.value,
    }));
  }

  return null;
}
