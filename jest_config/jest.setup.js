// jest.setup.js

if (typeof globalThis.btoa === "undefined") {
  globalThis.btoa = (data) => Buffer.from(data, "binary").toString("base64");
}

if (typeof globalThis.atob === "undefined") {
  globalThis.atob = (data) => Buffer.from(data, "base64").toString("binary");
}

if (typeof globalThis.crypto === "undefined") {
  const { webcrypto } = require("crypto");
  globalThis.crypto = webcrypto;
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (!crypto.randomUUID) {
    crypto.randomUUID = () => "mock-uuid-1234";
  }

  // Mock the PublicKeyCredential and its static methods:
  const mockIsUserVerifyingPlatformAuthenticatorAvailable = jest.fn();
  const mockIsConditionalMediationAvailable = jest.fn();

  Object.defineProperty(window, "PublicKeyCredential", {
    writable: true,
    value: class {
      static isUserVerifyingPlatformAuthenticatorAvailable =
        mockIsUserVerifyingPlatformAuthenticatorAvailable;
      static isConditionalMediationAvailable = mockIsConditionalMediationAvailable;
    },
  });

  // Mock navigator.credentials.create and .get:
  const mockCreate = jest.fn();
  const mockGet = jest.fn();

  Object.defineProperty(navigator, "credentials", {
    writable: true,
    value: {
      create: mockCreate,
      get: mockGet,
    },
  });

  global.mockCreate = mockCreate;
  global.mockGet = mockGet;
  global.mockIsUserVerifyingPlatformAuthenticatorAvailable =
    mockIsUserVerifyingPlatformAuthenticatorAvailable;
  global.mockIsConditionalMediationAvailable = mockIsConditionalMediationAvailable;
}
