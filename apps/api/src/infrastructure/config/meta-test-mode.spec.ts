import { isMetaTestMode } from './meta-test-mode';

describe('isMetaTestMode', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFlag = process.env.META_TEST_MODE;

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }

    if (originalFlag === undefined) {
      delete process.env.META_TEST_MODE;
    } else {
      process.env.META_TEST_MODE = originalFlag;
    }
  });

  it('returns true when META_TEST_MODE=true', () => {
    process.env.NODE_ENV = 'production';
    process.env.META_TEST_MODE = 'true';
    expect(isMetaTestMode()).toBe(true);
  });

  it('returns false when META_TEST_MODE=false even in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.META_TEST_MODE = 'false';
    expect(isMetaTestMode()).toBe(false);
  });

  it('defaults to true in development when flag is unset', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.META_TEST_MODE;
    expect(isMetaTestMode()).toBe(true);
  });

  it('defaults to false in production when flag is unset', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.META_TEST_MODE;
    expect(isMetaTestMode()).toBe(false);
  });
});
