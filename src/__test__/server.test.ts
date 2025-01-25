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
import { AuthenticationJSON } from "../types";

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

  describe("verifyAuthentication()", () => {
    const authenticationJson = {
      id: "EXPECTED_ID",
      response: {
        authenticatorData: "FAKE_AUTH_DATA",
        clientDataJSON: "FAKE_CLIENT_DATA_JSON",
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
      algorithm: "ES256",
      publicKey: "FAKE_PUBLIC_KEY",
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
      // Force verifySignature() to return false
      jest.spyOn(utils, "verifySignature").mockResolvedValueOnce(false);

      await expect(
        server.verifyAuthentication(
          authenticationJson as any,
          credential as any,
          expected as any
        )
      ).rejects.toThrow("Invalid signature: FAKE_SIGNATURE");
    });

    test("throws error if client.type is not 'webauthn.get'", async () => {
      // Force verifySignature() to return true
      jest.spyOn(utils, "verifySignature").mockResolvedValueOnce(true);

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
      // Force verifySignature() to return true
      jest.spyOn(utils, "verifySignature").mockResolvedValueOnce(true);

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
      // Force verifySignature() to return true
      jest.spyOn(utils, "verifySignature").mockResolvedValueOnce(true);

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
      // Force verifySignature() to return true
      jest.spyOn(utils, "verifySignature").mockResolvedValueOnce(true);

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
      // Force verifySignature() to return true
      jest.spyOn(utils, "verifySignature").mockResolvedValueOnce(true);

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
      // Force verifySignature() to return true
      jest.spyOn(utils, "verifySignature").mockResolvedValueOnce(true);

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
      // Force verifySignature() to return true
      jest.spyOn(utils, "verifySignature").mockResolvedValueOnce(true);

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
      // Force verifySignature() to return true
      jest.spyOn(utils, "verifySignature").mockResolvedValueOnce(true);

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
      // Force verifySignature() to return true
      jest.spyOn(utils, "verifySignature").mockResolvedValueOnce(true);

      // Override parseClient mock for this test
      const parsers = require("../parsers");
      parsers.parseClient.mockReturnValueOnce({
        type: "webauthn.get",
        origin: expected.origin,
        challenge: "test_challenge",
      });

      // spy on console.debug
      const debugSpy = jest.spyOn(console, "debug");

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

      const result = await server.verifyAuthentication(
        authenticationJson as any,
        credential as any,
        { ...expected, verbose: true } as any
      );

      expect(result.credentialId).toBe("EXPECTED_ID");
      expect(result.counter).toBe(999);
      expect(debugSpy).toHaveBeenCalledTimes(2);
      expect(debugSpy.mock.calls).toEqual([
        [
          {
            challenge: "test_challenge",
            origin: "https://example.com",
            type: "webauthn.get",
          },
        ],
        [
          {
            aaguid: "test_aaguid",
            flags: { userPresent: true, userVerified: true },
            rpIdHash: "FAKE_RP_ID_HASH",
            signCount: 999,
          },
        ],
      ]);
    });
  });
});
