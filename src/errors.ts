/**
 * Custom error classes for the cards library
 */

/**
 * Base error class for all cards library errors
 */
export class CardsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CardsError'
  }
}

/**
 * Error thrown when parsing fails
 */
export class ParseError extends CardsError {
  constructor(
    message: string,
    public readonly position?: number,
    public readonly input?: string
  ) {
    super(message)
    this.name = 'ParseError'
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends CardsError {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}
