// Conventional commits. Scope is optional; when given it names a part of the repository.
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'cards',
        'gate',
        'site',
        'analysis',
        'evals',
        'docs',
        'ci',
        'deps',
        'workspace',
      ],
    ],
    // Bodies carry the "Checked:" stamp and source lists, which are long by nature.
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};
