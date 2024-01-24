import http from 'k6/http'
import { check, sleep } from 'k6'

import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js'
import { BASE_URL } from './constants.js'
import { createUser, getUser } from './utils.js'
import { Rate } from 'k6/metrics'

export const options = {
  duration: '20s',
  vus: 10,

  thresholds: {
    user_creation_failed: [
      'rate < 0.1',
      { threshold: 'rate < 0.3', abortOnFail: true }
    ],
    //http_req_duration: ['p(95)<500', 'avg<50']
    http_req_duration: ['p(95)<5000', 'avg<2500'],
    'http_reqs{status:404}': ['count<1'],
    'http_reqs{status:429}': ['count<1'],
    'http_reqs{status:500}': ['count<1'],
    'http_reqs{status:200}': []
  }
}

const userCreationErrors = new Rate('user_creation_failed');

export default function() {
  const username = `user-1a-${randomIntBetween(0, 2000)}`;
  const email = `${username}@test.no`

  const user = createUser(username, email, { 
    responseCallback: http.expectedStatuses(200, 409)
  })

  if (user) {
    userCreationErrors.add(false);
    check(user, {
      'username is correct': (u) => u.username == username,
      'email is correct': (u) => u.email == email
    })

    const id = user.id
    const fetchedUser = getUser(id)
    check(fetchedUser, {
      'user is fetched successfully': u => u && u.id == id
    })
  } else {
    userCreationErrors.add(true);
  }

  sleep(1)
} 
