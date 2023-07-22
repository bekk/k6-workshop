import http from 'k6/http'
import { sleep, check } from 'k6'

import { randInt, createUser, getUser } from './utils.js'

export const options = {
  thresholds: {
    http_req_duration: ['p(99)<500', 'avg<300']
  }
}

export default function() {
  const username = `user-1e-${randInt(0, 10000000)}`;
  const email = `${username}@test.no`

  const user = createUser(username, email, { 
    responseCallback: http.expectedStatuses(200, 409)
  })

  if (user) {
    check(user, {
      'username is correct': (u) => u.username == username,
      'email is correct': (u) => u.email == email
    })

    const id = user.id
    const fetchedUser = getUser(id)
    check(fetchedUser, {
      'user is fetched successfully': u => u && u.id == id
    })
  }

  sleep(1)
} 
