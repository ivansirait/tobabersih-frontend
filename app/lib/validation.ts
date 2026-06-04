export function validatePhone(phone: string): { valid: boolean; message?: string } {
  if (!phone) return { valid: true };
  const digits = phone.replace(/\D/g, '');
  if (!/^[0-9]+$/.test(digits)) return { valid: false, message: 'Nomor telepon hanya boleh berisi angka.' };
  if (digits.length < 11 || digits.length > 13) return { valid: false, message: 'Nomor telepon harus memiliki 11 sampai 13 digit.' };
  return { valid: true };
}

export function validateEmail(email: string): { valid: boolean; message?: string } {
  if (!email) return { valid: true };
  if (!email.includes('@')) return { valid: false, message: 'Email harus mengandung karakter @.' };
  // Jangan terima email yang hanya angka
  if (/^\d+$/.test(email.replace(/\s+/g, ''))) return { valid: false, message: 'Email tidak boleh berupa angka saja.' };
  return { valid: true };
}
