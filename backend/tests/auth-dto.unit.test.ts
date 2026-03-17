import {
  validateLoginDTO,
  validateRegisterDTO,
  validateChangePasswordDTO,
} from '../src/dtos/AuthDTO';

describe('AuthDTO validations', () => {
  it('validates login payload', () => {
    const dto = validateLoginDTO({ username: ' admin ', password: 'admin123' });

    expect(dto.username).toBe('admin');
    expect(dto.password).toBe('admin123');
  });

  it('rejects short login username', () => {
    expect(() => validateLoginDTO({ username: 'ab', password: '123456' })).toThrow(
      'Username must be at least 3 characters'
    );
  });

  it('validates register payload with optional email', () => {
    const dto = validateRegisterDTO({
      username: 'operator',
      password: 'operator123',
      email: ' operator@test.local ',
    });

    expect(dto.username).toBe('operator');
    expect(dto.email).toBe('operator@test.local');
  });

  it('rejects non-string email in register payload', () => {
    expect(() =>
      validateRegisterDTO({ username: 'user', password: '123456', email: 123 })
    ).toThrow('Invalid email format');
  });

  it('validates change-password payload', () => {
    const dto = validateChangePasswordDTO({
      currentPassword: 'oldPass123',
      newPassword: 'NewPass456!',
    });

    expect(dto.currentPassword).toBe('oldPass123');
    expect(dto.newPassword).toBe('NewPass456!');
  });

  it('rejects weak new password in change-password payload', () => {
    expect(() =>
      validateChangePasswordDTO({ currentPassword: 'oldPass123', newPassword: '123' })
    ).toThrow('New password must be at least 6 characters');
  });
});
