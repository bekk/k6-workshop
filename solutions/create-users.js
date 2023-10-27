import http from 'k6/http'
import { check, sleep } from 'k6'

import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js'
import { BASE_URL } from './constants.js'
import { createUser, getUser } from './utils.js'

// Task 1e
export const options = {
  thresholds: {
    //http_req_duration: ['p(95)<500', 'avg<50']
    http_req_duration: ['p(95)<5000', 'avg<2500'],
    'http_reqs{status:404}': ['count<1'],
    'http_reqs{status:429}': ['count<1'],
    'http_reqs{status:500}': ['count<1'],
    'http_reqs{status:200}': []
  }
}

// Task 1a
export default function() {
  const username = `user-1a-${randomIntBetween(0, 1000000000)}`;
  const email = `${username}@test.no`

/* Before 1f
  const response = http.post(`${BASE_URL}/users`, JSON.stringify({
    username: username,
    email: email
  }), { 
    headers: { 'Content-Type': 'application/json' },
    // Task 1d
    responseCallback: http.expectedStatuses(200, 409),
  })

  // Task 1b 
  if (check(response, { '200 OK': (r) => r.status == 200 })) {
    const user = response.json()

    check(user, {
      'username is correct': (u) => u.username == username,
      'email is correct': (u) => u.email == email
    })

    // Task 1c
    const id = user.id

    const getResponse = http.get(`${BASE_URL}/users/${id}`)

    check(getResponse, {
      'user is retrieved successfully': getResponse.status == 200 && getResponse.json().id == id
    })
  }
*/

  // Task 1f
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
