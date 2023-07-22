import http from "k6/http";

import { createTodo, deleteTodo, patchTodo, randInt } from './utils.js'
import { check, sleep } from "k6";
import { vu, scenario } from "k6/execution"

const BASE_URL = 'http://localhost:3000'

/**
  * @param {string} username
  * @param {string} email
  * @returns {{id: number, username: string, email: string }}
  */
const createUser = (username, email) => {
  const createUserResponse = http.post(`${BASE_URL}/users`, JSON.stringify({
    username: username,
    email: email
  }), { 
    headers: { 'Content-Type': 'application/json' },
    responseCallback: http.expectedStatuses(200)
  })

  check(createUserResponse, { 'User created OK': res => res.status === 200 })
  return createUserResponse.json();
}

/**
  * @param {number} id
  * @returns {{id: number, username: string, email: string }}
  */
const deleteUser = (id) => {
  const deleteUserResponse = http.del(`${BASE_URL}/users/${id}`, null, { 
    headers: { 'Content-Type': 'application/json' },
    responseCallback: http.expectedStatuses(200)
  })

  check(deleteUserResponse, { 'User deleted OK': res => res.status === 200 })
  return deleteUserResponse.json();
}

/**
  * @param {number} ownerId
  * @param {string} name
  * @returns {{id: number, name: string, ownerId: number}}
  */
const createTodoList = (ownerId, name) => {
  const createTodoListResponse = http.post(`${BASE_URL}/todo-lists`, JSON.stringify({
    ownerId: ownerId,
    name: name
  }), { 
    headers: { 'Content-Type': 'application/json' },
    responseCallback: http.expectedStatuses(200)
  })

  check(createTodoListResponse, { 'Todo list creation OK': res => res.status === 200 });
  return createTodoListResponse.json()
}

export const options = {
  scenarios: {
    signups: {
      executor: 'constant-arrival-rate',
      exec: 'signups',
      duration: '120s',
      rate: 20,
      timeUnit: '5s',
      preAllocatedVUs: 5,
      maxVUs: 50
    },
    todos: {
      executor: 'ramping-vus',
      exec: 'todos',
      startVUs: 40,
      stages: [
        { duration: '30s', target: 40 },
        { duration: '25s', target: 100 },
        { duration: '20s', target: 100 },
        { duration: '25s', target: 40 },
        { duration: '20s', target: 40 },
      ]
    },
    lunchTime: {
      executor: 'constant-vus',
      exec: 'lunchTime',
      duration: '5s',
      vus: 100,
      startTime: '55s'
    },
    batch: {
      executor: 'constant-arrival-rate',
      exec: 'batch',
      duration: '120s',
      rate: 1,
      timeUnit: '5s',
      preAllocatedVUs: 1
    }
  }
}

export function setup() {
  const todoListIds = [];
  for (let i = 0; i < 500; i++)
  {
    const username = `user-3a-${randInt(0, 100000000)}`;
    const email = `${username}@test.no`
    const user = createUser(username, email)
    const todoList = createTodoList(user.id, "todolist name");
    todoListIds.push(todoList.id);
  }

  const userIds = [];
  for (let i = 0; i < 480; i++)
  {
    const username = `user-3a-${randInt(0, 100000000)}`;
    const email = `${username}@test.no`
    const user = createUser(username, email)
    userIds.push(user.id)
  }
  return { todoScenarioTodoListIds: todoListIds, batchScenarioUserIds: userIds };
}

/*
const todoListNames = new SharedArray('todoListNames', function() {
  const todoListNames = []
  for (let i = 0; i < 10; i++) {
    todoListNames.push(`Todo list name #${randInt(0, 100000)}`)
  }
  return todoListNames;
})

export function setup() {
  const username = `user-3a-${randInt(0, 100000000)}`;
  const email = `${username}@test.no`

  const user = createUser(username, email)
  return user.id;
}
*/

export function signups() {
  const username = `user-3a-${randInt(0, 100000000)}`;
  const email = `${username}@test.no`
  const user = createUser(username, email);
  const userId = user.id;

  const todoList = createTodoList(userId, "Name of todolist")
  const todoListId = todoList.id;

  const iterations = randInt(3, 11);
  for (let i = 0; i < iterations; i++)
  {
    createTodo(todoListId, "Test")
    sleep(0.05)
  }
}

export function todos(data) {
  const { todoScenarioTodoListIds } = data;
  const todoListId = todoScenarioTodoListIds[vu.idInTest];
  const todoId1 = createTodo(todoListId, "todo description").id
  sleep(0.1)
  const todoId2 = createTodo(todoListId, "todo description").id
  sleep(0.1)
  const todoId3 = createTodo(todoListId, "todo description").id
  sleep(0.1)
  patchTodo(todoListId, todoId1, "new description", true)
  sleep(0.05)
  patchTodo(todoListId, todoId2, "new description 2")
  sleep(0.05)
  deleteTodo(todoListId, todoId3)
}

export function lunchTime() {
  const username = `user-3a-${randInt(0, 100000000)}`;
  const email = `${username}@test.no`;
  createUser(username, email);
}

export function batch(data) {
  const scenarioUserIds = data.batchScenarioUserIds.slice(scenario.iterationInInstance*20, scenario.iterationInInstance*20 + 20);
  for (let i = 0; i < 20; i++)
  {
    deleteUser(scenarioUserIds[i])
  }
}
/*
export function teardown(userId)
{
  const deleteUserResponse = http.del(`${BASE_URL}/users/${userId}`)
  check(deleteUserResponse, { 'User deleted OK': res => res.status === 200 })
} 
*/
