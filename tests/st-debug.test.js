import { test } from 'node:test'
import assert from 'node:assert/strict'
import { redactStDebug } from '../shared/st-debug.js'

test('ST diagnostics retain request details and redact nested credentials and echoed secrets', () => {
  const result = redactStDebug({ url: 'https://example.com/api/login', method: 'POST', form: { email: 'admin@example.com', password: 'a"b&c' }, headers: { Authorization: 'Bearer sensitive' }, response: { access_token: 'sensitive', message: 'echo a"b&c and a%22b%26c' } }, ['a"b&c', 'sensitive'])
  assert.equal(result.form.email, 'admin@example.com')
  assert.equal(result.method, 'POST')
  assert.equal(result.form.password, '[redacted]')
  assert.equal(result.headers.Authorization, '[redacted]')
  assert.equal(result.response.access_token, '[redacted]')
  assert.equal(result.response.message, 'echo [redacted] and [redacted]')
})
