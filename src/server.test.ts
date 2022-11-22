import { verifyAuthentication, verifySignature } from "./server";

test('Test RS256 signatures', async() => {
    const res = await verifySignature({
        algorithm: 'RS256',
        publicKey: '',
        authenticatorData: '',
        clientData: '',
        signature: ''
    })
  //expect(res)
});
