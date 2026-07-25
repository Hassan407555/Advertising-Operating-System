import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import type { Stats } from 'node:fs';
export class FileSystemUtil {
  /**
   * Ensures a directory exists.
   */
  static async ensureDirectory(
    directory: string,
  ): Promise<void> {
    await fs.mkdir(directory, {
      recursive: true,
    });
  }

  /**
   * Ensures the parent directory of a file exists.
   */
  static async ensureParentDirectory(
    filePath: string,
  ): Promise<void> {
    await this.ensureDirectory(
      dirname(filePath),
    );
  }

  /**
   * Returns true if the path exists.
   */
  static async exists(
    path: string,
  ): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Deletes a file if it exists.
   */
  static async delete(
    path: string,
  ): Promise<void> {
    if (!(await this.exists(path))) {
      return;
    }

    await fs.unlink(path);
  }

  /**
   * Copies a file.
   */
  static async copy(
    source: string,
    destination: string,
  ): Promise<void> {
    await this.ensureParentDirectory(
      destination,
    );

    await fs.copyFile(
      source,
      destination,
    );
  }

  /**
   * Moves a file.
   */
  static async move(
    source: string,
    destination: string,
  ): Promise<void> {
    await this.ensureParentDirectory(
      destination,
    );

    await fs.rename(
      source,
      destination,
    );
  }

  /**
   * Returns file statistics.
   */
 static async stats(
  path: string,
): Promise<Stats> {
  return fs.stat(path);
}

  /**
   * Reads an entire file into memory.
   * Only use for small files.
   */
  static async read(
    path: string,
  ): Promise<Buffer> {
    return fs.readFile(path);
  }

  /**
   * Writes a buffer to disk.
   */
  static async write(
    path: string,
    buffer: Buffer,
  ): Promise<void> {
    await this.ensureParentDirectory(
      path,
    );

    await fs.writeFile(
      path,
      buffer,
    );
  }
  /**
 * Atomically replaces or creates a file.
 */
/**
 * Atomically replaces a file.
 */
static async replace(
  source: string,
  destination: string,
): Promise<void> {
  await this.ensureParentDirectory(destination);

  try {
    await fs.unlink(destination);
  } catch {
    // Destination does not exist.
  }

  await fs.rename(source, destination);
}
}