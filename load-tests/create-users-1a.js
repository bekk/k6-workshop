import http from 'k6/http'
import { sleep } from 'k6'

import { randInt } from './utils.js'

const BASE_URL = 'http://localhost:3000'

export default function() {
  const username = `user-1a-${randInt(0, 1000000000)}`;
  const email = `${username}@test.no`

  http.post(`${BASE_URL}/users`, JSON.stringify({
    username: username,
    email: email
  }), { 
    headers: { 'Content-Type': 'application/json' },
  })

  sleep(1)
} 
