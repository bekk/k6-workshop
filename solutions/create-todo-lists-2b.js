import { createTodoList, createUser, deleteUser, randInt } from './utils.js'

export function setup() {
  const username = `user-2a-${randInt(0, 100000000)}`;
  const email = `${username}@test.no`

  const createdUser = createUser(username, email);
  return createdUser.id;
}

export default function(userId) {
  createTodoList(userId, "Todo list name");
}

export function teardown(userId)
{
  deleteUser(userId);
}
