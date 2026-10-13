import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dueNotifications, nextNotificationTime, validNotificationInterval } from '../src/notification-timing.js'
test('notification timers enforce per-breach cooldowns across refresh and recovery', () => {
  const alerts=[{key:'a'},{key:'b'}], time=1000000, saved={a:time,b:time+60000}
  assert.deepEqual(dueNotifications(alerts,saved,time+179999,3),[])
  assert.deepEqual(dueNotifications(alerts,JSON.parse(JSON.stringify(saved)),time+180000,3),[{key:'a'}])
  assert.equal(nextNotificationTime(alerts,saved,time+120000,3),time+180000)
  assert.equal(nextNotificationTime([],saved,time+120000,3),null)
  assert.deepEqual(dueNotifications([{key:'new'}],saved,time,3),[{key:'new'}])
  assert.deepEqual(dueNotifications(alerts,saved,time+180000,5),[])
  assert.equal(validNotificationInterval(3),true)
  for (const value of [0,61,1.5,NaN,'3']) assert.equal(validNotificationInterval(value),false)
})
