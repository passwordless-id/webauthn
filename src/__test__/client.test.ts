/**
 * @jest-environment jsdom
 */

import * as client from "../client";

describe("client.ts tests", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("isAvailable()", () => {
    test("returns true if window.PublicKeyCredential is defined", () => {
      expect(client.isAvailable()).toBe(true);
    });

    test("returns false if window.PublicKeyCredential is not defined", () => {
      const original = window.PublicKeyCredential;
      // @ts-ignore
      window.PublicKeyCredential = undefined;

      expect(client.isAvailable()).toBe(false);

      // Restore
      window.PublicKeyCredential = original;
    });
  });

  describe("isLocalAuthenticator()", () => {
    test("returns the result of isUserVerifyingPlatformAuthenticatorAvailable()", async () => {
      (
        global.mockIsUserVerifyingPlatformAuthenticatorAvailable as jest.Mock
      ).mockResolvedValueOnce(true);
      await expect(client.isLocalAuthenticator()).resolves.toBe(true);

      (
        global.mockIsUserVerifyingPlatformAuthenticatorAvailable as jest.Mock
      ).mockResolvedValueOnce(false);
      await expect(client.isLocalAuthenticator()).resolves.toBe(false);
    });
  });

  describe("isAutocompleteAvailable()", () => {
    test("returns true if isConditionalMediationAvailable() = true", async () => {
      (global.mockIsConditionalMediationAvailable as jest.Mock).mockResolvedValueOnce(
        true
      );
      await expect(client.isAutocompleteAvailable()).resolves.toBe(true);
    });

    test("returns false if isConditionalMediationAvailable() = false", async () => {
      (global.mockIsConditionalMediationAvailable as jest.Mock).mockResolvedValueOnce(
        false
      );
      await expect(client.isAutocompleteAvailable()).resolves.toBe(false);
    });
  });

  describe("register()", () => {
    test("throws error if challenge is missing", async () => {
      await expect(
        client.register({
          // no challenge
          user: "Paul",
        } as any)
      ).rejects.toThrow('"challenge" required');
    });

    test("throws error if user is missing", async () => {
      await expect(
        client.register({
          challenge: "fake_challenge",
        } as any)
      ).rejects.toThrow('"user" required');
    });

    test("throws error if challenge is not base64url", async () => {
      await expect(
        client.register({
          challenge: "not_base64url!!",
          user: "Paul",
        })
      ).rejects.toThrow("Provided challenge is not properly encoded in Base64url");
    });

    test("throws if raw.type is not public-key", async () => {
      // Mock base64url so it's recognized as valid
      const validChallenge = "bm90LXRydWx5LWJhc2U2NC11cmw";

      (global.mockCreate as jest.Mock).mockResolvedValueOnce({
        type: "unknown",
        id: "mock-cred-id",
        rawId: new Uint8Array([1, 2, 3, 4]).buffer,
      });

      await expect(
        client.register({
          challenge: validChallenge,
          user: { id: "some-user-id", name: "alice" },
        } as any)
      ).rejects.toBe("Unexpected credential type!");
    });

    test("throws if publicKey is not present", async () => {
      // Mock base64url so it's recognized as valid
      const validChallenge = "bm90LXRydWx5LWJhc2U2NC11cmw";

      const mockPublicKey = null;

      (global.mockCreate as jest.Mock).mockResolvedValueOnce({
        type: "public-key",
        id: "mock-cred-id",
        rawId: new Uint8Array([1, 2, 3, 4]).buffer,
        response: {
          getPublicKey: () => mockPublicKey,
          getTransports: () => ["usb", "ble"],
        },
      });

      await expect(
        client.register({
          challenge: validChallenge,
          user: { id: "some-user-id", name: "alice" },
        } as any)
      ).rejects.toBe("Non-compliant browser or authenticator!");
    });

    test("creates a credential and returns a RegistrationJSON object", async () => {
      // Mock base64url so it's recognized as valid
      const validChallenge = "bm90LXRydWx5LWJhc2U2NC11cmw"; // "not-truly-base64-url" in real base64?

      // We'll mock `navigator.credentials.create(...)`.
      // This must return a `PublicKeyCredential` object with the desired shape.
      const mockAttestationObject = new ArrayBuffer(8); // dummy
      const mockClientDataJSON = new ArrayBuffer(8);
      const mockAuthenticatorData = new ArrayBuffer(8);
      const mockPublicKey = new ArrayBuffer(8);

      (global.mockCreate as jest.Mock).mockResolvedValueOnce({
        type: "public-key",
        id: "mock-cred-id",
        rawId: new Uint8Array([1, 2, 3, 4]).buffer,
        authenticatorAttachment: "platform",
        getClientExtensionResults: () => ({}),
        response: {
          attestationObject: mockAttestationObject,
          clientDataJSON: mockClientDataJSON,
          getAuthenticatorData: () => mockAuthenticatorData,
          getPublicKey: () => mockPublicKey,
          getPublicKeyAlgorithm: () => -7,
          getTransports: () => ["usb", "ble"],
        },
      });

      // spy on debug
      const consoleDebugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});

      const result = await client.register({
        challenge: validChallenge,
        hints: ["client-device", "hybrid"],
        user: { id: "some-user-id", name: "alice" },
      });

      expect(global.mockCreate as jest.Mock).toHaveBeenCalledTimes(1);
      expect(result.type).toBe("public-key");
      expect(result.id).toBe("mock-cred-id");
      expect(result.rawId).toBeDefined();
      expect(result.authenticatorAttachment).toBe("platform");
      expect(result.user?.id).toBe("some-user-id");
      expect(result.response.attestationObject).toBeTruthy(); // base64url-encoded
      expect(result.response.publicKeyAlgorithm).toBe(-7);
      expect(result.response.transports).toEqual(["usb", "ble"]);

      // Clean up
      consoleDebugSpy.mockRestore();
    });

    test("auto-assigns a user.id if not provided", async () => {
      const validChallenge = "bmFub3RoZXItY2hhbGxlbmdl"; // fake
      (global.mockCreate as jest.Mock).mockResolvedValueOnce({
        type: "public-key",
        id: "mock-cred-id",
        rawId: new Uint8Array().buffer,
        getClientExtensionResults: () => ({}),
        response: {
          attestationObject: new ArrayBuffer(0),
          clientDataJSON: new ArrayBuffer(0),
          getAuthenticatorData: () => new ArrayBuffer(0),
          getPublicKey: () => new ArrayBuffer(0),
          getPublicKeyAlgorithm: () => -7,
          getTransports: () => [],
        },
      });

      const result = await client.register({
        challenge: validChallenge,
        user: { name: "Paul" },
      });

      // Because user.id was missing, we use crypto.randomUUID():
      expect(result.user?.id).toBe("mock-uuid-1234");
    });

    test("cancels ongoingAuth if set", async () => {
      // This checks that if ongoingAuth is already non-null,
      // the second call to `register()` will abort the first.
      const validChallenge = "dGhpcy1pcy1hLXRlc3QtY2hhbGxlbmdl"; // base64url
      // We'll mock a never-resolving promise for the first call
      let firstResolve;
      const firstPromise = new Promise((resolve) => {
        firstResolve = resolve; // store it to resolve manually
      });

      // The second call will be the real resolved value
      (global.mockCreate as jest.Mock).mockReturnValueOnce(firstPromise);
      (global.mockCreate as jest.Mock).mockResolvedValueOnce({
        type: "public-key",
        id: "second-cred-id",
        rawId: new ArrayBuffer(0),
        getClientExtensionResults: () => ({}),
        response: {
          attestationObject: new ArrayBuffer(0),
          clientDataJSON: new ArrayBuffer(0),
          getAuthenticatorData: () => new ArrayBuffer(0),
          getPublicKey: () => new ArrayBuffer(0),
          getPublicKeyAlgorithm: () => -7,
          getTransports: () => [],
        },
      });

      // Run first call (won't resolve yet)
      client
        .register({
          challenge: validChallenge,
          user: { name: "alice" },
        })
        .catch((e) => {
          // Should be aborted
          expect(e).toBe("AbortError: Cancel ongoing authentication");
        });

      // Second call triggers abort of the first
      const result = await client.register({
        challenge: validChallenge,
        user: { name: "bob" },
      });
      expect(result.id).toBe("second-cred-id");
      // The first call got aborted
    });
  });

  describe("authenticate()", () => {
    test("throws if challenge is not base64url", async () => {
      await expect(
        client.authenticate({
          challenge: "invalid-chars##",
        } as any)
      ).rejects.toThrow("Provided challenge is not properly encoded in Base64url");
    });

    test("throws if passkeys autocomplete is requested but not available", async () => {
      jest
        .spyOn(window.PublicKeyCredential, "isConditionalMediationAvailable")
        .mockResolvedValueOnce(false);
      const validChallenge = "dGhpcy1pcy1hLXRlc3QtY2hhbGxlbmdl";
      await expect(
        client.authenticate({
          challenge: validChallenge,
          autocomplete: true,
        })
      ).rejects.toThrow(
        "Passkeys autocomplete with conditional mediation is not available"
      );
    });

    test("throws if raw.type is not public-key", async () => {
      // Mock base64url so it's recognized as valid
      const validChallenge = "YmFzZTY0dXJsLWNvbXBhdGlibGUK"; // base64url

      (global.mockGet as jest.Mock).mockResolvedValueOnce({
        type: "unknown",
        id: "auth-cred-id",
        rawId: new Uint8Array([1, 2, 3, 4]).buffer,
        authenticatorAttachment: "cross-platform",
      });

      await expect(
        client.authenticate({
          challenge: validChallenge,
          user: { id: "some-user-id", name: "alice" },
        } as any)
      ).rejects.toBe("Unexpected credential type!");
    });

    test("calls navigator.credentials.get and returns AuthenticationJSON", async () => {
      const validChallenge = "YmFzZTY0dXJsLWNvbXBhdGlibGUK"; // base64url
      const mockClientDataJSON = new ArrayBuffer(8);
      const mockAuthenticatorData = new ArrayBuffer(8);
      const mockSignature = new ArrayBuffer(8);
      const mockUserHandle = new Uint8Array([5, 6, 7]).buffer;

      (global.mockGet as jest.Mock).mockResolvedValueOnce({
        type: "public-key",
        id: "auth-cred-id",
        rawId: new Uint8Array([9, 8, 7, 6]).buffer,
        authenticatorAttachment: "cross-platform",
        getClientExtensionResults: () => ({ demo: "test" }),
        response: {
          authenticatorData: mockAuthenticatorData,
          clientDataJSON: mockClientDataJSON,
          signature: mockSignature,
          userHandle: mockUserHandle,
        },
      });

      const result = await client.authenticate({
        challenge: validChallenge,
        allowCredentials: [
          {
            id: "e0a8a7809da209f821351de031222838",
            transports: [],
          },
        ],
      });

      expect(global.mockGet as jest.Mock).toHaveBeenCalledTimes(1);
      expect(result.id).toBe("auth-cred-id");
      expect(result.rawId).toBeTruthy(); // base64url
      expect(result.authenticatorAttachment).toBe("cross-platform");
      expect(result.response.signature).toBeTruthy(); // base64url
      expect(result.response.userHandle).toBeTruthy(); // base64url
      expect(result.clientExtensionResults).toEqual({ demo: "test" });
    });

    test("cancels ongoingAuth if set", async () => {
      // Similar approach as the register test
      const validChallenge = "Z2V0LWNyZWRlbnRpYWw"; // base64url

      let firstResolve;
      const firstPromise = new Promise((resolve) => {
        firstResolve = resolve;
      });

      (global.mockGet as jest.Mock).mockReturnValueOnce(firstPromise); // never resolves
      (global.mockGet as jest.Mock).mockResolvedValueOnce({
        type: "public-key",
        id: "second-auth-id",
        rawId: new ArrayBuffer(0),
        getClientExtensionResults: () => ({}),
        response: {
          authenticatorData: new ArrayBuffer(0),
          clientDataJSON: new ArrayBuffer(0),
          signature: new ArrayBuffer(0),
          userHandle: null,
        },
      });

      client.authenticate({ challenge: validChallenge }).catch((e) => {
        expect(e).toBe("AbortError: Cancel ongoing authentication");
      });

      const result = await client.authenticate({ challenge: validChallenge });
      expect(result.id).toBe("second-auth-id");
    });
  });
});
