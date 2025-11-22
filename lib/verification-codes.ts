// Shared verification code storage
// In production, use Redis or a database table instead

interface VerificationCodeData {
  code: string;
  expiresAt: number;
}

const verificationCodes = new Map<string, VerificationCodeData>();

// Clean up expired codes every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of verificationCodes.entries()) {
    if (data.expiresAt < now) {
      verificationCodes.delete(email);
    }
  }
}, 10 * 60 * 1000);

export function storeVerificationCode(email: string, code: string, expiresInMinutes: number = 15): void {
  const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
  verificationCodes.set(email.toLowerCase(), { code, expiresAt });
}

export function getVerificationCode(email: string): VerificationCodeData | undefined {
  return verificationCodes.get(email.toLowerCase());
}

export function deleteVerificationCode(email: string): void {
  verificationCodes.delete(email.toLowerCase());
}

export function verifyCode(email: string, code: string): boolean {
  const stored = getVerificationCode(email);
  if (!stored) return false;
  if (stored.expiresAt < Date.now()) {
    deleteVerificationCode(email);
    return false;
  }
  return stored.code === code;
}

