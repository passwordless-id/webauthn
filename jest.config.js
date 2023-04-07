/** @type {import('ts-jest').JestConfigWithTsJest} */
//import crypto from 'crypto';
//import { TextDecoder } from 'util';

export default {
  preset: 'ts-jest',
  testEnvironment: 'node', // 'jsdom', //'node',
  moduleDirectories: ["node_modules", "src"],
  resolver: "jest-ts-webcompat-resolver"
  /*
   globals: {
    crypto,
    TextDecoder
  }
  */
};