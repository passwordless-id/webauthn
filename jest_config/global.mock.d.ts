// global.mock.d.ts
import "jest";

declare global {
  var mockCreate: jest.Mock<any, any>;
  var mockGet: jest.Mock<any, any>;
  var mockIsUserVerifyingPlatformAuthenticatorAvailable: jest.Mock<any, any>;
  var mockIsConditionalMediationAvailable: jest.Mock<any, any>;
}

export {};
