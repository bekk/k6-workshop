import http from 'k6/http'
import { sleep, check } from 'k6'

import { randInt } from './utils.js'

const BASE_URL = 'http://localhost:3000'

export default function() {
  const username = `user-1b-${randInt(0, 1000000)}`;
  const email = `${username}@test.no`

  const response = http.post(`${BASE_URL}/users`, JSON.stringify({
    username: username,
    email: email
  }), { 
    headers: { 'Content-Type': 'application/json' },
  })

  if (check(response, { '200 OK': (r) => r.status == 200 })) {
    const user = response.json()

    check(user, {
      'username is correct': (u) => u.username == username,
      'email is correct': (u) => u.email == email
    })
  }

  sleep(1)
} 
