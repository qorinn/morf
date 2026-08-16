import assert from "node:assert/strict";
import test from "node:test";

import { isPrivateNetworkAddress } from "./private-network.ts";

test("privát IPv4-tartományokat privátnak jelöli", () => {
  assert.equal(isPrivateNetworkAddress("127.0.0.1"), true);
  assert.equal(isPrivateNetworkAddress("10.1.2.3"), true);
  assert.equal(isPrivateNetworkAddress("172.16.0.5"), true);
  assert.equal(isPrivateNetworkAddress("172.31.255.255"), true);
  assert.equal(isPrivateNetworkAddress("192.168.1.1"), true);
  assert.equal(isPrivateNetworkAddress("169.254.169.254"), true); // felhő metadata
  assert.equal(isPrivateNetworkAddress("100.64.0.1"), true);
  assert.equal(isPrivateNetworkAddress("0.0.0.0"), true);
});

test("publikus IPv4-címeket nem jelöli privátnak", () => {
  assert.equal(isPrivateNetworkAddress("8.8.8.8"), false);
  assert.equal(isPrivateNetworkAddress("1.1.1.1"), false);
  assert.equal(isPrivateNetworkAddress("172.15.255.255"), false);
  assert.equal(isPrivateNetworkAddress("172.32.0.0"), false);
});

test("privát IPv6-tartományokat privátnak jelöli", () => {
  assert.equal(isPrivateNetworkAddress("::1"), true);
  assert.equal(isPrivateNetworkAddress("fe80::1"), true);
  assert.equal(isPrivateNetworkAddress("fc00::1"), true);
  assert.equal(isPrivateNetworkAddress("fd12:3456::1"), true);
  assert.equal(isPrivateNetworkAddress("::ffff:127.0.0.1"), true);
  assert.equal(isPrivateNetworkAddress("::ffff:10.0.0.1"), true);
});

test("publikus IPv6-címeket nem jelöli privátnak", () => {
  assert.equal(isPrivateNetworkAddress("2001:4860:4860::8888"), false);
  assert.equal(isPrivateNetworkAddress("::ffff:8.8.8.8"), false);
});
