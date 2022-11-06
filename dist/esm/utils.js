"use strict";
/********************************
     Encoding/Decoding Utils
********************************/
Object.defineProperty(exports, "__esModule", { value: true });
exports.concatenateBuffers = exports.bufferToHex = exports.sha256 = exports.parseBase64url = exports.toBase64url = exports.isBase64url = exports.parseBuffer = exports.toBuffer = void 0;
function toBuffer(txt) {
    return Uint8Array.from(txt, c => c.charCodeAt(0)).buffer;
}
exports.toBuffer = toBuffer;
function parseBuffer(buffer) {
    return String.fromCharCode(...new Uint8Array(buffer));
}
exports.parseBuffer = parseBuffer;
function isBase64url(txt) {
    return txt.match(/^[a-zA-Z0-9\-_]+=*$/) !== null;
}
exports.isBase64url = isBase64url;
function toBase64url(buffer) {
    const txt = btoa(parseBuffer(buffer)); // base64
    return txt.replaceAll('+', '-').replaceAll('/', '_');
}
exports.toBase64url = toBase64url;
function parseBase64url(txt) {
    txt = txt.replaceAll('-', '+').replaceAll('_', '/'); // base64url -> base64
    return toBuffer(atob(txt));
}
exports.parseBase64url = parseBase64url;
async function sha256(buffer) {
    return await crypto.subtle.digest('SHA-256', buffer);
}
exports.sha256 = sha256;
function bufferToHex(buffer) {
    return [...new Uint8Array(buffer)]
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}
exports.bufferToHex = bufferToHex;
function concatenateBuffers(buffer1, buffer2) {
    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp;
}
exports.concatenateBuffers = concatenateBuffers;
;
