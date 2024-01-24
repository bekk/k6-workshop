import { createTodoList, createUser, deleteUser } from './utils.js'
import { group } from "k6";
import { SharedArray } from "k6/data";
import { vu } from "k6/execution"

import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js'

import { tagWithCurrentStageIndex } from 'https://jslib.k6.io/k6-utils/1.3.0/index.js';

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '20s', target: 100 },
    { duration: '10s', target: 5 },
  ],
  thresholds: {
    'http_req_duration{group:::main}': [],
    'http_req_duration{stage:0}': [],
    'http_req_duration{stage:1}': [],
    'http_req_duration{stage:2}': [],
  }
}

const todoListNames = new SharedArray('todoListNames', function() {
  const todoListNames = []
  for (let i = 0; i < 10; i++) {
    todoListNames.push(`Todo list name #${randomIntBetween(0, 100000)}`)
  }
  return todoListNames;
})

export function setup() {
  const userIds = [];
  for (let i = 0; i < 100; i++)
  {
    const username = `user-2d-${randomIntBetween(0, 100000000)}`;
    const email = `${username}@test.no`

    const createdUser = createUser(username, email);
    if (createdUser != undefined) {
      userIds.push(createdUser.id);
    }
  }
  return userIds;
}

export default function(userIds) {
  tagWithCurrentStageIndex();
  group('main', () => {
    const userId = userIds[vu.idInTest-1];
    createTodoList(userId, todoListNames[randomIntBetween(0,todoListNames.length)]);
  });
}

export function teardown(userIds)
{
  for (let i = 0; i < 100; i++)
  {
    deleteUser(userIds[i]);
  }
} 
