// Mocking parseClient and parseAuthenticator from `parsers`
jest.mock("../parsers", () => ({
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

import * as server from "../server";
import * as utils from "../utils";
import { AuthenticationJSON, NamedAlgo } from "../types";

const ES256_SPKI_KEY =
  "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEol4zrYnJVbFPkOCqeWV5NCPnmzyfC-l0xsDQDIxBsA0RvfMi_KLqC7ksZyMXHqspq37pGPOxBwmhY3h6DGYrKQ";

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

    test("throws error if aaguid is missing", async () => {
      // Override parseAuthenticator mock for this test
      const parsers = require("../parsers");
      parsers.parseAuthenticator.mockReturnValueOnce({
        aaguid: null, // Force it to be missing
      });

      await expect(
        server.verifyRegistration(registrationJson as any, expected)
      ).rejects.toThrow("Unexpected error, no AAGUID.");
    });

    test("throws error if client.type is not 'webauthn.create'", async () => {
      // Override parseClient mock for this test
      const parsers = require("../parsers");
      parsers.parseClient.mockReturnValueOnce({
        type: "unknown", // Force it to be missing
      });

      await expect(
        server.verifyRegistration(registrationJson as any, expected)
      ).rejects.toThrow("Unexpected ClientData type: unknown");
    });

    test("throws error if origin is not valid", async () => {
      // Override parseClient mock for this test
      const parsers = require("../parsers");
      parsers.parseClient.mockReturnValueOnce({
        type: "webauthn.create",
        origin: "https://wrong.com",
      });

      await expect(
        server.verifyRegistration(registrationJson as any, expected)
      ).rejects.toThrow("Unexpected ClientData origin: https://wrong.com");
    });

    test("throws error if challenge is not valid", async () => {
      // Override parseClient mock for this test
      const parsers = require("../parsers");
      parsers.parseClient.mockReturnValueOnce({
        type: "webauthn.create",
        origin: expected.origin,
        challenge: "wrong_challenge",
      });

      await expect(
        server.verifyRegistration(registrationJson as any, expected)
      ).rejects.toThrow("Unexpected ClientData challenge: wrong_challenge");
    });

    test("succeeds if checks pass", async () => {
      const result = await server.verifyRegistration(registrationJson as any, expected);
      expect(result.credential.id).toBe("test_id");
      expect(result.authenticator.aaguid).toBe("test_aaguid");
      expect(result.authenticator.counter).toBe(999);
    });
  });

  describe("parseCryptoKey()", () => {
    test("throws on unsupported algorithm", async () => {
      await expect(server.parseCryptoKey("FOO" as any, "SOME_KEY")).rejects.toThrow(
        "Unknown or unsupported crypto algorithm: FOO. Only 'RS256' and 'ES256' are supported."
      );
    });

    test("imports ES256 key", async () => {
      const result = await server.parseCryptoKey("ES256", ES256_SPKI_KEY);

      // Expect a CryptoKey object
      expect(result).toBeDefined();
      expect(result.type).toBe("public");
      expect(result.algorithm).toBeDefined();
      expect(result.usages).toContain("verify");
    });
  });

  describe("verifyAuthentication()", () => {
    const authenticationJson = {
      id: "EXPECTED_ID",
      response: {
        authenticatorData:
          "c46cef82ad1b546477591d008b08759ec3e6d2ecb4f39474bfea6969925d03b71d00000000",
        clientDataJSON:
          "7b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22555377465a65357038734452766d304e55536b4a5941222c226f726967696e223a2268747470733a2f2f64656d6f2e79756269636f2e636f6d222c2263726f73734f726967696e223a66616c73657d",
        signature: "FAKE_SIGNATURE",
      },
    };

    const wrongAuthenticationJson = {
      id: "WRONG_ID",
      response: {
        authenticatorData: "FAKE_AUTH_DATA",
        clientDataJSON: "FAKE_CLIENT_DATA_JSON",
        signature: "FAKE_SIGNATURE",
      },
    };

    const credential = {
      id: "EXPECTED_ID",
      algorithm: "ES256" as NamedAlgo,
      publicKey: ES256_SPKI_KEY,
    };

    const expected = {
      origin: "https://example.com",
      challenge: "test_challenge",
      userVerified: true,
    };

    test("throws if credential ID mismatch", async () => {
      await expect(
        server.verifyAuthentication(
          wrongAuthenticationJson as any,
          credential as any,
          expected as any
        )
      ).rejects.toThrow("Credential ID mismatch: WRONG_ID vs EXPECTED_ID");
    });

    test("fails if signature is invalid", async () => {
      // Force crypto.subtle.verify to return false
      jest.spyOn(global.crypto.subtle, "verify").mockResolvedValueOnce(false);

      await expect(
        server.verifyAuthentication(
          authenticationJson as any,
          credential as any,
          expected as any
        )
      ).rejects.toThrow("Invalid signature: FAKE_SIGNATURE");
    });

    test("throws error if client.type is not 'webauthn.get'", async () => {
      // Force crypto.subtle.verify to return true
      jest.spyOn(global.crypto.subtle, "verify").mockResolvedValueOnce(true);

      // Override parseClient mock for this test
      const parsers = require("../parsers");
      parsers.parseClient.mockReturnValueOnce({
        type: "unknown", // Force it to be missing
      });

      await expect(
        server.verifyAuthentication(
          authenticationJson as any,
          credential as any,
          expected as any
        )
      ).rejects.toThrow("Unexpected clientData type: unknown");
    });

    test("throws error if origin is not valid", async () => {
      // Force crypto.subtle.verify to return true
      jest.spyOn(global.crypto.subtle, "verify").mockResolvedValueOnce(true);

      // Override parseClient mock for this test
      const parsers = require("../parsers");
      parsers.parseClient.mockReturnValueOnce({
        type: "webauthn.get",
        origin: "https://wrong.com",
      });

      await expect(
        server.verifyAuthentication(
          authenticationJson as any,
          credential as any,
          expected as any
        )
      ).rejects.toThrow("Unexpected ClientData origin: https://wrong.com");
    });

    test("throws error if challenge is not valid", async () => {
      // Force crypto.subtle.verify to return true
      jest.spyOn(global.crypto.subtle, "verify").mockResolvedValueOnce(true);

      // Override parseClient mock for this test
      const parsers = require("../parsers");
      parsers.parseClient.mockReturnValueOnce({
        type: "webauthn.get",
        origin: expected.origin,
        challenge: "wrong_challenge",
      });

      await expect(
        server.verifyAuthentication(
          authenticationJson as any,
          credential as any,
          expected as any
        )
      ).rejects.toThrow("Unexpected ClientData challenge: wrong_challenge");
    });

    test("throws error if RpIdHash does not match", async () => {
      // Force crypto.subtle.verify to return true
      jest.spyOn(global.crypto.subtle, "verify").mockResolvedValueOnce(true);

      // Override parseClient mock for this test
      const parsers = require("../parsers");
      parsers.parseClient.mockReturnValueOnce({
        type: "webauthn.get",
        origin: expected.origin,
        challenge: "test_challenge",
      });

      // Override parseAuthenticator mock for this test
      parsers.parseAuthenticator.mockReturnValueOnce({
        rpIdHash: "wrong hash",
      });

      await expect(
        server.verifyAuthentication(
          authenticationJson as any,
          credential as any,
          { ...expected, domain: "www.webauthn.com" } as any
        )
      ).rejects.toThrow(
        "Unexpected RpIdHash: wrong hash vs 2ES3JZ_VrXLD90n6-L9nuL2BHLYnTCRtk1IWW51u8K0="
      );
    });

    test("throws error if missing userPresent", async () => {
      // Force crypto.subtle.verify to return true
      jest.spyOn(global.crypto.subtle, "verify").mockResolvedValueOnce(true);

      // Override parseClient mock for this test
      const parsers = require("../parsers");
      parsers.parseClient.mockReturnValueOnce({
        type: "webauthn.get",
        origin: expected.origin,
        challenge: "test_challenge",
      });

      // Override parseAuthenticator mock for this test
      parsers.parseAuthenticator.mockReturnValueOnce({
        rpIdHash: "o3mm9u6vuaVeN4wRgDTidR5oL6ufLTCrE9ISVYbOGUc=",
        flags: { userPresent: false },
      });

      await expect(
        server.verifyAuthentication(
          authenticationJson as any,
          credential as any,
          expected as any
        )
      ).rejects.toThrow("Unexpected authenticator flags: missing userPresent");
    });

    test("throws error if missing userVerified", async () => {
      // Force crypto.subtle.verify to return true
      jest.spyOn(global.crypto.subtle, "verify").mockResolvedValueOnce(true);

      // Override parseClient mock for this test
      const parsers = require("../parsers");
      parsers.parseClient.mockReturnValueOnce({
        type: "webauthn.get",
        origin: expected.origin,
        challenge: "test_challenge",
      });

      // Override parseAuthenticator mock for this test
      parsers.parseAuthenticator.mockReturnValueOnce({
        rpIdHash: "o3mm9u6vuaVeN4wRgDTidR5oL6ufLTCrE9ISVYbOGUc=",
        flags: { userPresent: true, userVerified: false },
      });

      await expect(
        server.verifyAuthentication(
          authenticationJson as any,
          credential as any,
          { ...expected, userVerified: true } as any
        )
      ).rejects.toThrow("Unexpected authenticator flags: missing userVerified");
    });

    test("throws error if counter is less expected counter", async () => {
      // Force crypto.subtle.verify to return true
      jest.spyOn(global.crypto.subtle, "verify").mockResolvedValueOnce(true);

      // Override parseClient mock for this test
      const parsers = require("../parsers");
      parsers.parseClient.mockReturnValueOnce({
        type: "webauthn.get",
        origin: expected.origin,
        challenge: "test_challenge",
      });

      // Override parseAuthenticator mock for this test
      parsers.parseAuthenticator.mockReturnValueOnce({
        rpIdHash: "o3mm9u6vuaVeN4wRgDTidR5oL6ufLTCrE9ISVYbOGUc=",
        flags: { userPresent: true, userVerified: true },
        signCount: 300,
      });

      await expect(
        server.verifyAuthentication(
          authenticationJson as any,
          credential as any,
          { ...expected, userVerified: true, counter: 2000 } as any
        )
      ).rejects.toThrow("Unexpected authenticator counter: 300 (should be > 2000)");
    });

    test("throws error if counter is less expected counter", async () => {
      // Force crypto.subtle.verify to return true
      jest.spyOn(global.crypto.subtle, "verify").mockResolvedValueOnce(true);

      // Override parseClient mock for this test
      const parsers = require("../parsers");
      parsers.parseClient.mockReturnValueOnce({
        type: "webauthn.get",
        origin: expected.origin,
        challenge: "test_challenge",
      });

      // Override parseAuthenticator mock for this test
      parsers.parseAuthenticator.mockReturnValueOnce({
        rpIdHash: "o3mm9u6vuaVeN4wRgDTidR5oL6ufLTCrE9ISVYbOGUc=",
        flags: { userPresent: true, userVerified: true },
        signCount: 300,
      });

      await expect(
        server.verifyAuthentication(
          authenticationJson as any,
          credential as any,
          { ...expected, userVerified: true, counter: 2000 } as any
        )
      ).rejects.toThrow("Unexpected authenticator counter: 300 (should be > 2000)");
    });

    test("succeeds if signature is valid and checks pass", async () => {
      // Force crypto.subtle.verify to return true
      jest.spyOn(global.crypto.subtle, "verify").mockResolvedValueOnce(true);

      // Override parseClient mock for this test
      const parsers = require("../parsers");
      parsers.parseClient.mockReturnValueOnce({
        type: "webauthn.get",
        origin: expected.origin,
        challenge: "test_challenge",
      });

      parsers.parseAuthenticator.mockReturnValueOnce({
        rpIdHash: "o3mm9u6vuaVeN4wRgDTidR5oL6ufLTCrE9ISVYbOGUc=",
        flags: { userPresent: true, userVerified: true },
        signCount: 999,
      });

      // spy on console.debug
      const debugSpy = jest.spyOn(console, "debug");

      const result = await server.verifyAuthentication(
        authenticationJson as any,
        credential as any,
        { ...expected, verbose: true } as any
      );

      expect(result.credentialId).toBe("EXPECTED_ID");
      expect(result.counter).toBe(999);
      expect(debugSpy).toHaveBeenCalledTimes(7);
      expect(debugSpy.mock.calls).toEqual([
        [
          expect.objectContaining({
            algorithm: { name: "ECDSA", namedCurve: "P-256" },
            extractable: false,
            type: "public",
            usages: ["verify"],
          }),
        ],
        ["Algorithm: ES256"],
        [
          "Public key: MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEol4zrYnJVbFPkOCqeWV5NCPnmzyfC-l0xsDQDIxBsA0RvfMi_KLqC7ksZyMXHqspq37pGPOxBwmhY3h6DGYrKQ",
        ],
        [
          "Data: c46cef82ad1b546477591d008b08759ec3e6d2ecb4f39474bfea6969925d03b71d0000000_eSupQc16dKPLnVuclrY5qAH5n6YFArWLnfSQ9bmOHb",
        ],
        ["Signature: FAKE_SIGNATURE"],
        [
          {
            challenge: "test_challenge",
            origin: "https://example.com",
            type: "webauthn.get",
          },
        ],
        [
          {
            flags: { userPresent: true, userVerified: true },
            rpIdHash: "o3mm9u6vuaVeN4wRgDTidR5oL6ufLTCrE9ISVYbOGUc=",
            signCount: 999,
          },
        ],
      ]);
    });
  });
});
