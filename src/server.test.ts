// Mocking parseClient and parseAuthenticator from `parsers`
jest.mock("./parsers", () => ({
  parseClient: jest.fn().mockImplementation((clientDataJSON: string) => {
    // Return minimal valid "client" data
    return {
      type: "webauthn.create", // or "webauthn.get"
      origin: "https://example.com",
      challenge: "test_challenge",
    };
  }),
  parseAuthenticator: jest.fn().mockImplementation((authenticatorData: string) => {
    // Return minimal valid "authenticator" data
    return {
      aaguid: "test_aaguid",
      rpIdHash: "FAKE_RP_ID_HASH", // Must match what's expected in test if you check it
      flags: {
        userPresent: true,
        userVerified: true,
      },
      signCount: 999,
    };
  }),
  toRegistrationInfo: jest.fn().mockImplementation((registrationJson, authenticator) => {
    return {
      // Minimal registration info object
      credential: {
        id: registrationJson.id,
      },
      authenticator: {
        aaguid: authenticator.aaguid,
        counter: authenticator.signCount,
      },
    };
  }),
  toAuthenticationInfo: jest
    .fn()
    .mockImplementation((authenticationJson, authenticator) => {
      return {
        // Minimal authentication info object
        credentialId: authenticationJson.id,
        counter: authenticator.signCount,
      };
    }),
}));

import * as server from "./server";
import * as utils from "./utils";
import { AuthenticationJSON } from "./types";

describe("server.ts tests", () => {
  describe("randomChallenge()", () => {
    test("returns a base64url string", () => {
      const challenge = server.randomChallenge();
      // Basic checks
      expect(challenge).toMatch(/^[A-Za-z0-9-_]+$/);
      expect(challenge.length).toBeGreaterThan(16);
    });
  });

  describe("verifyRegistration()", () => {
    test("throws error if aaguid is missing", async () => {
      // Override parseAuthenticator mock for this test
      const parsers = require("./parsers");
      parsers.parseAuthenticator.mockReturnValueOnce({
        aaguid: null, // Force it to be missing
      });

      const registrationJson = {
        id: "test_id",
        response: {
          clientDataJSON: "FAKE_CLIENT_DATA_JSON",
          authenticatorData: "FAKE_AUTH_DATA",
        },
      };
      const expected = {
        origin: "https://example.com",
        challenge: "test_challenge",
      };

      await expect(
        server.verifyRegistration(registrationJson as any, expected)
      ).rejects.toThrow("Unexpected error, no AAGUID.");
    });

    test("succeeds if checks pass", async () => {
      const registrationJson = {
        id: "test_id",
        response: {
          clientDataJSON: "FAKE_CLIENT_DATA_JSON",
          authenticatorData: "FAKE_AUTH_DATA",
        },
      };
      const expected = {
        origin: "https://example.com",
        challenge: "test_challenge",
      };

      const result = await server.verifyRegistration(registrationJson as any, expected);
      expect(result.credential.id).toBe("test_id");
      expect(result.authenticator.aaguid).toBe("test_aaguid");
      expect(result.authenticator.counter).toBe(999);
    });
  });

  describe("verifyAuthentication()", () => {
    test("throws if credential ID mismatch", async () => {
      const authenticationJson = {
        id: "WRONG_ID",
        response: {
          authenticatorData: "FAKE_AUTH_DATA",
          clientDataJSON: "FAKE_CLIENT_DATA_JSON",
          signature: "FAKE_SIGNATURE",
        },
      };
      const credential = {
        id: "EXPECTED_ID",
        algorithm: "ES256",
        publicKey: "FAKE_PUBLIC_KEY",
      };
      const expected = {
        origin: "https://example.com",
        challenge: "test_challenge",
        userVerified: true,
      };

      await expect(
        server.verifyAuthentication(
          authenticationJson as any,
          credential as any,
          expected as any
        )
      ).rejects.toThrow("Credential ID mismatch: WRONG_ID vs EXPECTED_ID");
    });

    test("fails if signature is invalid", async () => {
      // Force verifySignature() to return false
      jest.spyOn(utils, "verifySignature").mockResolvedValueOnce(false);

      const authenticationJson = {
        id: "EXPECTED_ID",
        response: {
          authenticatorData: "FAKE_AUTH_DATA",
          clientDataJSON: "FAKE_CLIENT_DATA_JSON",
          signature: "FAKE_SIGNATURE",
        },
      };
      const credential = {
        id: "EXPECTED_ID",
        algorithm: "ES256",
        publicKey: "FAKE_PUBLIC_KEY",
      };
      const expected = {
        origin: "https://example.com",
        challenge: "test_challenge",
        userVerified: true,
      };

      await expect(
        server.verifyAuthentication(
          authenticationJson as any,
          credential as any,
          expected as any
        )
      ).rejects.toThrow("Invalid signature: FAKE_SIGNATURE");
    });

    test("succeeds if signature is valid and checks pass", async () => {
      // Force verifySignature() to return true

      jest.spyOn(utils, "verifySignature").mockResolvedValueOnce(true);

      // Override parseClient mock for this test
      const parsers = require("./parsers");
      parsers.parseClient.mockReturnValueOnce({
        type: "webauthn.get",
        origin: "https://example.com",
        challenge: "test_challenge",
      });

      // Mock out rpIdHash comparison so it passes
      jest.spyOn(utils, "sha256").mockResolvedValueOnce(utils.toBuffer("FAKE_RP_ID"));
      jest.spyOn(utils, "toBase64url").mockReturnValueOnce("FAKE_RP_ID_HASH");

      const authenticationJson = {
        id: "EXPECTED_ID",
        response: {
          authenticatorData: "FAKE_AUTH_DATA",
          clientDataJSON: "FAKE_CLIENT_DATA_JSON",
          signature: "FAKE_SIGNATURE",
        },
      };
      const credential = {
        id: "EXPECTED_ID",
        algorithm: "ES256",
        publicKey: "FAKE_PUBLIC_KEY",
      };
      const expected = {
        origin: "https://example.com",
        challenge: "test_challenge",
        userVerified: true,
      };

      const result = await server.verifyAuthentication(
        authenticationJson as any,
        credential as any,
        expected as any
      );
      expect(result.credentialId).toBe("EXPECTED_ID");
      expect(result.counter).toBe(999);
    });
  });
});
