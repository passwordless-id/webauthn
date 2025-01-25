import { NamedAlgo } from "../types";
import {
  toBuffer,
  parseBuffer,
  isBase64url,
  toBase64url,
  parseBase64url,
  sha256,
  bufferToHex,
  concatenateBuffers,
  parseCryptoKey,
  verifySignature,
} from "../utils";

const ES256_SPKI_KEY =
  "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEol4zrYnJVbFPkOCqeWV5NCPnmzyfC-l0xsDQDIxBsA0RvfMi_KLqC7ksZyMXHqspq37pGPOxBwmhY3h6DGYrKQ";

describe("Encoding/Decoding utils", () => {
  test("toBuffer & parseBuffer", () => {
    const text = "Hello, world!";
    const buf = toBuffer(text);
    expect(buf).toBeInstanceOf(ArrayBuffer);

    const parsed = parseBuffer(buf);
    expect(parsed).toBe(text);
  });

  test("isBase64url", () => {
    // Valid base64url examples
    expect(isBase64url("abcABC123_-")).toBe(true);
    expect(isBase64url("abcABC123_-=")).toBe(true);
    // Invalid base64url (has + and /)
    expect(isBase64url("abc+/123")).toBe(false);
  });

  test("toBase64url & parseBase64url", () => {
    const text = "Hello, world!";
    const buf = toBuffer(text);

    const base64url = toBase64url(buf);
    // Ensure we have no '+' or '/' in the encoded string
    expect(base64url).not.toMatch(/[+/]/);

    const decodedBuf = parseBase64url(base64url);
    const decodedText = parseBuffer(decodedBuf);
    expect(decodedText).toBe(text);
  });

  test("sha256", async () => {
    const data = toBuffer("Hello");
    const digest = await sha256(data);
    expect(digest).toBeInstanceOf(ArrayBuffer);
    // SHA-256 digest is always 32 bytes
    expect(digest.byteLength).toBe(32);
  });

  test("bufferToHex", () => {
    const data = new Uint8Array([0, 1, 2, 255]).buffer;
    expect(bufferToHex(data)).toBe("000102ff");
  });

  test("concatenateBuffers", () => {
    const buf1 = toBuffer("Hello ");
    const buf2 = toBuffer("World");
    const combined = concatenateBuffers(buf1, buf2);
    expect(parseBuffer(combined)).toBe("Hello World");
  });

  describe("parseCryptoKey()", () => {
    test("throws on unsupported algorithm", async () => {
      await expect(parseCryptoKey("FOO" as any, "SOME_KEY")).rejects.toThrow(
        "Unknown or unsupported crypto algorithm: FOO. Only 'RS256' and 'ES256' are supported."
      );
    });

    test("imports ES256 key", async () => {
      const result = await parseCryptoKey("ES256", ES256_SPKI_KEY);

      // Expect a CryptoKey object
      expect(result).toBeDefined();
      expect(result.type).toBe("public");
      expect(result.algorithm).toBeDefined();
      expect(result.usages).toContain("verify");
    });
  });

  describe("verifySignature()", () => {
    test("returns true for valid signature", async () => {
      jest.spyOn(global.crypto.subtle, "verify").mockResolvedValueOnce(true);

      // spy on console.debug
      const debugSpy = jest.spyOn(console, "debug");

      const params = {
        algorithm: "ES256" as NamedAlgo,
        publicKey: ES256_SPKI_KEY,
        authenticatorData: "FAKE_AUTH_DATA",
        clientData: "FAKE_CLIENT_DATA",
        signature: "FAKE_SIGNATURE",
        verbose: true,
      };

      const result = await verifySignature(params);
      expect(result).toBe(true);
      expect(debugSpy).toHaveBeenCalledTimes(5);
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
        ["Data: FAKE_AUTH_DATMTf4DoKP8RlZmw-3HUKDfA83kIeG7pCNKTwDQDRoLGo"],
        ["Signature: FAKE_SIGNATURE"],
      ]);
    });

    test("returns false for invalid signature", async () => {
      jest.spyOn(global.crypto.subtle, "verify").mockResolvedValueOnce(false);

      const params = {
        algorithm: "ES256" as NamedAlgo,
        publicKey: ES256_SPKI_KEY,
        authenticatorData: "FAKE_AUTH_DATA",
        clientData: "FAKE_CLIENT_DATA",
        signature: "FAKE_SIGNATURE",
      };
      const result = await verifySignature(params);
      expect(result).toBe(false);
    });
  });
});
