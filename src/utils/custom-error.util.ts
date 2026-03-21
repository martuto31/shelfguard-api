export default class CustomError extends Error {

  constructor(status: number, message: string, source?: string) {
    super(message);

    this.status = status;
    this.message = message;

    if (source) {
      this.source = source;
    }
  }

  public status: number;
  public message: string;
  public source?: string;

}
