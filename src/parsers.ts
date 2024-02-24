import * as authenticators from './authenticators.js'
import * as utils from './utils.js'
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
    //if(typeof data == 'string')
    //    data = utils.parseBase64url(data)
    // Useless comment, let's at least provide the raw value 
    // return "The device attestation proves the authenticity of the device model / aaguid. It's not guaranteed to be included and really complex to parse / verify. Good luck with that one!"
    return data;
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