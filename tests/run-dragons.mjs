// Run in one process so the suite also works in restricted local sandboxes.
await import('./dragon-flight.test.mjs');
await import('./dragon-model.test.mjs');
await import('./dragon-combat.test.mjs');
