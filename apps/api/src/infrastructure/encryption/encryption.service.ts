import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';

  private readonly key: Buffer;

  constructor() {
    const secret = process.env.ENCRYPTION_KEY;

    if (!secret) {
      throw new Error(
        'ENCRYPTION_KEY environment variable is missing.',
      );
    }

    this.key = createHash('sha256')
      .update(secret)
      .digest();
  }

  encrypt(value: string): string {
    try {
      const iv = randomBytes(16);

      const cipher = createCipheriv(
        this.algorithm,
        this.key,
        iv,
      );

      const encrypted = Buffer.concat([
        cipher.update(value, 'utf8'),
        cipher.final(),
      ]);

      const tag = cipher.getAuthTag();

      return [
        iv.toString('hex'),
        tag.toString('hex'),
        encrypted.toString('hex'),
      ].join(':');
    } catch {
      throw new InternalServerErrorException(
        'Failed to encrypt value.',
      );
    }
  }

  decrypt(value: string): string {
    try {
      const [ivHex, tagHex, encryptedHex] =
        value.split(':');

      const decipher = createDecipheriv(
        this.algorithm,
        this.key,
        Buffer.from(ivHex, 'hex'),
      );

      decipher.setAuthTag(
        Buffer.from(tagHex, 'hex'),
      );

      const decrypted = Buffer.concat([
        decipher.update(
          Buffer.from(encryptedHex, 'hex'),
        ),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch {
      throw new InternalServerErrorException(
        'Failed to decrypt value.',
      );
    }
  }
}