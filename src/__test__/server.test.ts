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
      rpIdHash: "o3mm9u6vuaVeN4wRgDTidR5oL6ufLTCrE9ISVYbOGUc=", // SHA-256 of "example.com", the hostname of the default origin
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
import { NamedAlgo } from "../types";
import * as utils from "../utils";

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
    const originValidator = (originVal: string) => {
      return (
        originVal === "https://example.com" || originVal === "https://localhost:3000"
      );
    };

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

    const fnExpected = {
      origin: originValidator,
      challenge: "test_challenge",
    };

    test("throws error if user verification is required but missing", async () => {
      // Override parseAuthenticator mock for this test
      const parsers = require("../parsers");
      parsers.parseAuthenticator.mockReturnValueOnce({
        rpIdHash: "o3mm9u6vuaVeN4wRgDTidR5oL6ufLTCrE9ISVYbOGUc=",
        aaguid: "test_aaguid",
        flags: { userPresent: true, userVerified: false },
      });

      await expect(
        server.verifyRegistration(registrationJson as any, { ...expected, userVerified: true })
      ).rejects.toThrow("User verification required but not satisfied.");
    });

    test("throws error if RpIdHash does not match", async () => {
      // Override parseAuthenticator mock for this test
      const parsers = require("../parsers");
      parsers.parseAuthenticator.mockReturnValueOnce({
        rpIdHash: "wrong hash",
        aaguid: "test_aaguid",
      });

      await expect(
        server.verifyRegistration(registrationJson as any, expected)
      ).rejects.toThrow(
        "Unexpected RpIdHash: wrong hash vs o3mm9u6vuaVeN4wRgDTidR5oL6ufLTCrE9ISVYbOGUc="
      );
    });

    test("throws error if aaguid is missing", async () => {
      // Override parseAuthenticator mock for this test
      const parsers = require("../parsers");
      parsers.parseAuthenticator.mockReturnValueOnce({
        rpIdHash: "o3mm9u6vuaVeN4wRgDTidR5oL6ufLTCrE9ISVYbOGUc=",
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
        origin: expected.origin,
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

      // The RpIdHash is checked first, so pin the domain to reach the origin check
      await expect(
        server.verifyRegistration(registrationJson as any, { ...fnExpected, domain: "example.com" })
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

  describe("verifySignature()", () => {
    // ES256 signatures are DER encoded, where r and s are minimal-length integers:
    // 31 bytes (or fewer) when the leading byte is zero, 33 bytes (0x00-prefixed) when the high bit is set.
    // All signatures below are valid, signed with the same P-256 key over the same data.
    const params = {
      algorithm: "ES256" as NamedAlgo,
      publicKey:
        "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEikJE02ztBCLY1jQZu1BfvgC3f7ztGdbqqtCgd4cWAsZgiAnimD9Eqvag4IGBS9vKctrisYf__v_RvbMdRZi2IA",
      authenticatorData: "TLJc9NjRHzDsGc5RtQhaBte1ZRMMAxWWgAKAqY5nYt6-K-_k0Q",
      clientData:
        "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoidGVzdCIsIm9yaWdpbiI6Imh0dHBzOi8vZXhhbXBsZS5jb20ifQ",
    };

    const signatures = {
      "32 byte r, 32 byte s":
        "MEQCIHC9KqOAYzkAs9r0_EWaxMBkKDhEDWSx5dkm6170KQfUAiB2hLzSQSrkDuVdHtXaZYTWwh7OduloIeraLbUOptt_EA",
      "33 byte r, 32 byte s":
        "MEUCIQDjv4BelGKGh1LBM5lf6WEir7LLDykiMEtaUs4S0mqFngIgPWTrocZMtE5tAj2o11s-Ku1Xrxr06oUtT_06vVIHwYg",
      "32 byte r, 33 byte s":
        "MEUCIDVv7PNxG8lHD5bnxziiwYEkaY_5LIrDGW2HGeMzjDDFAiEAwvtuzOKF5uMszzUnbXHSwGZrkDFFNBcbp-heJ6u-Duc",
      "31 byte r, 32 byte s":
        "MEMCHzNibgGGQhgGIAeJOXvhymZ5cO0k919ojSOh-mO3arwCIGK2UDreq0_tTzMLZBrlQ0Vm-BSP-lm8xbfbNdrt5QVe",
      "32 byte r, 31 byte s":
        "MEMCIEVk4zw8DYTuiXKFwIL8-94STcU8LZYWWtRG68IlP7CpAh9bI01AODNJe8YW-E6OKTEXejCw0ZYNcaPt6xD0zquc",
      "31 byte r, 33 byte s":
        "MEQCH20qCSycXZ9Ykhc4qoNiJVjnistgqOVLrjwL3Itg2RYCIQDjctN_fyHfEkjC6baKXilSgLkjZYRlrhe0Rtwl_9o6eA",
      "33 byte r, 31 byte s":
        "MEQCIQCKtRuiHUVWp9CoIRw0f1kTxQ3pNy4uXOQ9wv5RoOLlMAIfL89zz_Imi0J9FKflqx5cu0JMkHXy1j8IwavHXm8Neg",
    };

    function modifyBytes(signature: string, modify: (bytes: Uint8Array) => void): string {
      const bytes = new Uint8Array(utils.parseBase64url(signature));
      modify(bytes);
      return utils.toBase64url(bytes.buffer);
    }

    function reencode(signature: string, modify: (r: Uint8Array, s: Uint8Array) => Uint8Array[]): string {
      const bytes = new Uint8Array(utils.parseBase64url(signature));
      const rLength = bytes[3];
      const [r, s] = modify(bytes.slice(4, 4 + rLength), bytes.slice(6 + rLength));
      const sequence = [0x02, r.length, ...r, 0x02, s.length, ...s];
      return utils.toBase64url(new Uint8Array([0x30, sequence.length, ...sequence]).buffer);
    }

    // The same signatures with r or s encoded non-canonically, so they would verify if normalized to raw format
    const prefixZero = (integer: Uint8Array) => new Uint8Array([0, ...integer]);
    const nonCanonicalSignatures = {
      "r missing its 0x00 sign byte": reencode(signatures["33 byte r, 32 byte s"], (r, s) => [r.slice(1), s]),
      "s missing its 0x00 sign byte": reencode(signatures["32 byte r, 33 byte s"], (r, s) => [r, s.slice(1)]),
      "a redundant 0x00 before r": reencode(signatures["32 byte r, 32 byte s"], (r, s) => [prefixZero(r), s]),
      "a redundant 0x00 before s": reencode(signatures["32 byte r, 32 byte s"], (r, s) => [r, prefixZero(s)]),
      "a redundant 0x00 before a 31 byte r": reencode(signatures["31 byte r, 32 byte s"], (r, s) => [prefixZero(r), s]),
    };

    test.each(Object.entries(signatures))(
      "accepts a valid ES256 signature with %s",
      async (_shape, signature) => {
        expect(await server.verifySignature({ ...params, signature })).toBe(true);
      }
    );

    async function signWithNewKey() {
      const { publicKey, privateKey } = await crypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"]
      );
      const clientHash = await utils.sha256(utils.parseBase64url(params.clientData));
      const data = utils.concatenateBuffers(utils.parseBase64url(params.authenticatorData), clientHash);
      const raw = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, data));

      const toDERInteger = (bytes: Uint8Array) => {
        let start = 0;
        while (start < bytes.length - 1 && bytes[start] === 0) start++;
        const trimmed = bytes.slice(start);
        const integer = trimmed[0] & 0x80 ? [0, ...trimmed] : [...trimmed];
        return [0x02, integer.length, ...integer];
      };
      const sequence = [...toDERInteger(raw.slice(0, 32)), ...toDERInteger(raw.slice(32))];
      return {
        signature: utils.toBase64url(new Uint8Array([0x30, sequence.length, ...sequence]).buffer),
        publicKey: utils.toBase64url(await crypto.subtle.exportKey("spki", publicKey)),
      };
    }

    test("accepts a freshly generated ES256 signature with the matching key", async () => {
      const { signature, publicKey } = await signWithNewKey();

      expect(await server.verifySignature({ ...params, publicKey, signature })).toBe(true);
    });

    test("rejects a valid ES256 signature checked against the wrong key", async () => {
      const { signature } = await signWithNewKey();

      // params.publicKey did not create this signature
      expect(await server.verifySignature({ ...params, signature })).toBe(false);
    });

    test("rejects a tampered ES256 signature", async () => {
      const signature = modifyBytes(signatures["32 byte r, 32 byte s"], (bytes) => {
        bytes[bytes.length - 1] ^= 0x01;
      });

      expect(await server.verifySignature({ ...params, signature })).toBe(false);
    });

    test("rejects an ES256 signature that is not a DER sequence", async () => {
      const signature = modifyBytes(signatures["32 byte r, 32 byte s"], (bytes) => {
        bytes[0] = 0x31;
      });

      expect(await server.verifySignature({ ...params, signature })).toBe(false);
    });

    test("rejects an all-zero ES256 signature", async () => {
      const signature = utils.toBase64url(new Uint8Array(64).buffer);

      expect(await server.verifySignature({ ...params, signature })).toBe(false);
    });

    test("rejects an ES256 signature with trailing bytes", async () => {
      const bytes = new Uint8Array([...new Uint8Array(utils.parseBase64url(signatures["32 byte r, 32 byte s"])), 0]);
      bytes[1] += 1;
      const signature = utils.toBase64url(bytes.buffer);

      expect(await server.verifySignature({ ...params, signature })).toBe(false);
    });

    test.each(Object.entries(nonCanonicalSignatures))(
      "rejects an ES256 signature with %s",
      async (_shape, signature) => {
        expect(await server.verifySignature({ ...params, signature })).toBe(false);
      }
    );

    test("rejects an ES256 signature with an r longer than 32 bytes", async () => {
      const signature = reencode(signatures["33 byte r, 32 byte s"], (r, s) => [new Uint8Array([...r, 0]), s]);

      expect(await server.verifySignature({ ...params, signature })).toBe(false);
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
