export class CustomError extends Error {
    code: number
    message: string;

    constructor(message: string, errorCode: number) {
        super()
        this.message = message;
        this.code = errorCode;
    }
}