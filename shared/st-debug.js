export function redactStDebug(value, secrets = []) {
  const json = JSON.stringify(value, (key, item) => /password|token|secret|authorization|cookie/i.test(key) ? '[redacted]' : item)
  let safe = json ?? 'null'
  for (const secret of secrets.filter(Boolean)) {
    for (const variant of [secret, encodeURIComponent(secret), new URLSearchParams({ v: secret }).toString().slice(2)]) {
      // Replace inside the serialized representation, preserving valid JSON.
      safe = safe.split(JSON.stringify(variant).slice(1, -1)).join('[redacted]')
    }
  }
  return JSON.parse(safe)
}
