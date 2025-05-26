import "@testing-library/jest-dom";

// Enable automatic mocking
jest.useFakeTimers();
jest.spyOn(global, "setTimeout");
jest.spyOn(global, "clearTimeout");
jest.spyOn(global, "setInterval");
jest.spyOn(global, "clearInterval");

// Mock TextDecoder and TextEncoder
class MockTextDecoder {
  decode(): string {
    return "";
  }
}

class MockTextEncoder {
  encode(): Uint8Array {
    return new Uint8Array();
  }
}

global.TextDecoder = MockTextDecoder as any;
global.TextEncoder = MockTextEncoder as any;

// Mock window.nostr for tests
window.nostr = {
  getPublicKey: jest.fn(),
  signEvent: jest.fn(),
};

// Make sure jest.mock is available in test files
if (typeof jest === "undefined") {
  global.jest = require("@jest/globals").jest;
}
