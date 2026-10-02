// Only explicitly selected operational fields belong here; never serialize request bodies or provider errors.
export const logger = Object.fromEntries(['info', 'warn', 'error'].map(level => [level, (event, fields = {}) => {
  console[level](JSON.stringify({ time: new Date().toISOString(), level, event, ...fields }));
}]));
