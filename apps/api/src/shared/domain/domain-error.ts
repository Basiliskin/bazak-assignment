/** Base for expected business failures. `code` is stable and mapped to HTTP in one place (DomainExceptionFilter). */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
