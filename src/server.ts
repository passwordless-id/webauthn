import { parsers } from "./index";
import { parseAuthenticator, parseClient, toAuthenticationInfo } from "./parsers";
import { AuthenticationJSON, RegistrationJSON, RegistrationInfo, AuthenticationInfo, Base64URLString, CollectedClientData, UserInfo, CredentialInfo, AuthenticatorInfo, AuthenticatorParsed } from "./types";
import * as utils from './utils'
import { verifySignature } from "./utils";


export function randomChallenge() {
    const buffer = crypto.getRandomValues(new Uint8Array(18)); // > 128 bits, a multiple of 3 bytes to have base64 encoding without padding
    return utils.toBase64url(buffer);
}



async function isValid(validator :any, value :any) :Promise<boolean> {
   if(typeof validator === 'function') {
        const res = validator(value)
        if(res instanceof Promise)
            return await res
        else
            return res
    }
    // the validator can be a single value too
    return validator === value
}

async function isNotValid(validator :any, value :any) :Promise<boolean> {
    return !(await isValid(validator, value))
}

interface RegistrationChecks {
    challenge: string | Function,
    origin: string | Function
}



export async function verifyRegistration(registrationJson: RegistrationJSON, expected: RegistrationChecks): Promise<RegistrationInfo> {
    const client = parseClient(registrationJson.response.clientDataJSON)
    const authenticator = parseAuthenticator(registrationJson.response.authenticatorData);
    const aaguid = authenticator.aaguid;

    if(!aaguid) // should never happen, worst case should be a fallback to "zeroed" aaguid
        throw new Error("Unexpected error, no AAGUID.")

    if (client.type !== "webauthn.create")
        throw new Error(`Unexpected ClientData type: ${client.type}`)

    if (await isNotValid(expected.origin, client.origin))
        throw new Error(`Unexpected ClientData origin: ${client.origin}`)

    if (await isNotValid(expected.challenge, client.challenge))
        throw new Error(`Unexpected ClientData challenge: ${client.challenge}`)

    return parsers.toRegistrationInfo(registrationJson, authenticator)
}



interface AuthenticationChecks {
    challenge: string | Function,
    origin: string | Function,
    userVerified: boolean,
    counter?: number, // Made optional according to https://github.com/passwordless-id/webauthn/issues/38
    domain ?:string, // Same as `rp.id`
    verbose?: boolean
}



export async function verifyAuthentication(authenticationJson: AuthenticationJSON, credential: CredentialInfo, expected: AuthenticationChecks): Promise<AuthenticationInfo> {
    if (authenticationJson.id !== credential.id)
        throw new Error(`Credential ID mismatch: ${authenticationJson.id} vs ${credential.id}`)

    const isValidSignature: boolean = await verifySignature({
        algorithm: credential.algorithm,
        publicKey: credential.publicKey,
        authenticatorData: authenticationJson.response.authenticatorData,
        clientData: authenticationJson.response.clientDataJSON,
        signature: authenticationJson.response.signature,
        verbose: expected.verbose
    })

    if(!isValidSignature)
        throw new Error(`Invalid signature: ${authenticationJson.response.signature}`)

    const client :CollectedClientData = parseClient(authenticationJson.response.clientDataJSON);
    const authenticator :AuthenticatorParsed = parseAuthenticator(authenticationJson.response.authenticatorData);

    if(expected.verbose) {
        console.debug(client)
        console.debug(authenticator)
    }
    
    if (client.type !== "webauthn.get")
        throw new Error(`Unexpected clientData type: ${client.type}`)

    if (await isNotValid(expected.origin, client.origin))
        throw new Error(`Unexpected ClientData origin: ${client.origin}`)

    if (await isNotValid(expected.challenge, client.challenge))
        throw new Error(`Unexpected ClientData challenge: ${client.challenge}`)

    // this only works because we consider `rp.origin` and `rp.id` to be the same during authentication/registration
    const rpId = expected.domain ?? new URL(client.origin).hostname
    const expectedRpIdHash = utils.toBase64url(await utils.sha256(utils.toBuffer(rpId)))
    if (authenticator.rpIdHash !== expectedRpIdHash)
        throw new Error(`Unexpected RpIdHash: ${authenticator.rpIdHash} vs ${expectedRpIdHash}`)

    if (!authenticator.flags.userPresent)
        throw new Error(`Unexpected authenticator flags: missing userPresent`)

    if (!authenticator.flags.userVerified && expected.userVerified)
        throw new Error(`Unexpected authenticator flags: missing userVerified`)

    if (expected.counter && authenticator.signCount <= expected.counter)
        throw new Error(`Unexpected authenticator counter: ${authenticator.signCount} (should be > ${expected.counter})`)

    return toAuthenticationInfo(authenticationJson, authenticator)
}
