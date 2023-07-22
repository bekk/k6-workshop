import { createTodoList, createUser, deleteUser, randInt } from './utils.js'

export default function() {
  const username = `user-2a-${randInt(0, 100000000)}`;
  const email = `${username}@test.no`

  const createdUser = createUser(username, email);

  if (createdUser !== null) {
    const userId = createdUser.id;

    const createdTodoList = createTodoList(userId, "Todo list name");
    if (createdTodoList !== null) {
      deleteUser(userId);
    }
  }
}
