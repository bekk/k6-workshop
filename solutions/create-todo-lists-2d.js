import { createTodoList, createUser, deleteUser, randInt } from './utils.js'
import { SharedArray } from "k6/data";

export const options = {
  //duration: '5s',
  //vus: 10,
  stages: [
    { duration: '10s', target: 10 },
    { duration: '20s', target: 100 },
    { duration: '10s', target: 5 },
  ],
}

/*
const todoListNames = []
for (let i = 0; i < 10; i++) {
  todoListNames.push(`Todo list name #${randInt(0, 100000)}`)
}
return todoListNames;
*/

const todoListNames = new SharedArray('todoListNames', function() {
  const todoListNames = []
  for (let i = 0; i < 10; i++) {
    todoListNames.push(`Todo list name #${randInt(0, 100000)}`)
  }
  return todoListNames;
})

export function setup() {
  const username = `user-2a-${randInt(0, 100000000)}`;
  const email = `${username}@test.no`

  const createdUser = createUser(username, email);
  return createdUser.id;
}

export default function(userId) {
  createTodoList(userId, todoListNames[randInt(0,todoListNames.length)]);
}

export function teardown(userId)
{
  deleteUser(userId);
} 
