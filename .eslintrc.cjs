module.exports = {
  root: true,
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: "CallExpression[callee.property.name='get'][callee.object.property.name='headers']",
        message: 'No leer x-employee-role de headers. Usa lib/rbac.requireRole() en su lugar.'
      }
    ]
  }
};
