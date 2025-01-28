import {
  toBuffer,
  parseBuffer,
  isBase64url,
  toBase64url,
  parseBase64url,
  sha256,
  bufferToHex,
  concatenateBuffers,
} from "../utils";

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
});
