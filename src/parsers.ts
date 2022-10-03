import * as authenticators from './authenticators'
import * as utils from './utils'

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

export function parseClientBase64(txt :string) {
    return parseClientData( utils.parseBase64url(txt) )
}


export function parseAuthenticatorBase64(txt :string) {
    return parseAuthenticatorData( utils.parseBase64url(txt) )
}
