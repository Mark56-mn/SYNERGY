// Test stub for the `server-only` marker package.
// In Next.js builds the real package throws if server-only code is imported
// from a client component. In plain Node/Vitest there is no bundler condition
// resolution, so tests map it to an empty module.
export {};
