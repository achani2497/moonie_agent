export class CustomError extends Error {
  code: number;
  message: string;

  constructor(message: string, errorCode: number) {
    super();
    this.message = message;
    this.code = errorCode;
  }
}

export class AllModelsUnavailableError extends Error {
  constructor() {
    super('All models are currently unavailable (quota exhausted or errors)');
    this.name = 'AllModelsUnavailableError';
  }
}
