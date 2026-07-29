// Fixture that throws while being imported. When spawned as a child script the
// bootstrap's `import(scriptFile)` rejects before `createAppThreadInstance` is
// reached, so the child exits before sending `ready` — deterministically
// reproducing the "Child exited before ready" restart failure.
throw new Error('crash on load');

export {};
