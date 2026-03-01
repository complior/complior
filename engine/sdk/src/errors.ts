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

  constructor(message: string, obligationId: string, article: string) {
    super(message, 'PROHIBITED_PRACTICE');
    this.name = 'ProhibitedPracticeError';
    this.obligationId = obligationId;
    this.article = article;
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
