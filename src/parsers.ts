import * as authenticators from './authenticators'
import * as utils from './utils'

const utf8Decoder = new TextDecoder('utf-8')

export function parseClientBuffer(buffer :ArrayBuffer) {
    return JSON.parse(utf8Decoder.decode(buffer))
}


export function parseAuthenticatorBuffer(buffer :ArrayBuffer) {
    return authenticators.parseAuthBuffer(buffer)
}


export function parseAttestationBuffer(buffer :ArrayBuffer) {
    return 'Really complex to parse. Good luck with that one!'
}

export function parseClientBase64(txt :string) {
    return parseClientBuffer( utils.parseBase64url(txt) )
}


export function parseAuthenticatorBase64(txt :string) {
    return parseAuthenticatorBuffer( utils.parseBase64url(txt) )
}
