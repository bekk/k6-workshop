import http from "k6/http";

import { createTodoList, createUser, deleteUser, randInt } from './utils.js'
import { SharedArray } from "k6/data";
import { vu } from "k6/execution"

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

const todoListNames = new SharedArray('todoListNames', function() {
  const todoListNames = []
  for (let i = 0; i < 10; i++) {
    todoListNames.push(`Todo list name #${randInt(0, 100000)}`)
  }
  return todoListNames;
})

export function setup() {
  const userIds = [];
  for (let i = 0; i < 100; i++)
  {
    const username = `user-2d-${randInt(0, 100000000)}`;
    const email = `${username}@test.no`

    const createdUser = createUser(username, email);
    userIds.push(createdUser.id);
  }
  return userIds;
}

export default function(userIds) {
  const userId = userIds[vu.idInTest-1];
  createTodoList(userId, todoListNames[randInt(0,todoListNames.length)]);
}

export function teardown(userIds)
{
  for (let i = 0; i < 100; i++)
  {
    deleteUser(userIds[i]);
  }
} 
