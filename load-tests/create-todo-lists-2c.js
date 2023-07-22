import http from "k6/http";

import { randInt } from './utils.js'
import { check } from "k6";

const BASE_URL = 'http://localhost:3000'

export const options = {
  //duration: '5s',
  //vus: 10,
  stages: [
    { duration: '10s', target: 10 },
    { duration: '20s', target: 100 },
    { duration: '10s', target: 5 },
  ],
}

export function setup() {
  const username = `user-2c-${randInt(0, 100000000)}`;
  const email = `${username}@test.no`

  const createUserResponse = http.post(`${BASE_URL}/users`, JSON.stringify({
    username: username,
    email: email
  }), { 
    headers: { 'Content-Type': 'application/json' },
    responseCallback: http.expectedStatuses(200)
  })

  check(createUserResponse, { 'User created OK': res => res.status === 200 })

  const userId = createUserResponse.json().id;
  return userId;
}

export default function(userId) {
  const createTodoListResponse = http.post(`${BASE_URL}/todo-lists`, JSON.stringify({
    ownerId: userId,
    name: "Todo list name"
  }), { 
    headers: { 'Content-Type': 'application/json' },
    responseCallback: http.expectedStatuses(200)
  })

  check(createTodoListResponse, { 'Todo list creation OK': res => res.status === 200 });
  
}

export function teardown(userId)
{
  const deleteUserResponse = http.del(`${BASE_URL}/users/${userId}`)
  check(deleteUserResponse, { 'User deleted OK': res => res.status === 200 })
} 
