export function notFound(_req, res) {
  res.status(404).json({ message: 'Route not found' });
}

export function errorHandler(error, _req, res, _next) {
  console.error(error);

  if (error.name === 'ZodError') {
    return res.status(400).json({
      message: 'Validation failed',
      issues: error.issues
    });
  }

  if (error.code === '23505') {
    return res.status(409).json({ message: 'Resource already exists' });
  }

  return res.status(error.status || 500).json({
    message: error.message || 'Internal server error'
  });
}
