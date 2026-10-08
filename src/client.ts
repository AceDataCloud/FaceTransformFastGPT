export type FaceAction = 'keypoints' | 'beautify' | 'age' | 'gender' | 'swap' | 'cartoon' | 'liveness';

export type FaceInput = {
  action: FaceAction;
  imageUrl?: string | undefined;
  sourceImageUrl?: string | undefined;
  targetImageUrl?: string | undefined;
  targetAge?: number | undefined;
  targetGender?: number | undefined;
  analyzeMode: number;
  smoothing?: number | undefined;
  whitening?: number | undefined;
  faceLifting?: number | undefined;
  eyeEnlarging?: number | undefined;
};

export type FaceResult = {
  action: FaceAction;
  success: boolean;
  faceCount: number;
  mediaUrls: string[];
  costCredits: number | null;
  traceId: string;
  data: Record<string, unknown>;
};

function obj(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

const sensitive = new Set([
  'request', 'request_body', 'api_key', 'access_token', 'refresh_token',
  'authorization', 'headers', 'supplier', 'supplier_id', 'upstream',
  'credential_id', 'application_id', 'user_id', 'actor_user_id'
]);

function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clean);
  const data = obj(value);
  if (!data) return value;
  return Object.fromEntries(
    Object.entries(data)
      .filter(([key]) => !sensitive.has(key.toLowerCase()))
      .map(([key, item]) => [key, clean(item)])
  );
}

function mediaUrls(value: unknown): string[] {
  const urls = new Set<string>();
  function visit(node: unknown): void {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    const data = obj(node);
    if (!data) return;
    for (const [key, item] of Object.entries(data)) {
      if (['url', 'image_url', 'output_url', 'result_url'].includes(key)
        && typeof item === 'string' && item.startsWith('https://')) urls.add(item);
      else if (['data', 'result', 'output', 'images', 'items'].includes(key)) visit(item);
    }
  }
  visit(value);
  return [...urls];
}

function requireHttps(value: string | undefined, name: string): string {
  if (!value || !/^https:\/\/[^/\s]+\/?/.test(value)) {
    throw new Error(name + ' must be an accessible HTTPS image URL.');
  }
  return value;
}

export function facePayload(input: FaceInput): { path: string; body: Record<string, unknown> } {
  if (input.action === 'swap') {
    return {
      path: '/face/swap',
      body: {
        source_image_url: requireHttps(input.sourceImageUrl, 'Source image URL'),
        target_image_url: requireHttps(input.targetImageUrl, 'Target image URL'),
        async: false,
        timeout: 90
      }
    };
  }
  const image_url = requireHttps(input.imageUrl, 'Image URL');
  switch (input.action) {
    case 'keypoints':
      return { path: '/face/analyze', body: { image_url, mode: input.analyzeMode } };
    case 'beautify': {
      const body: Record<string, unknown> = { image_url };
      if (input.smoothing !== undefined) body.smoothing = input.smoothing;
      if (input.whitening !== undefined) body.whitening = input.whitening;
      if (input.faceLifting !== undefined) body.face_lifting = input.faceLifting;
      if (input.eyeEnlarging !== undefined) body.eye_enlarging = input.eyeEnlarging;
      return { path: '/face/beautify', body };
    }
    case 'age':
      if (input.targetAge === undefined) throw new Error('Target age is required for age transform.');
      return { path: '/face/change-age', body: { image_url, age_infos: [{ age: input.targetAge }] } };
    case 'gender':
      if (input.targetGender === undefined) throw new Error('Target gender is required for gender transform.');
      return { path: '/face/change-gender', body: { image_url, gender_infos: [{ gender: input.targetGender }] } };
    case 'cartoon':
      return { path: '/face/cartoon', body: { image_url } };
    case 'liveness':
      return { path: '/face/detect-live', body: { image_url } };
  }
}

export function normalizeFace(body: unknown, action: FaceAction, headerTraceId = ''): FaceResult {
  const data = obj(body);
  if (!data) throw new Error('Ace Data Cloud returned an invalid face result.');
  if (data.error || data.success === false) throw new Error('Face operation failed. Check its request history.');
  if (data.task_id && !data.result && !data.data && !data.image_url) {
    throw new Error('The face operation returned an asynchronous task. Inspect request history before retrying.');
  }
  const safe = obj(clean(data)) ?? {};
  const cost = obj(data.cost);
  const amount = cost?.amount;
  const shapeSet = data.face_shape_set;
  return {
    action,
    success: true,
    faceCount: Array.isArray(shapeSet) ? shapeSet.length : 0,
    mediaUrls: mediaUrls(data),
    costCredits: typeof amount === 'number' && Number.isFinite(amount) ? amount : null,
    traceId: typeof data.trace_id === 'string' ? data.trace_id : headerTraceId,
    data: safe
  };
}

export async function faceAction(input: FaceInput, apiKey: string): Promise<FaceResult> {
  const key = apiKey.trim();
  if (!key || /^Bearer\s/i.test(key)) throw new Error('Enter the Ace Data Cloud API key without the Bearer prefix.');
  const { path, body } = facePayload(input);
  let response: Response;
  try {
    response = await fetch('https://api.acedata.cloud' + path, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.timeout(105000)
    });
  } catch {
    throw new Error('Connection failed. Check request history before retrying an uncertain paid operation.');
  }
  if (!response.ok) throw new Error('Ace Data Cloud HTTP ' + response.status + '. Check key, Face access, balance, image URL, and request history.');
  let result: unknown;
  try { result = await response.json(); }
  catch { throw new Error('Ace Data Cloud returned invalid JSON. Check request history.'); }
  return normalizeFace(result, input.action, response.headers.get('x-trace-id') ?? '');
}
