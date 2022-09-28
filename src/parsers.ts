import * as authenticators from './authenticators'

const utf8Decoder = new TextDecoder('utf-8')

export function parseClientData(buffer :ArrayBuffer) {
    return JSON.parse(utf8Decoder.decode(buffer))
}


export function parseAuthenticatorData(buffer :ArrayBuffer) {
    return authenticators.parseAuthData(buffer)
}

export function parseAttestationData(buffer :ArrayBuffer) {
    return 'Really complex to parse. Good luck with that one!'
}