// jest.setup.js

if (typeof globalThis.btoa === "undefined") {
  globalThis.btoa = (data) => Buffer.from(data, "binary").toString("base64");
}

if (typeof globalThis.atob === "undefined") {
  globalThis.atob = (data) => Buffer.from(data, "base64").toString("binary");
}

if (typeof globalThis.crypto === "undefined") {
  const { webcrypto } = require("crypto");
  globalThis.crypto = webcrypto;
}
