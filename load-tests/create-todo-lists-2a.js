import http from "k6/http";

import { randInt } from './utils.js'
import { check } from "k6";

const BASE_URL = 'http://localhost:3000'

export default function() {
  const username = `user-2a-${randInt(0, 100000000)}`;
  const email = `${username}@test.no`

  const createUserResponse = http.post(`${BASE_URL}/users`, JSON.stringify({
    username: username,
    email: email
  }), { 
    headers: { 'Content-Type': 'application/json' },
    responseCallback: http.expectedStatuses(200)
  })

  if (check(createUserResponse, { 'User creation OK': res => res.status === 200})) {
    const userId = createUserResponse.json().id;

    const createTodoListResponse = http.post(`${BASE_URL}/todo-lists`, JSON.stringify({
      ownerId: userId,
      name: "Todo list name"
    }), { 
      headers: { 'Content-Type': 'application/json' },
      responseCallback: http.expectedStatuses(200)
    })

    check(createTodoListResponse, { 'Todo list creation OK': res => res.status === 200 });
    
    const deleteUserResponse = http.del(`${BASE_URL}/users/${userId}`)
    check(deleteUserResponse, { 'User deleted OK': res => res.status === 200 })
  }


}
