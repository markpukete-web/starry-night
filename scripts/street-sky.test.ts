import assert from 'node:assert/strict'
import test from 'node:test'
import { Quaternion, Vector3 } from 'three'
import { skyTransform, type SkyAnchor } from '../src/scene/skyAnchor.ts'

// Seeded pseudorandom number generator for deterministic test poses
function sfc32(a: number, b: number, c: number, d: number) {
  return () => {
    a |= 0; b |= 0; c |= 0; d |= 0
    const t = (((a + b) | 0) + d) | 0
    d = (d + 1) | 0
    a = b ^ (b >>> 9)
    b = (c + (c << 3)) | 0
    c = (c << 21) | (c >>> 11)
    c = (c + t) | 0
    return (t >>> 0) / 4294967296
  }
}

test('no anchor is today\'s transform', () => {
  const prng = sfc32(0x5ca1e, 0x1a7c4, 0x3b8d1, 0x9f0e2)

  // 5 seeded camera poses
  for (let i = 0; i < 5; i++) {
    // Generate camera position
    const camPos = new Vector3(
      (prng() - 0.5) * 10,
      (prng() - 0.5) * 10,
      (prng() - 0.5) * 10,
    )

    // Generate random unit quaternion for camera
    const u1 = prng(), u2 = prng(), u3 = prng()
    const camQ = new Quaternion(
      Math.sqrt(1 - u1) * Math.sin(2 * Math.PI * u2),
      Math.sqrt(1 - u1) * Math.cos(2 * Math.PI * u2),
      Math.sqrt(u1) * Math.sin(2 * Math.PI * u3),
      Math.sqrt(u1) * Math.cos(2 * Math.PI * u3),
    ).normalize()

    // Generate random homeInverse quaternion
    const v1 = prng(), v2 = prng(), v3 = prng()
    const homeInv = new Quaternion(
      Math.sqrt(1 - v1) * Math.sin(2 * Math.PI * v2),
      Math.sqrt(1 - v1) * Math.cos(2 * Math.PI * v2),
      Math.sqrt(v1) * Math.sin(2 * Math.PI * v3),
      Math.sqrt(v1) * Math.cos(2 * Math.PI * v3),
    ).normalize()

    // Call skyTransform with undefined anchor
    const resNoAnchor = skyTransform(camQ, camPos, homeInv)
    const expectedQ = camQ.clone().multiply(homeInv)

    // Assert position is at origin (not camPos)
    assert.equal(resNoAnchor.position.x, 0, `pose ${i}: position.x is 0`)
    assert.equal(resNoAnchor.position.y, 0, `pose ${i}: position.y is 0`)
    assert.equal(resNoAnchor.position.z, 0, `pose ${i}: position.z is 0`)

    // Assert exact equality with camera × homeInverse
    assert.equal(resNoAnchor.quaternion.x, expectedQ.x, `pose ${i}: quaternion.x`)
    assert.equal(resNoAnchor.quaternion.y, expectedQ.y, `pose ${i}: quaternion.y`)
    assert.equal(resNoAnchor.quaternion.z, expectedQ.z, `pose ${i}: quaternion.z`)
    assert.equal(resNoAnchor.quaternion.w, expectedQ.w, `pose ${i}: quaternion.w`)

    // Arguments must not be mutated
    assert.notEqual(resNoAnchor.position, camPos, 'camPos not mutated or returned directly')
    assert.notEqual(resNoAnchor.quaternion, camQ, 'camQ not mutated or returned directly')
  }
})

test('follow tracks the camera', () => {
  const camPos = new Vector3(1.23, -4.56, 7.89)
  const camQ = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 0.5)
  const homeInv = new Quaternion().identity()

  const anchorFollow: SkyAnchor = { follow: true, worldFixed: false }
  const resFollow = skyTransform(camQ, camPos, homeInv, anchorFollow)

  assert.equal(resFollow.position.x, 1.23, 'follow: position.x matches camera')
  assert.equal(resFollow.position.y, -4.56, 'follow: position.y matches camera')
  assert.equal(resFollow.position.z, 7.89, 'follow: position.z matches camera')
  assert.notEqual(resFollow.position, camPos, 'returns a clone, not original reference')

  const anchorNoFollow: SkyAnchor = { follow: false, worldFixed: false }
  const resNoFollow = skyTransform(camQ, camPos, homeInv, anchorNoFollow)
  assert.equal(resNoFollow.position.x, 0, 'no follow: position.x is 0')
  assert.equal(resNoFollow.position.y, 0, 'no follow: position.y is 0')
  assert.equal(resNoFollow.position.z, 0, 'no follow: position.z is 0')
})

test('worldFixed ignores the camera\'s turn', () => {
  const camPos = new Vector3(0, 0, 0)
  const camQ = new Quaternion().setFromAxisAngle(new Vector3(1, 1, 0).normalize(), 1.2)
  const homeInv = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 0.7)

  const anchorWorldFixed: SkyAnchor = { follow: false, worldFixed: true }
  const resWorldFixed = skyTransform(camQ, camPos, homeInv, anchorWorldFixed)

  const identity = new Quaternion()
  assert.equal(resWorldFixed.quaternion.x, identity.x, 'worldFixed: quat x is identity')
  assert.equal(resWorldFixed.quaternion.y, identity.y, 'worldFixed: quat y is identity')
  assert.equal(resWorldFixed.quaternion.z, identity.z, 'worldFixed: quat z is identity')
  assert.equal(resWorldFixed.quaternion.w, identity.w, 'worldFixed: quat w is identity')

  const anchorTurnLock: SkyAnchor = { follow: false, worldFixed: false }
  const resTurnLock = skyTransform(camQ, camPos, homeInv, anchorTurnLock)
  const expectedQ = camQ.clone().multiply(homeInv)
  assert.equal(resTurnLock.quaternion.x, expectedQ.x, 'turnLock: quat x matches camera × homeInv')
  assert.equal(resTurnLock.quaternion.y, expectedQ.y, 'turnLock: quat y matches camera × homeInv')
  assert.equal(resTurnLock.quaternion.z, expectedQ.z, 'turnLock: quat z matches camera × homeInv')
  assert.equal(resTurnLock.quaternion.w, expectedQ.w, 'turnLock: quat w matches camera × homeInv')
})
