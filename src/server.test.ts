import { verifyAuthentication, verifySignature } from "./server";

test('Test RS256 signatures', async() => {
    const res = await verifySignature({
        algorithm: 'RS256',
        publicKey: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzXUir6UgELFeM9il6id2vgZ1sWbZTk4C5JLIiMpg7lywwTRdp0i+lPP9rEdzcmwKwRLh5QT8DlPFQuKrUc8eXb9r+RPq/CvVOxVCqdK6A9fg0PDnvA3k7c5Ax5V5n/HcSw/uXVAzwstxQsbV5pOk0JDtys7rKiPjdO+XH5TbANNJE7PsS5j90zHLKNQaSybgF8V0v4Oz4I9u7IjVQKEz2V56E4Qfj/D7g0PCu63M5mNz5bGsmUzg5XwSRIaG3J3kDTuyTTGjPYhTnYFyWYXuMu1ZQ7JCe5FUv9m4oj3jH33VQEW3sorea7UOBjnSsLWp8MyE08M4tlY2xgyFL59obQIDAQAB",
        authenticatorData: "SZYN5YgOjGh0NBcPZHZgW4/krrmihjLHmVzzuoMdl2MFAAAAAQ==",
        clientData: "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiWmpreE5URTBZVGN0TkRKa015MDBOMlU0TFdFME1HTXRZVFEyTkdRNVlqTmpNVGN3Iiwib3JpZ2luIjoiaHR0cDovL2xvY2FsaG9zdDo2MzM0MiIsImNyb3NzT3JpZ2luIjpmYWxzZSwib3RoZXJfa2V5c19jYW5fYmVfYWRkZWRfaGVyZSI6ImRvIG5vdCBjb21wYXJlIGNsaWVudERhdGFKU09OIGFnYWluc3QgYSB0ZW1wbGF0ZS4gU2VlIGh0dHBzOi8vZ29vLmdsL3lhYlBleCJ9",
        signature: "E/XchoqDlSOanozr0o03DN++EEz5qVymtgiaLbepoysxgdxAz/uH/34wt7/YrUs7ESaH/3ni3/0mk71WRc9SP9GMRNYqKSeZkwAM+ZHMc7e3OEpOETWIBCO+aOKmKPflB/nVzXocNUHnhW/aw5UAOhU43qjjy1X9+5+t+60C6RyGaDXTz6Mk6rmgX3z21M8pOFw8VAAtUojX6ab+Lh48SaMN1Z2BK8Exh//pFjveMVngx4yuYRm6Tu7irRvGZVe7Wnii6GNUz56kT2Q4Fc8hR28c3+qufKWuaHLJUnsw6GILQNxemDzirlKBhXFjz7Ht7tyGaqUwFZr9q+93j/95Ag=="
    })
    expect(res).toBe(true)
});



test('Test ES256 signatures', async() => {
  const res = await verifySignature({
      algorithm: 'ES256',
      publicKey: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEWyyMt1l16_1rzDP63Ayw9EFpn1VbSt4NSJ7BOsDzqed5Z3aTfQSvzPBPHb4uYQuuckOKRbdoH9S0fEnSvNxpRg==",
      authenticatorData: "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2MFAAAAAQ==",
      clientData: "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiMjRkMjI0ZDMtMWQwZi00MzAxLTg3NTktMzk4ODcwNTg1ZTU1Iiwib3JpZ2luIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwIiwiY3Jvc3NPcmlnaW4iOmZhbHNlfQ==",
      signature: "MEYCIQDgSy1brw1UVCT4kzaZIiiihNuC7KvV2vm3gO5f1CSscQIhAM6-MihKO2jnF_BHeEJMYZ7jN-kz9TuWqYwJJzm4fOcl"
  })
  expect(res).toBe(true)
});
