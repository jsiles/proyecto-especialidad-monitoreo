import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
} from '../src/utils/passwordHasher';

describe('passwordHasher utils', () => {
  it('hashes and verifies a password', async () => {
    const plain = 'StrongPass123!';
    const hash = await hashPassword(plain);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(plain);

    const valid = await comparePassword(plain, hash);
    const invalid = await comparePassword('wrong', hash);

    expect(valid).toBe(true);
    expect(invalid).toBe(false);
  });

  it('validates strong password correctly', () => {
    const errors = validatePasswordStrength('StrongPass123!');
    expect(errors).toHaveLength(0);
  });

  it('returns multiple errors for weak password', () => {
    const errors = validatePasswordStrength('abc');

    expect(errors.length).toBeGreaterThan(2);
    expect(errors).toContain('Password must be at least 8 characters long');
    expect(errors).toContain('Password must contain at least one uppercase letter');
    expect(errors).toContain('Password must contain at least one number');
  });
});
