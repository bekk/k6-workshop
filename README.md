# k6 workshop

## Installation instructions

For this workshop you need:

* [k6](https://k6.io/docs/get-started/installation/)
* `git` and a shell
* Your preferred editor/IDE for JavaScript, e.g., VS Code

## Getting started

1. Clone the repository: `git clone https://github.com/bekk/k6-workshop`.
2. You should have received a provisioned app by the workshop facilitator. The URL should be on the format `https://api.<xx>.cloudlabs-azure.no`.
3. The app is available at `https://api.<xx>.cloudlabs-azure.no`. Verify the app is running correctly by running `curl https://api.<xx>.cloudlabs-azure.no/healthcheck`, or opening `https://api.<xx>.cloudlabs-azure.no/healthcheck` in the browser. You should see a message stating that the database connection is ok.

You should now be ready to go!

## Tasks

### 1: Users

#### 1a: The first k6 function

1. Open `load-tests/contants.js`, and update `BASE_URL` with your `https://api.<xx>.cloudlabs-azure.no` URL.

2. In the `load-tests` folder, create a file named `create-users.js`, and put the following code in it:

  ```js
    import http from 'k6/http'
    import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js'

    import { BASE_URL } from './constants.js'

    export default function() {
      const username = `user-1a-${randomIntBetween(0, 1000000000)}`;
      const email = `${username}@test.no`

      http.post(`${BASE_URL}/users`, JSON.stringify({
        username: username,
        email: email
      }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
  ```

3. From the command line in the `load-tests` folder, run: `k6 run create-users.js`. This should produce some output, including a table of statistics. Right now we want the row starting with `http_req_failed`. This should say `0.00%`, meaning all (in this case, a single request) succeeded with a successful status code.

    **So, what happens when k6 runs the file?**

    * The default exported function in the file is assumed to be the load test by k6.
    * `http.post` performs a single HTTP POST request towards the `/users` endpoint, with the payload and headers specified in the code. The payload object is converted to string by using `JSON.stringify`, since k6 doesn't do that for us. [`http` is a built-in k6 library](https://k6.io/docs/javascript-api/k6-http/) that is needed for generating proper statistics for requests and responses, using `fetch` or other native JS methods won't work properly.
    * `randomIntBetween` is fetched from an [external k6 library, `k6-utils`](https://k6.io/docs/javascript-api/jslib/utils/), that is maintained by Grafana Labs.



4. Let's generate more than one request! :chart_with_upwards_trend:

    Run: `k6 run --duration 5s --vus 100 create-users.js`

    Here, we simulate 100 virtual users (VUs) making continuous requests for 5 seconds. Depending on hardware, OS and other factors, you might see warnings about dropped connections. Take a look at the `iterations` field in the output, which shows the total number of times the default exported function is run (the above command should run at least 200 iterations towards a B1 tier Azure App Service).

    Try experimenting with a different VUs and durations to see what the limits of the system and network you're testing are. Please note:

    * Your network resources are limited by your operating system configuration and network, you will likely see warnings emitted from the k6 runtime similar to some of the below:

        ```text
        WARN[0047] Request Failed      error="Post \"https://api.00.cloudlabs-azure.no/users\": dial: i/o timeout"
        WARN[0023] Request Failed      error="Post \"https://api.00.cloudlabs-azure.no/users\": dial tcp 20.105.216.18:443: connect: can't assign requested address"
        ```

        For the workshop, this means you've reached the limits and there's no point in scaling further, for now. In a real-world use case, you'd probably want to look at options to [scale k6](https://k6.io/docs/get-started/running-k6/#execution-modes) or [tuning the OS](https://k6.io/docs/misc/fine-tuning-os/).

    * The test will run longer than the allotted duration. This is because each running VU is given 30 seconds to exit before it's killed (this timeout is configurable).

    * :warning: Doing this in the cloud might incur unexpected costs and/or troubles for other services on shared infrastructure! In this workshop, everyone runs separate instances that does not autoscale, so no additional costs will incur.

5. The previous test is not realistic, because it's the equivalent of a 100 users simultaneously clicking a "Create user" button as fast as they can. Therefore, `sleep` can be used to simulate natural delays in usage, e.g., to simulate polling at given intervals, delays caused by network, user interactions and/or rendering of UI. At the top of the file, add `import { sleep } from 'k6'`, and at the bottom of the function (after the `http.post`) add `sleep(1)` to sleep for one second. Running the command from the previous step would result in about 500 iterations (5s * 100 users) without network delay, but throttling (network, database, etc.) will cause additional delays and fewer iterations.

    :bulb: If you can look at the logs, observe that the requests occur in batches. All virtual users run their requests at approximately the same time, then sleeps for a second, and so on. We'll look at how to more realistically distribute the load using other methods later.

#### 1b: Checks

We also want to verify that the response is correct. We can use `check`, to test arbitrary conditions and get the result in the summary report.

```js
const response = http.post(...)

// A check can contain multiple checks, and returns true if all checks succeed
check(response, {
     '200 OK': r => r.status == 200 ,
     'Another check': r => ...
})
```

1. Get the response from the POST request, and verify that the response status code is `200` using `check`. Remember to add `check` to the import from `k6` (`import { check, sleep } from 'k6'). Run k6 like before, and see that the checks pass as expected.

    You can get the response body by using the `Response.json()` method:

    ```js
    const response = http.post('[...]/users', ...) // This call is unchanged from the previous step
    const createdUser = response.json()
    ```

    When testing new code, running with 1 VU for 1 iterations, is enought to test the code: `k6 --iterations 1 --vus 1 create-users.js`. You can use `k6 --vus 100 --duration 5s create-users.js` when you want to test performance.

2. Add a call to `check` that verifies that `username` and `email` in the response corresponds with what was sent in the request. Test your solution by running k6 like before.

    <details>

    <summary>Hint: Calling `check(...)`</summary>

    Your code should now look something like this:

    ```js
    export default function() {
      const username = `user-1a-${randomIntBetween(0, 1000000000)}`;
      const email = `${username}@test.no`

      const response = http.post(`${BASE_URL}/users`, JSON.stringify({
        username: username,
        email: email
      }), {
        headers: { 'Content-Type': 'application/json' },
      })

      const createdUser = response.json()

      check(createdUser, {
        'username is correct': (u) => u.username == username,
        'email is correct': (u) => u.email == email
      })
    }
    ```

    </details>


    <details>

    <summary>:moneybag: Extra credit: What if the request fails?</summary>

    The request can fail, especially when load testing, resulting in errors from the k6 runtime when trying to call `Response.json()`. An easy way to handle that is to wrap the code using the response body in an `if` block.

    See what happens if you try performing a request to an invalid URL, fix it and then test again. (Make sure to correct the URL again, before moving on to the next task.)

    </details>

:information_source: You can check out the [documentation](https://k6.io/docs/using-k6/checks/) for more information about `check`.

#### 1c: Handling error status codes that are correct

You might already have encountered non-successful error codes. Trying to create a user with a non-unique username or email will return a `409` response. This is a valid response, so we'd like this to count as a successful HTTP response in our statistics. (This might not be what you normay want, depending on what you actually want to test.)

1. Make range of the random numbers generated for the username smaller, by changing the first line in the function to: ``const username = `user-1d-${randomIntBetween(0, 100)}`;``. Adjust up the duration and VUs using `k6 run --duration 15s --vus 200 create-users.js`, and see that your tests and checks fails when running k6.

2. We can specify that `409` is an expected status for the `http.post` call. We will use a *responseCallback* and give it as a parameter to the `http.post` method. Modify the `http.post` method to add the `responseCallback`

```js
const response = http.post(`...`, JSON.stringify({
  // ... - like before
}), {
  headers: { 'Content-Type': 'application/json' },
  responseCallback: http.expectedStatuses(200, 409)
})
```

k6 will now consider `409` a valid response status code. Also remove or modify the previous check for 200 response status code. Run k6 again, verify that all checks succeed and `http_req_failed` is `0.00%`.

:bulb: Remember to adjust back to `randomIntBetween(0, 100000000)` before moving on.

:information_source: You can read more about [configuring `expectedStatuses`](https://k6.io/docs/javacript-api/k6-http/expectedstatuses/), [`responseCallback`](https://k6.io/docs/javascript-api/k6-http/setresponsecallback/) and [`http.*` method params](https://k6.io/docs/javascript-api/k6-http/params/) in the documentation.


#### 1d: Calling multiple endpoints

`http.get(url)` can be used to perform a GET request to the supplied `url` and generate statistics for the summary report. The URL to get the user with `id` is `/users/[id]`. You can get the `id` from the response after creating the user:

```js
const createdUser = response.json();
// ... - check omitted
const id = createdUser.id;
```

1. Add a request to get the user using `http.get(...)`. Test that it works as expected.

    <details>

    <summary>Hint: Calling `http.get(...)`</summary>

    `http.get()` does not need any extra arguments than the URL:

    ```js
    const getUserResponse = http.get(`${BASE_URL}/users/${id}`)
    ```

    </details>

2. Add a check for the response, verifying that the status and `id` in the returned body is correct. This should be done in with a separate call to `check`, after the `getUserResponse`. Remember to test your code.

#### 1e: Thresholds

Some services might have service level objectives (SLOs), either defined externally or as an internal metric by the team. These might specified like "99% of requests should be served in less than 500ms". *Thresholds* can be used to represent SLOs, and are specified in a specially exported options object:

```js
export const options = {
  thresholds: {
    http_req_failed: ['rate<0.01'], // http errors should be less than 1%
    http_req_duration: ['avg<200', 'p(99)<500'], // average request duration should be below 200ms, 99% of requests below 500ms
  },
};

export default function () {
  // ...
}
```

These thresholds use the [built-in metrics](https://k6.io/docs/using-k6/metrics/reference/) to decide whether the system under test has acceptable performance.

1. Create thresholds for testing that 95% requests are served in less than 500ms and the average response duration is less than 300ms (using the `http_req_duration` *Trend* metric). Run the test with 100 VUs over 10 seconds, and see if they succeed.

    :bulb: k6 displays the error in multiple ways by default. The default summary contains a red cross or green checkmark next to the metric, and an error message is also printed. In addition, the exit code is also erroneous, which is very useful for automated performance testing using CI/CD.

2. Modify the threshold so that it succeeds.

    :information_source: [The documentation](https://k6.io/docs/using-k6/thresholds/) gives a good overview of different ways to use thresholds.

3. Add a new threshold: `'http_reqs{status:500}': ['count<1']`. This threshold is using the built-in `http_reqs` *Counter* metric, and filtering on the `status` *tag*, and setting the threshold to less than 1 (i.e., none), so that the load test will fail if we get `500` responses. Run the test with 1000 VUs over 10 seconds, and look at how it fails. Look for `{ status:500 }` in the output, it should have a check mark or red x next to it.

4. If you want to *track* a metric (i.e., get it in the output summary), you can add a threshold without checks. Add the threshold `'http_reqs{status:200}': []` and run the tests again. Notice that `{ status:200 }` does not have a check mark or red x, because it doesn't have any thresholds associated with it.

    :information_source: There are [different types of metrics](https://k6.io/docs/using-k6/metrics/), and k6 has many [built-in metrics](https://k6.io/docs/using-k6/metrics/reference) and functionality for [creating custom metrics](https://k6.io/docs/using-k6/metrics/create-custom-metrics). [Groups and tags](https://k6.io/docs/using-k6/tags-and-groups/) are useful to filtering results in scenarios and complex tests.

#### 1f: Removing the boilerplate

The code to call HTTP methods requires some boilerplate. All endpoints you need to use in this tutorial have a corresponding helper function in `load-tests/utils.js`. The functions abstract away the `Content-Type` header, a `responseCallback` and a `check` on response status code. The params can be overridden by passing the `params` argument to the helper functions. The helper functions return `null` if they fail, otherwise the response returned when calling `response.json()`. Use the helper functions unless otherwise specified in all following tasks. Take a look in `load-tests/utils.js` for more information about the helper functions.

1. Modify your code to use the `createUser(username, email, params)` and `getUser(id, params)` instead of `http.post` and `http.get` respectively. Test that it works as expected.

### 2: Todo lists

#### 2a: Create user & todo lists

We'll now move on to creating todo lists. In our domain, a single user can create many todo lists. There's no need to add `sleep` calls, we'll get to that in later sub-tasks.

1. Create a new file, `create-todo-lists.js`. Create a user like in previous tasks, using the `getUser` function.

2. If the user is created correctly, create a todo list. A todo lists can be created with `createTodoList(ownerId, name[, params])`. The `ownerId` must correspond to an existing user, and the `name` can be any string. The endpoint returns a todo list object:  `{ id: int, ownerId: int, name: string }`.

3. Delete the user with `deleteUser(userId[, params])` after creating the todo list to clean up. The application uses cascading deletes, so there's no need to delete the todo list first, it will be deleted automatically.

4. Verify that your code runs correctly.

:information_source: Normally, running tests locally or in a pre-production environment, you wouldn't need to delete users. If you can assign ids based on e.g., time or UUIDs, you probably wouldn't need to worry. However, we're doing it in this tutorial to avoid the id-generating boilerplate and to demonstrate ways to do it.

#### 2b: Setup & teardown

In task 2a, we had a lot of code to create and delete user just for testing the performance of creating a todo list. k6, like other testing frameworks, support setup and teardown functions. We'll refactor the code to use those.

Here's a rough overview of how the test life cycle works:

```js
// 1. init code - runs once per virtual user

export function setup() {
  // 2. setup code - runs once
  // returns data
}

export default function (data) {
  // 3. VU code - repeated as many times as necessary
  // Can use data from setup function
}

export function teardown(data) {
  // 4. teardown code - runs once, if the setup function completes successfully
  // Can use data from setup function
}
```

:information_source: The [test lifecycle documentation page](https://k6.io/docs/using-k6/test-lifecycle/) has more information about the k6 test life cycle.

1. Create `setup` and `teardown` functions that create and delete the user respectively.

    The `setup` function should return the `id` of the generated user, and both the VU function (the `export default function` you've already created) and the `teardown` function should take the `id` as parameter, avoiding global variables. This way we only create a single user for the test, instead of one user per iteration. As an added benefit, the code should be simpler to read.

2. Run with 10 VUs for 5 seconds. Notice that checks in `setup` and `teardown` are grouped separately in the output.

#### 2c: Options

We've already used `options` for defining thresholds. Options can be used for many things, including overriding user agents, DNS resolution or specifying test run behavior. We'll now look at two simple ways to define duration and VUs in the script.

One way is to define a constant number of VUs for a given amount of time. This is equivalent to specifying `--vus` and `--duration` when invoking `k6 run`:

```js
export const options = {
  duration: '30s',
  vus: 2,
}
```

Another way is to specify `stages`, which changes the number of the VUs dynamically. This will use a "ramping VUs executor" by default, but we'll look more into different executors later.

```js
export const options = {
  stages: [
    { duration: '10s', target: 1 },
    { duration: '15s', target: 16 },
    { duration: '45s', target: 200 },
  ],
}
```

:information_source: You can read more about options in the [documentation](https://k6.io/docs/using-k6/k6-options/how-to/).

1. Create the options object, and specify 10 VUs for a duration of 5 seconds. Run `k6 run create-todo-lists.js` (without the VU & duration CLI arguments) and verify from the output that it works.

2. Ramp up and down the number of VUs dynamically using the `stages` property in the `options` object. Remove `vus` and `duration` from `options`. Defines stages to ramp up to 10 VUs in 10 sec, then up to 100 VUs in 20 sec, and finally down to 5 VUs in 10 sec. When running it, notice how the number of VUs increases and decreases in the output, like in the example below:

  ```
  running (0m23.4s), 069/100 VUs, 4181 complete and 0 interrupted iterations
  default   [=====================>----------------] 069/100 VUs  23.3s/40.0s
  ```

3. Options can be overridden by CLI arguments. Without modifying the code, use CLI arguments to run with 10 VUs for 2 seconds. (Use `--duration` and `--vus` arguments like before.)

:information_source: You can read more about the order of precedence of CLI arguments in the [documentation](https://k6.io/docs/using-k6/k6-options/how-to/).

#### 2d: The `init` stage

So far, we've used the `setup` and `teardown` stages, which runs **once per test invocation**. We'll now look at different ways to create test data using the [`init` stage](https://k6.io/docs/using-k6/test-lifecycle/). This is just a fancy name of putting code outside a function, i.e. in the global scope. The code in the `init` scope will generally be run **once per VU**, and can be used to generate useful test code. The `init` stage restricts HTTP calls, meaning that it's not possible to call any of the `http.*` functions to create test data. `setup()` must be used instead if you need to perform HTTP requests.

1. In the `init` stage, create a list of ten random todo list names, `todoListNames`, using a `for`-loop and the `randomIntBetween` function from `utils.js` that's also used for creating unique usernames. In the VU stage function, use a random name from the array every time (i.e., use this: `todoListNames[randomIntBetween(0, todoListNames.length)]`). This illustrates how to create unique variables per VU, which can be useful for generating test data. Run the test and verify everything works correctly.


    <details>

    <summary>Hint: how to create the array</summary>


    ```js
    const todoListNames = []
    for (let i = 0; i < 10; i++) {
      todoListNames.push(`Todo list name #${randomIntBetween(0, 100000)}`)
    }
    ```

    </details>


2. The previous example generates unique test data per VU. It is also possible to share (read only) test data between VUs, using `SharedArray`. `SharedArray` will create a shared array **once** for all VUs, saving a lot of memory when running many VUs in parallel. A `SharedArray` can be created by modifying the code like this:

    ```js
    const todoListNames = new SharedArray('todoListNames`, function() {
        /* code creating the array and returning it */
    })
    ```

    Modify the code from the previous step to use a `SharedArray` and verify that it still works correctly. You will need `import { SharedArray } from "k6/data"` at the top of the file.

    <details>

    <summary>Hint: creating the array</summary>


    ```js
    const todoListNames = new SharedArray('todoListNames', function() {
      const todoListNames = []
      for (let i = 0; i < 10; i++) {
        todoListNames.push(`Todo list name #${randomIntBetween(0, 100000)}`)
      }
      return todoListNames;
    })
    ```

    </details>


:information_source: Take a look at the [documentation for `SharedArray`](https://k6.io/docs/javascript-api/k6-data/sharedarray/) for more information about `SharedArray` and it's performance characteristics.

#### 2e: Creating a user per VU during setup

Like mentioned in task 2d, we can't call `http.*` functions to create test data. So, if we want pre-created users for each VU, we'll need to create them in the `setup()` function. How do we do that? Note that in this case, we'll assume the maximum number of VUs are 100.

1. Modify `setup()` to create 100 users (using `createUser()`), and return a list of user ids. Modify `teardown()` to loop over the list it now receives as a parameter, and delete every user.

    <details>

    <summary>Hint: loops the `setup()` and `teardown()` functions</summary>


    The `setup()` function is similar to before, but with the code wrapped in a loop to create an array to be returned:

    ```js
    export function setup() {
      const userIds = [];
      for (let i = 0; i < 100; i++)
      {
        const username = `user-2d-${randomIntBetween(0, 100000000)}`;
        const email = `${username}@test.no`

        const createdUser = createUser(username, email);
        userIds.push(createdUser.id);
      }
      return userIds;
    }
    ```

    A loop is also introduced for `teardown()`:

    ```js
    export function teardown(userIds)
    {
      for (let i = 0; i < 100; i++)
      {
        deleteUser(userIds[i]);
      }
    }
    ```

    </details>

2. The main VU function must be modified to take a list of user ids. To assign an unique id per VU, we will use the execution context variable `vu.idInTest` (requires `import { vu } from "k6/execution"`). This will be a number between 1 and 100 (inclusive), and can be used to index the array to retrieve a unique user id.


    <details>

    <summary>Hint: using an execution context variable</summary>

    Instead of getting `userId` as a parameter, we use `vu.idInTest - 1` to index the `userIds` argument. \the `createTodoList(...)` statement is unchanged.

    ```js
    export default function(userIds) {
      const userId = userIds[vu.idInTest-1];
      createTodoList(userId, todoListNames[randomIntBetween(0,todoListNames.length)]);
    }
    ```

    </details>

3. Run the test, and verify that it runs correctly. If you look at the application logs, notice that the `ownerId` for created todo lists varies.

    :information_source: There are many [execution context variables](https://k6.io/docs/using-k6/execution-context-variables/) to choose from.


### Taking the next steps

We've now been through the simplest usage of k6. The following tasks will contain less guidance, and you will likely need to read the documentation when links are provided to learn and figure out how to do it.

You can do the tasks in almost any order, depending on what you're interested in.


#### 3: Scenarios (todos)

In this task we'll work with scenarios. Scenarios are useful for simulating realistic user/traffic patterns and gives lots of flexibility in load tests. A scenario is a single traffic pattern, and by combining scenarios, we can simulate complex usage patterns. For instance, imagine the following scenarios:

* Scenario 1: About 20 users signs up each hour. Each user creates a todo list, and adds a couple of todos.
* Scenario 2: The application has a baseline of a 20 users 24/7, creating, modifying and deleting todos on existing todo lists. On top of the baseline usage, the traffic starts increasing about 6 in the morning, ramps up to about 100 (total) users by 11 and stays like that until 15, when it starts to slowly decrease down to the baseline 20 again.
* Scenario 3: Your new fancy todo app gains popularity on Hacker News, and at any giving time during the lunch hour (11-12) around 100 users signs up.
* Scenario 4: A batch job runs every hour, deleting around 20 inactive users each time.

All of these scenarios has different traffic patterns, and we control them by using *executors*. Executors can control arrival rate, ramping up and down and iteration distribution between VUs. Read briefly through the [main scenarios documentation page](https://k6.io/docs/using-k6/scenarios/) to get an overview of scenarios, executors and the syntax to create them.

We'll implement all of these scenarios, but for the sake of the tutorial and short load test runs, we'll assume 1 (real-life) hour is 5 seconds.

`utils.js` has three helper methods for working with todos: `createTodo(todoListId, description, completed, [params])`, `patchTodo(todoListId, todoId, [description], [completed], [params])` and `deleteTodo(todoListId, todoId, [params])`, all of which return the state of the modified todo.

##### 3a: Scenario 1 - constant arrival rate executor

1. Create a new file, `create-todo-scenarios.js`.

2. Let's start with **scenario 1**. In the `export default function`, create a user, create a todo list for the user and add 5 todos to the list. The description of the todo does not matter. There's a 50ms delay between adding each todo (use `sleep(0.05)`).

    We'll make this a scenario in the next step, for now verify that the code works by running k6 with a low number of VUs for a short duration.

    <details>

    <summary>:moneybag: Extra credit: Making the traffic even more realistic</summary>

    Create a randomized number of todos (3-10) in the todo list (use `randomIntBetween`) to better simulate realistic traffic.

    </details>

3. We'll assume the users signing up are evenly spread out inside the time range, and we'll therefore use the [constant arrival rate executor](https://k6.io/docs/using-k6/scenarios/executors/constant-arrival-rate/). What should `duration`, `rate` and `timeUnit` be for this scenario (remember, 1 hour "real time" = 5 seconds)? Create an `options` object (like previous tasks, remember to `export` it!), and add a `signups` scenario, using constant arrival rate, the `duration`, `rate` and `timeUnit` you decided, and `preAllocatedVUs` = 1.

    <details>

    <summary>Hint: `duration`, `rate` and `timeUnit`</summary>

    `duration = 24h * 5s/1h = 120s`

    Since we have 20 new users (= VU function invocations) per "hour" (= 5s) we have: `duration = 120s`, `rate = 20` and `timeUnit = 5s`.

    </details>

  Run k6 (without duration and VUs CLI arguments!). You should get a warning about "Insufficient VUs", but let the test continue to run. Notice the `dropped_iterations` metrics after the test is completed. This should usually be zero, but misconfiguration of executors can cause errors. `dropped_iterations` can also be caused by overloading the system under test.

:information_source: Take a look at the [docs](https://k6.io/docs/using-k6/scenarios/concepts/dropped-iterations/) to learn more about `dropped_iterations`.

4. Set `preAllocatedVUs` to 5, and `maxVUs` to 50 for the scenario and run the test again. Observe that the number of VUs might scale during the test run, in order to serve requests fast enough.

5. To accommodate for multiple scenarios, we will stop using `export default function()` and instead use "scenario functions". Remove `default` and name the function `signups`. In the definition of the scenario (in the `options` object), add `exec: 'signups'`. Read more in the [additional lifecycle functions documentation](https://k6.io/docs/using-k6/test-lifecycle/#additional-lifecycle-functions). Re-run the test to verify that it still works.

##### 3b: Scenario 2 - ramping VUs executor

1. Moving on to **scenario 2**. Create 100 test users with corresponding todo lists in `setup()`, using a similar approach to what you did in task 2e. Create a function called `todos` for our new `todos` scenario - it should select its todo list from the parameter, create, patch and delete some todos. `sleep` in between operations (50-150ms should be enough).

    To simulate the number of VUs increasing and decreasing, use the [ramping VUs executor](https://k6.io/docs/using-k6/scenarios/executors/ramping-vus/). We've already used the simplified syntax for this when using `stages` before, remember? In total, you need 5 stages to simulate the scenario described. Use 40 `startVUs`. Run the test and confirm that everything still works.

##### 3b: Scenario 3 - constant VUs executor

1. For **scenario 3** we'll have 100 users continuously signing up for 1 hour (i.e., 5s for us). We will use the [constant VUs executor](https://k6.io/docs/using-k6/scenarios/executors/constant-vus/). However, because we don't want do this from the start, but during "lunch time" the executor needs to have a delayed start. For that we'll use `startTime`, one of the [common scenario options](https://k6.io/docs/using-k6/scenarios/#options), with a good example [here](https://k6.io/docs/using-k6/scenarios/advanced-examples/#combine-scenarios).

    Create a function `lunchTime` that creates a single user, and a `lunchTime` scenario to execute the function. Run the test. Notice that our scenario is in a `waiting` state with a countdown until `startTime` time has passed.

##### 3b: Scenario 4 - batching requests with the constant arrival rate executor

1. Finally, for **scenario 4**, we're looking at a scenario with repeating spikes in traffic every "hour", typical for applications with batch jobs that runs every hour/day/etc. There are no executors that directly support this repeated spike pattern, but we can use different methods to simulate it. We'll use the [constant arrival rate executor](https://k6.io/docs/using-k6/scenarios/executors/constant-arrival-rate/) again, with `rate = 1` and `timeUnit = 5s` deleting 20 users with a loop in the scenario function (what should `duration` and `preAllocatedVUs` be, and why does this work?).

    We'll have to create the users to delete in `setup()`. Since scenario 2 also creates data in setup, we'll have to make sure they don't interfere which each other's test data. This can be achieved by returning an object like `{ todoScenarioTodoListIds: number[], batchScenarioUserIds: number[] }`, each scenario reading their respective lists. Change the `setup()` function, and update scenario 2 to match.

    Implement the `batch` scenario function to use the correct array in the object parameter, and loop over the 20 next users. Use the `scenario.iterationInInstance` [execution environment variable](https://k6.io/docs/javascript-api/k6-execution/#scenario) to keep track of where you are in the array. Run the test to confirm that it's working.

#### 4: Custom metrics, tags and groups

Custom metrics, tags and groups gives a lot of flexibility to measuring performance.

1. There are four types of [custom metrics](https://k6.io/docs/javascript-api/k6-metrics/): `Counter`, `Gauge`, `Rate` and `Trend`. Custom metrics are used to extend the set of [built-in metrics](https://k6.io/docs/using-k6/metrics/reference/). These are very useful to measure application- or business-specific metrics. We'll modify the test from task 1 (`create-users.js`) to add a `Rate`.

    Take a look at the [docs for `Rate`](https://k6.io/docs/javascript-api/k6-metrics/rate/) and add a `user_creation_failed` metric that tracks how many user creations that fail. We also want a couple of thresholds for our new metrics: one verifying that the error rate is less than 10% at the end of the test, and one that aborts the test prematurely if the error rate exceeds 30%. Test your metric by reducing the `randomIntBetween(...)` range used to create usernames.

2. Custom metrics are useful, but in many cases using tags might be easier to filter (built-in or custom) metrics that already exist. Tags are used to *categorize* measurements. We've already seen some examples of built-in tags: the `http_reqs` counter metric has a `status` tag for the status code was used for thresholds in a previous task. The [documentation](https://k6.io/docs/using-k6/tags-and-groups/) describes many ways tags can be used.

    Performance metrics can (and usually do) change with changes in load. With a helper library, each stage of a load test can be tagged, giving us insight into performance metrics for each stage. Take a look at the [documentation for tagging stages](https://k6.io/docs/using-k6/tags-and-groups/#tagging-stages). Use your code from task 2 (`create-todo-lists.js`) and add tags for each stage.

    Try to run the program. Observe that the output **does not** contain our tags. This is currently known behavior, with [discussions](https://community.grafana.com/t/show-tag-data-in-output-or-summary-json-without-threshold/99320) and [open issues](https://github.com/grafana/k6/issues/1321) related to this. The workaround is to add the thresholds with empty arrays to the `options` object, in this case:

    ```javascript
      thresholds: {
        'http_req_duration{stage:0}': [],
        'http_req_duration{stage:1}': [],
        'http_req_duration{stage:2}': [],
      }
    ```

    Run again to verify that it works as expected.

    :information_source: The results can be [streamed real time](https://k6.io/docs/results-output/real-time/) as individual data points, including a [JSON file](https://k6.io/docs/results-output/real-time/json/) which can be used to analyze the metrics with tags, without the workaround. Using the workaround is simpler in this workshop.


3. Groups are special tags, defined in a special way. Read through [the documentation](https://k6.io/docs/using-k6/tags-and-groups/#groups). We'd like to separate the main VU code from the `setup()` and `teardown()` lifecycle functions. Add a group, `main`, wrapping the main VU code, and a new threshold for `http_req_duration{group:::main}` similar to the previous task. The `:::` is not an error, but a filter using the `::main` tag for the group. Run and verify that you get a separate metric for the new group in the summary.


#### 5: Externally controlled executor

For interactive testing, you can use the *externally controlled executor*. This executor can be used to scale up or down, pause and resume a test. Read about the [externally controlled executor](https://k6.io/docs/using-k6/scenarios/executors/externally-controlled/) and [this blog post](https://k6.io/blog/how-to-control-a-live-k6-test/) about controlling it. Modify the `create-users.js` test from previous tasks to use an externally controlled executor.


## Running the app locally

If you want to run the app locally, outside a Docker container, you need [npm and node 18](https://nodejs.org/en/download/package-manager). If you're using `nvm` to mange node, run `nvm use 18`. If you're using `brew`, `brew install node@18` installs both.

1. Spin up the database in a container: From anywhere, run `docker run -e "ACCEPT_EULA=Y" -e 'MSSQL_SA_PASSWORD=k6-workshop!' -p 1433:1433 -d --name k6-workshop-database --rm mcr.microsoft.com/azure-sql-edge:latest` to start a database in a container in the background. (After the workshop: Run `docker stop k6-workshop-database` to stop and remove the database.)
2. From the repository root folder, run `npm ci`, followed by `npx prisma migrate dev` and `npm run dev` to start the demo app.
