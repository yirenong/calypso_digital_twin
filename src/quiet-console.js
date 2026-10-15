// Apply to the dashboard window; cross-origin iframe consoles are independent.
for (const method of ['log', 'debug', 'info', 'warn', 'error', 'trace', 'table', 'dir', 'dirxml', 'group', 'groupCollapsed', 'groupEnd', 'count', 'countReset', 'time', 'timeLog', 'timeEnd', 'assert']) {
  console[method] = () => {}
}
