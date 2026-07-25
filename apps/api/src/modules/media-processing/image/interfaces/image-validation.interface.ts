/**
 * Result of image validation.
 */
export interface ImageValidationResult {
  /**
   * Indicates whether the image passed validation.
   */
  valid: boolean;

  /**
   * Validation errors.
   */
  errors: string[];

  /**
   * Validation warnings.
   */
  warnings: string[];
}