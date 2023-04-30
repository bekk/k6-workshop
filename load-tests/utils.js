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
  * @param {number} todoListId - The id of the parent todo list
  * @param {string} description - Todo description
  * @param {boolean} [completed] - Optional completion status of todo
  * @param {Object} [params] - Params to forward to http.* call, refer to k6 docs
  * @returns {{id: number, todoListId: number, description: string, completed: boolean}} - A todo object
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
  * @param {number} todoListId - The id of the parent todo list
  * @param {number} todoId - The id of the todo
  * @param {string} [description] - Optional new todo description
  * @param {boolean} [completed] - Optional new completion status of todo
  * @param {Object} [params] - Params to forward to http.* call, refer to k6 docs
  * @returns {{id: number, todoListId: number, description: string, completed: boolean}} - A todo object
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
  * @param {number} todoListId - The id of the parent todo list
  * @param {number} todoId - The id the todo
  * @param {Object} [params] - Params to forward to http.* call, refer to k6 docs
  * @returns {{id: number, todoListId: number, description: string, completed: boolean}} - A todo object
  */
export const deleteTodo = (todoListId, todoId, params) => {
  const response = http.del(`${BASE_URL}/todo-lists/${todoListId}/todos/${todoId}`, null, Object.assign({}, {
    responseCallback: http.expectedStatuses(200),
  }, params));
  check(response, { 'Todo deletion OK': res => res.status === 200 });
  return response.json();
}
