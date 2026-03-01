export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ConfigError extends AppError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR', 500);
    this.name = 'ConfigError';
  }
}

export class ScanError extends AppError {
  constructor(message: string) {
    super(message, 'SCAN_ERROR', 500);
    this.name = 'ScanError';
  }
}

export class LLMError extends AppError {
  constructor(message: string) {
    super(message, 'LLM_ERROR', 502);
    this.name = 'LLMError';
  }
}

export class ToolError extends AppError {
  constructor(message: string) {
    super(message, 'TOOL_ERROR', 500);
    this.name = 'ToolError';
  }
}
