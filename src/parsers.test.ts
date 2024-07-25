import {parsers} from './index'

test('Test parseAuthenticator', async () => {
    const res = parsers.parseAuthenticator("SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2NFAAAAAAiYcFjK3EuBtuEw3lDcvpYAIN_duB4SXSTMv7L51KME_HqF6zjjujSz_EivOatkT8XVpQECAyYgASFYIIMmKkJlAJg5_Se3UecZfh5cgANEdl1ebIEEZ0hl2y7fIlgg8QqxHQ9SFb75Mk5kQ9esvadwtjuD02dDhf2WA9iYE1Q=")
    expect(res).toEqual({
        "rpIdHash": "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2M=",
        "flags": {
          "userPresent": true,
          "userVerified": true,
          "backupEligibility": false,
          "backupState": false,
          "attestedData": true,
          "extensionsIncluded": false
        },
        "counter": 0,
        "aaguid": "08987058-cadc-4b81-b6e1-30de50dcbe96",
        "icon_dark": "https://webauthn.passwordless.id/authenticators/08987058-cadc-4b81-b6e1-30de50dcbe96-dark.png",
        "icon_light": "https://webauthn.passwordless.id/authenticators/08987058-cadc-4b81-b6e1-30de50dcbe96-light.png",
        "name": "Windows Hello",
      });
});


test('Test parseClient', async () => {
    const res = parsers.parseClient("eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiNTY1MzViMTMtNWQ5My00MTk0LWEyODItZjIzNGMxYzI0NTAwIiwib3JpZ2luIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwIiwiY3Jvc3NPcmlnaW4iOmZhbHNlLCJvdGhlcl9rZXlzX2Nhbl9iZV9hZGRlZF9oZXJlIjoiZG8gbm90IGNvbXBhcmUgY2xpZW50RGF0YUpTT04gYWdhaW5zdCBhIHRlbXBsYXRlLiBTZWUgaHR0cHM6Ly9nb28uZ2wveWFiUGV4In0=");
    expect(res).toEqual({
        "type": "webauthn.get",
        "challenge": "56535b13-5d93-4194-a282-f234c1c24500",
        "origin": "http://localhost:8080",
        "crossOrigin": false,
        "other_keys_can_be_added_here": "do not compare clientDataJSON against a template. See https://goo.gl/yabPex"
      });
});


test('Test getAlgoName', async () => {
  expect(parsers.getAlgoName(-7)).toEqual("ES256")
  expect(parsers.getAlgoName(-8)).toEqual("EdDSA")
  expect(parsers.getAlgoName(-257)).toEqual("RS256")
})

