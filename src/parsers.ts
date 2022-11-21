import * as authenticators from './authenticators'
import * as utils from './utils'
import { AuthenticatorInfo, ClientInfo, RegistrationEncoded, RegistrationParsed, AuthenticationEncoded, AuthenticationParsed } from './types'

const utf8Decoder = new TextDecoder('utf-8')

export function parseClient(data :string|ArrayBuffer) :ClientInfo {
    if(typeof data == 'string')
        data = utils.parseBase64url(data)
    return JSON.parse(utf8Decoder.decode(data))
}


export function parseAuthenticator(data :string|ArrayBuffer) :AuthenticatorInfo {
    if(typeof data == 'string')
        data = utils.parseBase64url(data)
    return authenticators.parseAuthBuffer(data)
}


export function parseAttestation(data :string|ArrayBuffer) :unknown {
    if(typeof data == 'string')
        data = utils.parseBase64url(data)
    return 'Really complex to parse. Good luck with that one!'
}



export function parseRegistration(registration :RegistrationEncoded) :RegistrationParsed {
    return {
        username: registration.username,
        credential: registration.credential,

        client:        parseClient(registration.clientData),
        authenticator: parseAuthenticator(registration.authenticatorData),
        attestation:   registration.attestationData ? parseAttestation(registration.attestationData) : null
    }
}

export function parseAuthentication(authentication :AuthenticationEncoded) :AuthenticationParsed {
    return {
        credentialId:  authentication.credentialId,
        client:        parseClient(authentication.clientData),
        authenticator: parseAuthenticator(authentication.authenticatorData),
        signature: authentication.signature
    }
}