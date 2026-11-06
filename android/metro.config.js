/**
 * Metro configuration for the Expo app inside the npm-workspaces monorepo.
 * Follows the Expo monorepo guidance: watch the workspace root so shared
 * packages (@synergy/domain, @synergy/design-tokens) are resolved and
 * hot-reloaded from source.
 */
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// Shared packages expose only `.ts` source (no build output), so Metro needs
// to resolve package main fields written to TS source files.
config.resolver.unstable_enablePackageExtensions = true;

module.exports = config;
