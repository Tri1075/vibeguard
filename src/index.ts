/** Public library surface (programmatic use). */
export * from './core/types.js';
export { findRoot, loadConfig, type LoadedConfig } from './core/config.js';
export { runCheck, type CheckReport, type RunOptions } from './core/runner.js';
export { GATES, RULE_DEFAULTS, gateById } from './gates/registry.js';
export { LAWS, lawById, type Law } from './laws/texts.js';
export { skillMarkdown, protocolMarkdown } from './laws/skill.js';
export { countCodeLines, classifyLines } from './core/comments.js';
export { listProjectFiles, makeReadText } from './core/files.js';
export { pathsFor, PROTECTED_PATTERN, VIBEGUARD_DIR } from './core/paths.js';
export { TOOL_VERSION } from './version.js';
