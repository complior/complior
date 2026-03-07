export class MiddlewareError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'MiddlewareError';
    this.code = code;
  }
}

export class ProhibitedPracticeError extends MiddlewareError {
  readonly obligationId: string;
  readonly article: string;
  readonly category: string;
  readonly matchedPattern: string;
  readonly penalty: string;

  constructor(
    message: string,
    obligationId: string,
    article: string,
    category: string = 'unknown',
    matchedPattern: string = '',
    penalty: string = '€35M or 7% of annual global turnover',
  ) {
    super(message, 'PROHIBITED_PRACTICE');
    this.name = 'ProhibitedPracticeError';
    this.obligationId = obligationId;
    this.article = article;
    this.category = category;
    this.matchedPattern = matchedPattern;
    this.penalty = penalty;
  }
}

export class DomainViolationError extends MiddlewareError {
  readonly domain: string;
  readonly obligationId: string;

  constructor(message: string, domain: string, obligationId: string) {
    super(message, 'DOMAIN_VIOLATION');
    this.name = 'DomainViolationError';
    this.domain = domain;
    this.obligationId = obligationId;
  }
}

export class PermissionDeniedError extends MiddlewareError {
  readonly method: string;

  constructor(message: string, method: string) {
    super(message, 'PERMISSION_DENIED');
    this.name = 'PermissionDeniedError';
    this.method = method;
  }
}

export class BudgetExceededError extends MiddlewareError {
  readonly totalCost: number;
  readonly limitUsd: number;

  constructor(message: string, totalCost: number, limitUsd: number) {
    super(message, 'BUDGET_EXCEEDED');
    this.name = 'BudgetExceededError';
    this.totalCost = totalCost;
    this.limitUsd = limitUsd;
  }
}

export class RateLimitError extends MiddlewareError {
  readonly maxPerMinute: number;

  constructor(message: string, maxPerMinute: number) {
    super(message, 'RATE_LIMIT');
    this.name = 'RateLimitError';
    this.maxPerMinute = maxPerMinute;
  }
}

export class CircuitBreakerError extends MiddlewareError {
  readonly circuitState: string;
  readonly errorThreshold: number;

  constructor(message: string, circuitState: string, errorThreshold: number) {
    super(message, 'CIRCUIT_BREAKER');
    this.name = 'CircuitBreakerError';
    this.circuitState = circuitState;
    this.errorThreshold = errorThreshold;
  }
}

export class PIIDetectedError extends MiddlewareError {
  readonly piiType: string;
  readonly category: string;
  readonly article: string;

  constructor(message: string, piiType: string, category: string, article: string) {
    super(message, 'PII_DETECTED');
    this.name = 'PIIDetectedError';
    this.piiType = piiType;
    this.category = category;
    this.article = article;
  }
}
