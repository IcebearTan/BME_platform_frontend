import {test} from 'node:test'
import assert from 'node:assert/strict'
import {webcrypto} from 'node:crypto'
import {createRequestKey} from '../packages/api/requestKey.js'

function withCrypto(value, check) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  Object.defineProperty(globalThis, 'crypto', {configurable: true, value})
  try { check() } finally {
    if (original) Object.defineProperty(globalThis, 'crypto', original)
    else delete globalThis.crypto
  }
}

test('HTTP可用的随机数接口能够独立生成请求键', () => {
  withCrypto({getRandomValues: webcrypto.getRandomValues.bind(webcrypto)}, () => {
    const keys = Array.from({length: 200}, createRequestKey)
    assert.equal(new Set(keys).size, keys.length)
    assert(keys.every(key => key.length > 10 && key.length <= 128))
  })
})

test('缺少Crypto时仍能使用，时钟和随机数重复也不产生同页重复请求键', t => {
  t.mock.method(Date, 'now', () => 1000000)
  t.mock.method(Math, 'random', () => 0)
  withCrypto(undefined, () => {
    const keys = Array.from({length: 200}, createRequestKey)
    assert.equal(new Set(keys).size, keys.length)
    assert(keys.every(key => key.length > 10 && key.length <= 128))
  })
})
