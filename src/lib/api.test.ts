import { describe, expect, it } from 'vitest';
import { buildApiUrl, parseApiJson } from './api';

describe('api url helper', () => {
  it('keeps relative api paths when no base url is provided', () => {
    expect(buildApiUrl('/api/generate-exam')).toBe('/api/generate-exam');
  });

  it('prefixes api paths with a configured base url', () => {
    expect(buildApiUrl('/api/generate-exam', 'https://study-me-api.example.com')).toBe(
      'https://study-me-api.example.com/api/generate-exam'
    );
  });

  it('normalizes duplicate slashes between base url and path', () => {
    expect(buildApiUrl('/api/chat-coach', 'https://study-me-api.example.com/')).toBe(
      'https://study-me-api.example.com/api/chat-coach'
    );
  });

  it('throws a readable error when the response is not json', async () => {
    const response = new Response('<!doctype html><title>The page could not be found</title>', {
      headers: { 'Content-Type': 'text/html' },
      status: 404,
    });

    await expect(
      parseApiJson(response, 'The AI service is unavailable right now. Check the deployed API URL.')
    ).rejects.toThrow('The AI service is unavailable right now. Check the deployed API URL.');
  });
});
