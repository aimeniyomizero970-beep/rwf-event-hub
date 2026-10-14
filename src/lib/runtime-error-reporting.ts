type RuntimeErrorContext = Record<string, unknown>;

// Normalizes a thrown value into a message/stack pair. Loaders and server
// functions commonly throw a raw Response, whose String() form is the opaque
// "[object Response]", so pull out the status and URL instead.
function describeRuntimeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Response) {
    return { message: `Response ${error.status}${error.url ? ` at ${error.url}` : ""}` };
  }
  if (error instanceof Error) {
    return { message: error.message, ...(error.stack !== undefined && { stack: error.stack }) };
  }
  return { message: String(error) };
}

export function reportRuntimeError(error: unknown, context: RuntimeErrorContext = {}) {
  if (typeof window === "undefined") return;

  const { message, stack } = describeRuntimeError(error);

  // Keep the full detail in the browser console; React error boundaries do not
  // rethrow, so this is the most reliable local record of the failure.
  try {
    console.error(error, {
      message,
      ...(stack !== undefined && { stack }),
      route: window.location.pathname,
      ...context,
    });
  } catch {
    // Never let error reporting throw.
  }
}
