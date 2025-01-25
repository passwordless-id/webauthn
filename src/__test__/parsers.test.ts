import { parsers } from "../index";
import { AuthenticationJSON, RegistrationJSON } from "../types";

describe("Parsers Tests", () => {
  describe("parseAuthenticator", () => {
    test("Test parseAuthenticator", async () => {
      const res = parsers.parseAuthenticator(
        "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2NFAAAAAAiYcFjK3EuBtuEw3lDcvpYAIN_duB4SXSTMv7L51KME_HqF6zjjujSz_EivOatkT8XVpQECAyYgASFYIIMmKkJlAJg5_Se3UecZfh5cgANEdl1ebIEEZ0hl2y7fIlgg8QqxHQ9SFb75Mk5kQ9esvadwtjuD02dDhf2WA9iYE1Q="
      );
      expect(res).toEqual({
        rpIdHash: "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2M=",
        flags: {
          userPresent: true,
          userVerified: true,
          backupEligibility: false,
          backupState: false,
          attestedData: true,
          extensionsIncluded: false,
        },
        signCount: 0,
        aaguid: "08987058-cadc-4b81-b6e1-30de50dcbe96",
      });
    });
  });

  describe("parseClient", () => {
    test("Test parseClient", async () => {
      const res = parsers.parseClient(
        "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiNTY1MzViMTMtNWQ5My00MTk0LWEyODItZjIzNGMxYzI0NTAwIiwib3JpZ2luIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwIiwiY3Jvc3NPcmlnaW4iOmZhbHNlLCJvdGhlcl9rZXlzX2Nhbl9iZV9hZGRlZF9oZXJlIjoiZG8gbm90IGNvbXBhcmUgY2xpZW50RGF0YUpTT04gYWdhaW5zdCBhIHRlbXBsYXRlLiBTZWUgaHR0cHM6Ly9nb28uZ2wveWFiUGV4In0="
      );
      expect(res).toEqual({
        type: "webauthn.get",
        challenge: "56535b13-5d93-4194-a282-f234c1c24500",
        origin: "http://localhost:8080",
        crossOrigin: false,
        other_keys_can_be_added_here:
          "do not compare clientDataJSON against a template. See https://goo.gl/yabPex",
      });
    });
  });

  describe("getAlgoName", () => {
    test("returns correct name for known COSEAlgorithmIdentifiers", () => {
      expect(parsers.getAlgoName(-7)).toEqual("ES256");
      expect(parsers.getAlgoName(-8)).toEqual("EdDSA");
      expect(parsers.getAlgoName(-257)).toEqual("RS256");
    });

    test("throws on unknown COSEAlgorithmIdentifier", () => {
      expect(() => parsers.getAlgoName(-9999)).toThrow("Unknown algorithm code: -9999");
    });
  });

  describe("parseRegistration & toRegistrationInfo", () => {
    test("parses RegistrationJSON and returns RegistrationInfo", () => {
      // Minimal RegistrationJSON
      const registrationJson: RegistrationJSON = {
        id: "test-credential-id",
        rawId: "test-credential-id",
        response: {
          attestationObject:
            "a363666d74646e6f6e656761747453746d74a06861757468446174615894c46cef82ad1b546477591d008b08759ec3e6d2ecb4f39474bfea6969925d03b75d00000000ea9b8d664d011d213ce4b6b48cb575d40010e0a8a7809da209f821351de031222838a5010203262001215820916481bbe8c51e6314e7535b398e895088cdc06a207f37ac85701ba767c99d03225820b663c6c77c67e680f785e1e150668a196f6789e62208cd1c8c9212fd9c6fd272",
          clientDataJSON:
            "7b2274797065223a22776562617574686e2e637265617465222c226368616c6c656e6765223a22667538596c70623643575a68397444574949555a7751222c226f726967696e223a2268747470733a2f2f64656d6f2e79756269636f2e636f6d222c2263726f73734f726967696e223a66616c73657d",
          authenticatorData:
            "c46cef82ad1b546477591d008b08759ec3e6d2ecb4f39474bfea6969925d03b75d00000000ea9b8d664d011d213ce4b6b48cb575d40010e0a8a7809da209f821351de031222838a5010203262001215820916481bbe8c51e6314e7535b398e895088cdc06a207f37ac85701ba767c99d03225820b663c6c77c67e680f785e1e150668a196f6789e62208cd1c8c9212fd9c6fd272",
          publicKey: "PUBLIC_KEY_EXAMPLE",
          publicKeyAlgorithm: -7, // ES256
          transports: ["usb", "ble"],
        },
        type: "public-key",
        user: {
          id: "user_id_123",
          name: "TestUser",
          displayName: "Test User",
        },
        clientExtensionResults: {
          credProps: {
            rk: true,
          },
        },
      };

      const registrationInfo = parsers.parseRegistration(registrationJson);

      expect(registrationInfo.credential.id).toBe("test-credential-id");
      expect(registrationInfo.credential.algorithm).toBe("ES256");
      expect(registrationInfo.credential.publicKey).toBe("PUBLIC_KEY_EXAMPLE");
      expect(registrationInfo.credential.transports).toEqual(["usb", "ble"]);

      expect(registrationInfo.user?.id).toBe("user_id_123");
      expect(registrationInfo.user?.name).toBe("TestUser");
      expect(registrationInfo.userVerified).toBe(true);
      expect(registrationInfo.authenticator.aaguid).toBe(
        "f79aebde-bdf7-6e5d-d376-fbe5dd34d34d"
      );
    });
  });

  describe("parseAuthentication & toAuthenticationInfo", () => {
    test("parses AuthenticationJSON and returns AuthenticationInfo", () => {
      const authJson: AuthenticationJSON = {
        id: "auth-credential-id",
        rawId: "auth-credential-id",
        response: {
          authenticatorData:
            "c46cef82ad1b546477591d008b08759ec3e6d2ecb4f39474bfea6969925d03b75d00000000ea9b8d664d011d213ce4b6b48cb575d40010e0a8a7809da209f821351de031222838a5010203262001215820916481bbe8c51e6314e7535b398e895088cdc06a207f37ac85701ba767c99d03225820b663c6c77c67e680f785e1e150668a196f6789e62208cd1c8c9212fd9c6fd272",
          clientDataJSON:
            "7b2274797065223a22776562617574686e2e637265617465222c226368616c6c656e6765223a22667538596c70623643575a68397444574949555a7751222c226f726967696e223a2268747470733a2f2f64656d6f2e79756269636f2e636f6d222c2263726f73734f726967696e223a66616c73657d",
          signature: "FAKE_SIGNATURE",
          userHandle: "user_id_456",
        },
        type: "public-key",
        clientExtensionResults: {
          credProps: {
            rk: true,
          },
        },
      };

      const authInfo = parsers.parseAuthentication(authJson);
      expect(authInfo.credentialId).toBe("auth-credential-id");
      expect(authInfo.userId).toBe("user_id_456");
      expect(authInfo.counter).toBe(4153342061);
      expect(authInfo.userVerified).toBe(true);
    });
  });
});
