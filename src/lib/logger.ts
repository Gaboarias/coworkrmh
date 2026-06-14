const isDev = process.env.NODE_ENV === "development";

export const logger = {
  error: (msg: string, ctx?: Record<string, unknown>) => {
    if (isDev) {
      console.error(msg, ctx ?? "");
    }
  },
};
