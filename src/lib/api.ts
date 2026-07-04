const configuredApiBaseUrl = (
  import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }
).env?.VITE_API_BASE_URL?.trim();

export const buildApiUrl = (path: string, apiBaseUrl = configuredApiBaseUrl) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!apiBaseUrl) {
    return normalizedPath;
  }

  return `${apiBaseUrl.replace(/\/+$/, '')}${normalizedPath}`;
};

export const parseApiJson = async <T>(
  response: Response,
  invalidJsonMessage = 'The service returned an invalid response.'
): Promise<T> => {
  const contentType = response.headers.get('content-type') ?? '';
  const rawBody = await response.text();

  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(invalidJsonMessage);
  }

  try {
    return JSON.parse(rawBody) as T;
  } catch {
    throw new Error(invalidJsonMessage);
  }
};
