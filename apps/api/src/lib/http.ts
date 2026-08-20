import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from './logger';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
]);

const PRIVATE_V4 = [
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^127\./,
];

export class OutboundRequestError extends Error {
  constructor(
    message: string,
    public readonly code = 'outbound_request_failed',
  ) {
    super(message);
  }
}

export function assertPublicTarget(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new OutboundRequestError('target url is not parseable', 'invalid_url');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new OutboundRequestError('only http and https targets are allowed', 'invalid_scheme');
  }

  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) {
    throw new OutboundRequestError('target host is not routable', 'blocked_host');
  }
  if (PRIVATE_V4.some((re) => re.test(host))) {
    throw new OutboundRequestError('target host is not routable', 'blocked_host');
  }

  return parsed;
}

const DEFAULT_HEADERS = {
  'User-Agent': 'AcmeU-Platform/3.14 (+https://acmeu.com/bots)',
  Accept: '*/*',
};

export async function fetchExternal(
  url: string,
  options: AxiosRequestConfig = {},
): Promise<AxiosResponse<any>> {
  assertPublicTarget(url);
  try {
    return await axios.request({
      url,
      method: 'GET',
      timeout: 8000,
      maxRedirects: 5,
      maxContentLength: 5 * 1024 * 1024,
      validateStatus: () => true,
      ...options,
      headers: { ...DEFAULT_HEADERS, ...(options.headers || {}) },
    });
  } catch (err: any) {
    logger.warn({ url, err: err?.message }, 'outbound request failed');
    throw new OutboundRequestError(err?.message || 'request failed');
  }
}

export async function dispatch(
  url: string,
  options: AxiosRequestConfig = {},
): Promise<AxiosResponse<any>> {
  return axios.request({
    url,
    method: 'POST',
    timeout: 8000,
    maxRedirects: 5,
    validateStatus: () => true,
    ...options,
    headers: { ...DEFAULT_HEADERS, ...(options.headers || {}) },
  });
}
