export function getZodError(error: any) {
  const zodErrorMsg = error.issues.map((issue: any) => issue.message);
  return zodErrorMsg;
}
