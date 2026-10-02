// Only explicitly selected operational fields belong here; never serialize request bodies or provider errors.
export const logger = Object.fromEntries(['info', 'warn', 'error'].map(level => [level, (event, fields = {}) => {
  console[level](JSON.stringify({ time: new Date().toISOString(), level, event, ...fields }));
}]));

export function errorDetails(error) {
  const identifier = value => typeof value === 'string' && /^[a-zA-Z0-9_.-]{1,120}$/.test(value) ? value : undefined;
  const describe = problem => ({
    errorName: identifier(problem?.name) || 'Error',
    field: identifier(problem?.path),
    fieldType: identifier(problem?.kind),
  });
  const details = {
    ...describe(error),
    errorCode: typeof error?.code === 'number' ? error.code : identifier(error?.code),
  };
  if (error?.name === 'ValidationError' && error.errors && typeof error.errors === 'object') {
    details.validationErrors = Object.values(error.errors).slice(0, 10).map(describe);
  }
  // Validation messages and rejected values can contain resume text or asset
  // references. Log only error identifiers, schema paths, and expected types.
  return details;
}
