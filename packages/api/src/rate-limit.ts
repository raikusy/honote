const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const REGISTER_LIMIT = 10;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;

type Bucket = Map<string, { start: number; count: number }>;

const loginBuckets: Bucket = new Map();
const registerBuckets: Bucket = new Map();

export function consumeLogin(ip: string, email: string) {
  return consume(loginBuckets, `${ip}\n${email}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
}

export function consumeRegister(ip: string) {
  return consume(registerBuckets, ip, REGISTER_LIMIT, REGISTER_WINDOW_MS);
}

export function loginRetryAfter(ip: string, email: string) {
  return retryAfter(loginBuckets, `${ip}\n${email}`, LOGIN_WINDOW_MS);
}

export function registerRetryAfter(ip: string) {
  return retryAfter(registerBuckets, ip, REGISTER_WINDOW_MS);
}

function consume(bucket: Bucket, key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = bucket.get(key);
  if (!current || now - current.start >= windowMs) {
    bucket.set(key, { start: now, count: 1 });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

function retryAfter(bucket: Bucket, key: string, windowMs: number) {
  const current = bucket.get(key);
  if (!current) return 1;
  const seconds = Math.ceil((current.start + windowMs - Date.now()) / 1000);
  return Math.max(seconds, 1);
}
