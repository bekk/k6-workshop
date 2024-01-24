import http from 'k6/http'
import { check, sleep } from 'k6'

import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js'
import { createUser, getUser } from './utils.js'

export const options = {
  scenarios: {
    contacts: {
      executor: 'externally-controlled',
      vus: 10,
      maxVUs: 50,
      duration: '10m',
    },
  },
}

export default function() {
  const username = `user-1a-${randomIntBetween(0, 1000000000)}`;
  const email = `${username}@test.no`

  createUser(username, email, { 
    responseCallback: http.expectedStatuses(200)
  })
} 
