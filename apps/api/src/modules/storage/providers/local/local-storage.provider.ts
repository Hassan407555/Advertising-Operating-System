import {
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  createReadStream,
  createWriteStream,
} from 'node:fs';

import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import {
  dirname,
  join,
  resolve,
} from 'node:path';

import { StorageProvider } from '../../interfaces/storage-provider.interface';
import { StorageProvider as StorageProviderEnum } from '@prisma/client';
import { UploadOptions } from '../../interfaces/upload-options.interface';
import { UploadResult } from '../../interfaces/upload-result.interface';
import { FileMetadata } from '../../interfaces/file-metadata.interface';
import { SignedUrlOptions } from '../../interfaces/signed-url-options.interface';

import { FileNameUtil } from '../../utils/file-name.util';
import { StorageKeyUtil } from '../../utils/storage-key.util';
import { FileSystemUtil } from '../../utils/file-system.util';
import { ChecksumUtil } from '../../utils/checksum.util';
import { HashTransform } from '../../utils/hash-transform.util';

import { StorageProviderException } from '../../exceptions/storage-provider.exception';
import { StorageFileNotFoundException } from '../../exceptions/storage-file-not-found.exception';

@Injectable()
export class LocalStorageProvider
  implements StorageProvider, OnModuleInit
{
  /**
   * Root directory where all objects are stored.
   */
  private rootDirectory!: string;

  /**
   * Base URL used for public object URLs.
   */
  private publicBaseUrl!: string;

  constructor(
    private readonly configService: ConfigService,
  ) {}

  /**
   * Initializes the provider.
   */
  async onModuleInit(): Promise<void> {
    this.rootDirectory = resolve(
      this.configService.get<string>(
        'storage.local.rootDirectory',
        './storage',
      ),
    );

    this.publicBaseUrl =
      this.configService.get<string>(
        'storage.local.publicBaseUrl',
        '/storage',
      );

    await FileSystemUtil.ensureDirectory(
      this.rootDirectory,
    );
  }

  /**
   * Converts a storage key into
   * an absolute filesystem path.
   */
  private resolvePath(
    storageKey: string,
  ): string {
    return join(
      this.rootDirectory,
      StorageKeyUtil.normalize(
        storageKey,
      ),
    );
  }

  /**
   * Creates a temporary upload path.
   *
   * Temporary files are atomically
   * renamed after a successful upload.
   */
  private createTemporaryPath(
    destinationPath: string,
  ): string {
    return `${destinationPath}.${Date.now()}.uploading`;
  }

  /**
   * Generates a public URL.
   */
  private buildPublicUrl(
    storageKey: string,
  ): string {
    return `${this.publicBaseUrl}/${StorageKeyUtil.normalize(
      storageKey,
    )}`;
  }

  /**
   * Validates the upload and resolves
   * the final destination path.
   */
  private prepareUpload(
    originalFileName: string,
    options: UploadOptions,
  ): {
    storageKey: string;
    destinationPath: string;
  } {
    const storageKey =
      StorageKeyUtil.build(
        originalFileName,
        options,
      );

    if (
      !StorageKeyUtil.isSafe(
        storageKey,
      )
    ) {
      throw new StorageProviderException(
        'Invalid storage key.',
      );
    }

    return {
      storageKey,
      destinationPath:
        this.resolvePath(
          storageKey,
        ),
    };
  }

  /**
   * Creates the upload response.
   */
  private buildUploadResult(
    storageKey: string,
    originalFileName: string,
    size: number,
    checksum: string,
    options: UploadOptions,
  ): UploadResult {
    const fileName =
      StorageKeyUtil.fileName(
        storageKey,
      );

    return {
      storageKey,
      storageProvider: StorageProviderEnum.LOCAL,
      originalFileName,
      fileName,
      mimeType: options.mimeType,
      extension:
        FileNameUtil.extension(
          fileName,
        ),
      size,
      url: this.buildPublicUrl(
        storageKey,
      ),
      checksum,
      metadata: options.metadata,
    };
  }
    /**
   * Writes a buffer to disk using an atomic write.
   *
   * The buffer is first written to a temporary file and
   * then atomically renamed to its final destination.
   */
  private async writeBufferToFile(
    destinationPath: string,
    buffer: Buffer,
  ): Promise<{
    size: number;
    checksum: string;
  }> {
    const temporaryPath =
      this.createTemporaryPath(
        destinationPath,
      );

    try {
      await FileSystemUtil.write(
        temporaryPath,
        buffer,
      );

      await FileSystemUtil.replace(
        temporaryPath,
        destinationPath,
      );

      return {
        size: buffer.length,
        checksum:
          ChecksumUtil.sha256(buffer),
      };
    } catch (error) {
      await FileSystemUtil.delete(
        temporaryPath,
      );

      throw new StorageProviderException(
        'Failed to write uploaded file.',
        {
          cause: error,
        },
      );
    }
  }

  /**
   * Writes a readable stream to disk while
   * calculating its SHA-256 checksum.
   *
   * The stream is processed only once.
   */
  private async writeStreamToFile(
    destinationPath: string,
    stream: Readable,
  ): Promise<{
    size: number;
    checksum: string;
  }> {
    const temporaryPath =
      this.createTemporaryPath(
        destinationPath,
      );

    await FileSystemUtil.ensureParentDirectory(
      temporaryPath,
    );

    const hashTransform =
      new HashTransform();

    const writeStream =
      createWriteStream(
        temporaryPath,
      );

    let size = 0;

    hashTransform.on(
      'data',
      (chunk: Buffer) => {
        size += chunk.length;
      },
    );

    try {
      await pipeline(
        stream,
        hashTransform,
        writeStream,
      );

      await FileSystemUtil.replace(
        temporaryPath,
        destinationPath,
      );

      return {
        size,
        checksum:
          hashTransform.getChecksum(),
      };
    } catch (error) {
      await FileSystemUtil.delete(
        temporaryPath,
      );

      throw new StorageProviderException(
        'Failed to write upload stream.',
        {
          cause: error,
        },
      );
    }
  }

  /**
   * Uploads a file from memory.
   */
  async upload(
    buffer: Buffer,
    originalFileName: string,
    options: UploadOptions,
  ): Promise<UploadResult> {
    try {
      const {
        storageKey,
        destinationPath,
      } = this.prepareUpload(
        originalFileName,
        options,
      );

      const {
        size,
        checksum,
      } =
        await this.writeBufferToFile(
          destinationPath,
          buffer,
        );

      return this.buildUploadResult(
        storageKey,
        originalFileName,
        size,
        checksum,
        options,
      );
    } catch (error) {
      if (
        error instanceof
        StorageProviderException
      ) {
        throw error;
      }

      throw new StorageProviderException(
        'Failed to upload file.',
        {
          cause: error,
        },
      );
    }
  }

  /**
   * Uploads a readable stream.
   */
  async uploadStream(
    stream: Readable,
    originalFileName: string,
    options: UploadOptions,
  ): Promise<UploadResult> {
    try {
      const {
        storageKey,
        destinationPath,
      } = this.prepareUpload(
        originalFileName,
        options,
      );

      const {
        size,
        checksum,
      } =
        await this.writeStreamToFile(
          destinationPath,
          stream,
        );

      return this.buildUploadResult(
        storageKey,
        originalFileName,
        size,
        checksum,
        options,
      );
    } catch (error) {
      if (
        error instanceof
        StorageProviderException
      ) {
        throw error;
      }

      throw new StorageProviderException(
        'Failed to upload stream.',
        {
          cause: error,
        },
      );
    }
  }
    /**
   * Deletes an object.
   */
  async delete(
    storageKey: string,
  ): Promise<void> {
    const path = this.resolvePath(
      storageKey,
    );

    try {
      if (
        !(await FileSystemUtil.exists(
          path,
        ))
      ) {
        throw new StorageFileNotFoundException(
          storageKey,
        );
      }

      await FileSystemUtil.delete(
        path,
      );
    } catch (error) {
      if (
        error instanceof
        StorageFileNotFoundException
      ) {
        throw error;
      }

      throw new StorageProviderException(
        'Failed to delete object.',
        {
          cause: error,
        },
      );
    }
  }

  /**
   * Determines whether an object exists.
   */
  async exists(
    storageKey: string,
  ): Promise<boolean> {
    try {
      return FileSystemUtil.exists(
        this.resolvePath(
          storageKey,
        ),
      );
    } catch (error) {
      throw new StorageProviderException(
        'Failed to determine object existence.',
        {
          cause: error,
        },
      );
    }
  }

  /**
   * Copies an object.
   */
  async copy(
    sourceStorageKey: string,
    destinationStorageKey: string,
  ): Promise<void> {
    try {
      const sourcePath =
        this.resolvePath(
          sourceStorageKey,
        );

      if (
        !(await FileSystemUtil.exists(
          sourcePath,
        ))
      ) {
        throw new StorageFileNotFoundException(
          sourceStorageKey,
        );
      }

      await FileSystemUtil.copy(
        sourcePath,
        this.resolvePath(
          destinationStorageKey,
        ),
      );
    } catch (error) {
      if (
        error instanceof
        StorageFileNotFoundException
      ) {
        throw error;
      }

      throw new StorageProviderException(
        'Failed to copy object.',
        {
          cause: error,
        },
      );
    }
  }

  /**
   * Moves an object.
   */
  async move(
    sourceStorageKey: string,
    destinationStorageKey: string,
  ): Promise<void> {
    try {
      const sourcePath =
        this.resolvePath(
          sourceStorageKey,
        );

      if (
        !(await FileSystemUtil.exists(
          sourcePath,
        ))
      ) {
        throw new StorageFileNotFoundException(
          sourceStorageKey,
        );
      }

      await FileSystemUtil.move(
        sourcePath,
        this.resolvePath(
          destinationStorageKey,
        ),
      );
    } catch (error) {
      if (
        error instanceof
        StorageFileNotFoundException
      ) {
        throw error;
      }

      throw new StorageProviderException(
        'Failed to move object.',
        {
          cause: error,
        },
      );
    }
  }
    /**
   * Retrieves metadata for a stored object.
   */
  async getMetadata(
    storageKey: string,
  ): Promise<FileMetadata> {
    try {
      const path = this.resolvePath(
        storageKey,
      );

      if (
        !(await FileSystemUtil.exists(
          path,
        ))
      ) {
        throw new StorageFileNotFoundException(
          storageKey,
        );
      }

      const stats =
        await FileSystemUtil.stats(
          path,
        );

      const fileName =
        StorageKeyUtil.fileName(
          storageKey,
        );

      return {
        storageKey,
        size: stats.size,
        mimeType:
          'application/octet-stream',
        extension:
          FileNameUtil.extension(
            fileName,
          ),
        lastModified:
          stats.mtime,
        exists: true,
      };
    } catch (error) {
      if (
        error instanceof
        StorageFileNotFoundException
      ) {
        throw error;
      }

      throw new StorageProviderException(
        'Failed to retrieve object metadata.',
        {
          cause: error,
        },
      );
    }
  }

  /**
   * Returns the public URL of an object.
   */
  async getPublicUrl(
    storageKey: string,
  ): Promise<string> {
    return this.buildPublicUrl(
      storageKey,
    );
  }

  /**
   * Returns a signed URL.
   *
   * Local storage does not currently support
   * signed URLs, so this behaves the same as
   * a public URL.
   */
  async getSignedUrl(
    storageKey: string,
    _options: SignedUrlOptions,
  ): Promise<string> {
    return this.buildPublicUrl(
      storageKey,
    );
  }
}