import { afterEach, expect, test, vi } from 'vitest';
import { faceAction, facePayload, normalizeFace, type FaceInput } from './client.js';

const portrait = 'https://example.com/portrait.jpg';
const base: FaceInput = { action: 'keypoints', imageUrl: portrait, analyzeMode: 1 };
afterEach(() => vi.unstubAllGlobals());

test('maps all seven actions to their distinct public endpoints and required fields', () => {
  expect(facePayload(base)).toEqual({ path: '/face/analyze', body: { image_url: portrait, mode: 1 } });
  expect(facePayload({ ...base, action: 'beautify', smoothing: 12 }).body).toEqual({ image_url: portrait, smoothing: 12 });
  expect(facePayload({ ...base, action: 'age', targetAge: 60 })).toEqual({ path: '/face/change-age', body: { image_url: portrait, age_infos: [{ age: 60 }] } });
  expect(facePayload({ ...base, action: 'gender', targetGender: 1 })).toEqual({ path: '/face/change-gender', body: { image_url: portrait, gender_infos: [{ gender: 1 }] } });
  expect(facePayload({ ...base, action: 'swap', sourceImageUrl: portrait, targetImageUrl: portrait })).toEqual({
    path: '/face/swap', body: { source_image_url: portrait, target_image_url: portrait, async: false, timeout: 90 }
  });
  expect(facePayload({ ...base, action: 'cartoon' }).path).toBe('/face/cartoon');
  expect(facePayload({ ...base, action: 'liveness' }).path).toBe('/face/detect-live');
});

test('requires action-specific values before an API call', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  await expect(faceAction({ ...base, action: 'age' }, 'key')).rejects.toThrow('Target age');
  await expect(faceAction({ ...base, action: 'swap' }, 'key')).rejects.toThrow('Source image URL');
  expect(fetch).not.toHaveBeenCalled();
});

test('keeps useful face data and redacts sensitive response fields', () => {
  const result = normalizeFace({
    face_shape_set: [{ nose: [] }], image_width: 1024, image_height: 1024,
    cost: { amount: 0.0025 }, credential_id: 'private', request: { api_key: 'private' }
  }, 'keypoints');
  expect(result.faceCount).toBe(1);
  expect(result.costCredits).toBe(0.0025);
  expect(result.data).not.toHaveProperty('credential_id');
  expect(result.data).not.toHaveProperty('request');
});

test('returns a result image without echoing errors or API keys', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
    image_url: 'https://cdn.example/face.png', cost: { amount: 0.03 }
  }), { status: 200 })).mockResolvedValueOnce(new Response(
    JSON.stringify({ error: { message: 'private upstream secret' } }), { status: 403 }
  ));
  vi.stubGlobal('fetch', fetch);
  const result = await faceAction({ ...base, action: 'cartoon' }, 'test-key');
  expect(result.mediaUrls).toEqual(['https://cdn.example/face.png']);
  await expect(faceAction(base, 'test-key')).rejects.toThrow('HTTP 403');
});
