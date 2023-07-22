import http from 'k6/http'
import { sleep, check } from 'k6'

import { randInt } from './utils.js'

const BASE_URL = 'http://localhost:3000'

export default function() {
  const username = `user-1d-${randInt(0, 10)}`;
  const email = `${username}@test.no`

  const response = http.post(`${BASE_URL}/users`, JSON.stringify({
    username: username,
    email: email
  }), { 
    headers: { 'Content-Type': 'application/json' },
    responseCallback: http.expectedStatuses(200, 409)
  })

  if (response.status == 200) {
    const user = response.json()

    check(user, {
      'username is correct': (u) => u.username == username,
      'email is correct': (u) => u.email == email
    })

    const id = user.id

    const getResponse = http.get(`${BASE_URL}/users/${id}`)

    check(getResponse, {
      'user is retrieved successfully': getResponse.status == 200 && getResponse.json().id == id
    })
  }

  sleep(1)
} 
