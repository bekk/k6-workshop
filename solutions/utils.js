import http from "k6/http";
import { check } from "k6";

export const BASE_URL = 'http://localhost:3000'

/**
  * @param {number} min
  * @param {number} max
  */
export const randInt = (min, max) => {
  return Math.floor(Math.random()*(max-min)+min)
}

/**
  * @param {string} username The username of the new user
  * @param {string} email The email of the new user
  * @param {Object} [params] Params to forward to http.* call, refer to k6 docs
  * @returns {?{id: number, username: string, email: string}} The created user object
  */
export const createUser = (username, email, params) => {
  const response = http.post(`${BASE_URL}/users`, JSON.stringify({
    username: username,
    email: email
  }), Object.assign({}, {
    headers: { 'Content-Type': 'application/json' },
    responseCallback: http.expectedStatuses(200),
  }, params));

  if (check(response, { 'User creation OK': res => res.status === 200 })) {
    return response.json();
  } else {
    return null;
  }
}

/**
  * @param {number} id The id of the user to fetch
  * @param {Object} [params] Params to forward to http.* call, refer to k6 docs
  * @returns {?{id: number, username: string, email: string}} The user object
  */
export const getUser = (id, params) => {
  const response = http.get(`${BASE_URL}/users/${id}`, 
    Object.assign({}, {
      headers: { 'Content-Type': 'application/json' },
      responseCallback: http.expectedStatuses(200),
    }, params));
  if (check(response, { 'User fetch OK': res => res.status === 200 })) {
    return response.json();
  } else {
    return null;
  }
}

/**
  * @param {number} userId The username of the new user
  * @param {Object} [params] Params to forward to http.* call, refer to k6 docs
  * @returns {?{id: number, username: string, email: string}} The created user object
  */
export const deleteUser = (userId, params) => {
  const response = http.del(`${BASE_URL}/users/${userId}`,
    Object.assign({}, {
      headers: { 'Content-Type': 'application/json' },
      responseCallback: http.expectedStatuses(200),
    }, params));

  if (check(response, { 'User delete OK': res => res.status === 200 })) {
    return response.json();
  } else {
    return null;
  }
}

/**
  * @param {number} ownerId Id of the user owning the todo list
  * @param {string} name The name of the todo list
  * @param {Object} [params] Params to forward to http.* call, refer to k6 docs
  * @returns {?{id: number, ownerId: number, name: string}} The created todo list object
  */
export const createTodoList = (ownerId, name, params) => {
  const response = http.post(`${BASE_URL}/todo-lists`, JSON.stringify({
    ownerId: ownerId,
    name: name
  }), Object.assign({}, {
    headers: { 'Content-Type': 'application/json' },
    responseCallback: http.expectedStatuses(200),
  }, params));

  if (check(response, { 'Todo list creation OK': res => res.status === 200 })) {
    return response.json();
  } else {
    return null;
  }
}

/**
  * @param {number} todoListId The id of the parent todo list
  * @param {string} description Todo description
  * @param {boolean} [completed] Optional completion status of todo
  * @param {Object} [params] Params to forward to http.* call, refer to k6 docs
  * @returns {{id: number, todoListId: number, description: string, completed: boolean}} A todo object
  */
export const createTodo = (todoListId, description, completed, params) => {
  const response = http.post(`${BASE_URL}/todo-lists/${todoListId}/todos`, JSON.stringify({
    description: description,
    completed: completed
  }), Object.assign({}, {
    headers: { 'Content-Type': 'application/json' },
    responseCallback: http.expectedStatuses(200),
  }, params));
  check(response, { 'Todo creation OK': res => res.status === 200 });
  return response.json();
}

/**
  * @param {number} todoListId The id of the parent todo list
  * @param {number} todoId The id of the todo
  * @param {string} [description] Optional new todo description
  * @param {boolean} [completed] Optional new completion status of todo
  * @param {Object} [params] Params to forward to http.* call, refer to k6 docs
  * @returns {{id: number, todoListId: number, description: string, completed: boolean}} A todo object
  */
export const patchTodo = (todoListId, todoId, description, completed, params) => {
  const response = http.patch(`${BASE_URL}/todo-lists/${todoListId}/todos/${todoId}`,
    JSON.stringify({
      description: description,
      completed: completed,
    }),
    Object.assign({}, {
      headers: { 'Content-Type': 'application/json' },
      responseCallback: http.expectedStatuses(200),
    }, params));
  check(response, { 'Todo patch OK': res => res.status === 200 });
  return response.json();
}

/**
  * @param {number} todoListId The id of the parent todo list
  * @param {number} todoId The id the todo
  * @param {Object} [params] Params to forward to http.* call, refer to k6 docs
  * @returns {{id: number, todoListId: number, description: string, completed: boolean}} A todo object
  */
export const deleteTodo = (todoListId, todoId, params) => {
  const response = http.del(`${BASE_URL}/todo-lists/${todoListId}/todos/${todoId}`, null, Object.assign({}, {
    responseCallback: http.expectedStatuses(200),
  }, params));
  check(response, { 'Todo deletion OK': res => res.status === 200 });
  return response.json();
}
