export function hashPassword(password: string) {
  return Bun.password.hash(password, {
    algorithm: "argon2id",
    memoryCost: 19456,
    timeCost: 2,
  });
}

export function oneTimePassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(15));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_");
}
