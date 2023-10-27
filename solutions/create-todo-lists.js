import http from "k6/http";

import { createTodoList, createUser, deleteUser } from './utils.js'
import { SharedArray } from "k6/data";
import { vu } from "k6/execution"

import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js'

// Task 2c
export const options = {
  //duration: '5s',
  //vus: 10,
  stages: [
    { duration: '10s', target: 10 },
    { duration: '20s', target: 100 },
    { duration: '10s', target: 5 },
  ],
}

// Task 2d
/*
const todoListNames = []
for (let i = 0; i < 10; i++) {
  todoListNames.push(`Todo list name #${randomIntBetween(0, 100000)}`)
}
return todoListNames;
*/
const todoListNames = new SharedArray('todoListNames', function() {
  const todoListNames = []
  for (let i = 0; i < 10; i++) {
    todoListNames.push(`Todo list name #${randomIntBetween(0, 100000)}`)
  }
  return todoListNames;
})

export function setup() {
  // Task 2e
  const userIds = [];
  for (let i = 0; i < 100; i++)
  {
    // Task 2b
    const username = `user-2d-${randomIntBetween(0, 100000000)}`;
    const email = `${username}@test.no`

    const createdUser = createUser(username, email);
    userIds.push(createdUser.id);
  }
  return userIds;
}

export default function(userIds) {
  // Task 2a
  /*
  const createdUser = createUser(username, email);

  if (createdUser !== null) {
    const userId = createdUser.id;

    createTodoList(userId, "Todo list name");
    deleteUser(userId);
  }
  */
  // Task 2e
  const userId = userIds[vu.idInTest-1];
  // Task 2b, 2d
  createTodoList(userId, todoListNames[randomIntBetween(0,todoListNames.length)]);

}

export function teardown(userIds)
{
  // Task 2e
  for (let i = 0; i < 100; i++)
  {
    // Task 2b
    deleteUser(userIds[i]);
  }
} 
