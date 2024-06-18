import { ZodError } from "zod";

function getZodError(error: any) {
  if (error instanceof ZodError) {
    return error.issues.shift()?.message;
  }
  return error;
}

export { getZodError };
