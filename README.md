# k6 workshop

## Installation instructions

For this workshop you need:

* Docker and docker-compose. This tutorial assumes a Docker-compatible CLI is used to run the demo app and database, but any compatible tool can be used.
* [k6](https://k6.io/docs/get-started/installation/)

## Getting started

1. Clone the repository: `git clone https://github.com/bekk/k6-workshop`.
2. Run `docker-compose up -d` to start the docker containers in the background.
3. Run `docker-compose logs --follow k6-todo` to view the application logs.
4. The app is available at `localhost:3000`. Verify the app is running correctly by running `curl localhost:3000/healthcheck`, or opening the `localhost:3000/healthcheck` in the browser. You should see a message stating that the database connection is ok.

You should now be ready to go! *After the workshop* you can clean up resources by running `docker-compose down` from the repository root.

## Tasks

### 1: Users

#### 1a: The first k6 function

1. In the `load-tests` folder, create a file named `create-users.js`, and put the following code in it:

  ```js
    import http from 'k6/http'

    import { randInt } from './utils.js'

    const BASE_URL = 'http://localhost:3000'

    export default function() {
      const username = `user-1a-${randInt(0, 1000000000)}`;
      const email = `${username}@test.no`

      http.post(`${BASE_URL}/users`, JSON.stringify({
        username: username,
        email: email
      }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
  ```

2. From the command line in the `load-tests` folder, run: `k6 run create-users.js`. This should produce some output, including a table of statistics. Right now we want the row starting with `http_req_failed`. This should say `0.00%`, meaning all (in this case, a single request) succeeded with a successful status code.

    **So, what happens when k6 runs the file?** The default exported function in the file is assumed to be the load test by k6. `http.post` performs a single HTTP POST request towards the `/users` endpoint, with the payload and headers specified in the code. The payload object is converted to string by using `JSON.stringify`, since k6 doesn't do that for us. [`http` is a k6 library](https://k6.io/docs/javascript-api/k6-http/) that is needed for generating proper statistics for requests and responses, using `fetch` or other native JS methods won't work properly. The `utils.js` module contains some helpers to simplify the code in this workshop.

3. Let's generate more than one request! :chart_with_upwards_trend:

    Run: `k6 run --duration 5s --vus 100 create-users.js`

    Here, we simulate 100 virtual users (VUs) making continuous requests for 5 seconds. Depending on hardware, OS and other factors, you might see warnings about dropped connections. Take a look at the `iterations` field in the output, which shows the total number of times the default exported function is run (the above command runs ~1800 iterations on a 2019 MacBook Pro running towards a local Docker container). Try experimenting with a different VUs and durations to see what the limits of the system you're testing are.

    :warning: Doing this in the cloud might incur unexpected costs and/or troubles for other services on shared infrastructure!

4. The previous test is not realistic, because it's the equivalent of a 100 users simultaneously clicking a "Create user" button as fast as they can. Therefore, `sleep` can be used to simulate natural delays in usage, e.g., to simulate polling at given intervals, delays caused by network, user interactions and/or rendering of UI. At the top of the file, add `import { sleep } from 'k6'`, and at the bottom of the function (after the `http.post`) add `sleep(1)` to sleep for one second. Running the command from the previous step should now result in about 500 iterations (5s * 100 users), but throttling (network, database, etc.) might cause additional delays and fewer iterations.

    :bulb: If you can look at the logs, observe that the requests occur in batches. All virtual users run their requests at approximately the same time, then sleeps for a second, and so on. We'll look at how to more realistically distribute the load using other methods later.

#### 1b: Checks

We also want to verify that the response is correct. We can use `check`, to test arbitrary conditions and get the result in the summary report.

```js
const response = http.post(...)

// A check can contain mulltiple checks, and returns true if all checks succeed
check(response,
    { '200 OK': r => r.status == 200 },
    { 'Another check': r => ... }
)
```

1. Get the response from the POST request, and verify that the response status code is `200`. Run k6 like before, and see that the checks pass as expected.

You can get the response body by using the `Response.json()` method:

```js
const response = http.post('[...]/users', ...)
const createdUser = response.json()
```

2. Add another call to `check` that verifies that `username` and `email` in the response corresponds with what was sent in the request. Test your solution by running k6 like before.

    <details>

    <summary>:moneybag: Extra credit: What if the request fails?</summary>

    The request can fail, especially when load testing, resulting in errors from the k6 runtime when trying to call `Response.json()`. An easy way to handle that is to wrap the code using the response body in an `if` block.

    See what happens if you try performing a request to an invalid URL, fix it and then test again. (Make sure to correct the URL again, before moving on to the next task.)

    </details>

:information_source: You can check out the [documentation](https://k6.io/docs/using-k6/checks/) for more information about `check`.

#### 1c: Call multiple endpoints

`http.get(url)` can be used to perform a GET request to the supplied `url` and generate statistics. The URL to get the user with `id` is `/users/[id]`.

1. Add a request to get the user. The GET request should only be called if the user was created successfully. Test that it works as expected.

2. Add checks for the response, verifying that the status and body is correct.

#### 1d: Handling status codes that should be handled as errors

You might already have encountered non-successful error codes. Trying to create a user with a non-unique username or email will return a `409` response.

1. Make range of the random numbers generated for the username smaller. Adjust up the duration and VUs, and see that your tests and checks fails when running k6.

2. Modify the `http.post` call to send [`expectedStatuses`](https://k6.io/docs/javascript-api/k6-http/expectedstatuses/) with both `200` and `409` response codes to the [`responseCallback` parameter](https://k6.io/docs/javascript-api/k6-http/params/). k6 will now consider `409` a valid response status code. Also remove or modify the previous check for 200 response status code. Run k6 again, verify that all checks succeed and `http_req_failed` is `0.00%`.

#### 1e: Thresholds

Some services might have service level objectives. These might specified like "99% of requests should be served in less than 500ms". Thresholds are specified in a specially exported options object. Read [the documentiation](https://k6.io/docs/using-k6/thresholds/) to get a good introduction.

1. Create thresholds for testing that 99% requests are served in less than 500ms and the average response duration is less than 300ms. Use the `http_req_duration` metric. **Note:** Multiple thresholds for the same metric must be specified in the same list, as seen [in the documentation](https://k6.io/docs/using-k6/thresholds/#multiple-thresholds-on-a-single-metric). Verify that the test succeed.

2. Change the average threshold to something very low, e.g., 10ms. Run the tests again and verify that the thresholds fail.


### 2: Todo lists

#### 2a: Create user & todo lists

We'll now move on to creating todo lists. In our domain, a single user can create many todo lists. There's no need to add `sleep` calls, we'll get to that in later sub-tasks.

1. Create a new file, `create-todo-lists.js`. Create a user like in previous tasks, and add a check to confirm that the 200 status code is returned.

2. If the user is created correctly, create a todo list. A todo lists can be created by a `POST /todo-lists` call (i.e., use `http.post`), with a body: `{ ownerId: int, name: string }`. The `ownerId` must correspond to an existing user, and the `name` can be any string. The endpoint returns a todo list object:  `{ id: int, ownerId: int, name: string }`. Add a `check` to verify that the response status code is `200`.

3. Add a call to `DELETE /users/{id}` (use `http.del`, see the [documentation](https://k6.io/docs/javascript-api/k6-http/del/)) after creating the todo list to clean up. The application uses cascading deletes, so there's no need to delete the todo list first, it will be deleted automatically. Add a `check` to verify that the status code is `200`.

4. Verify that your code runs correctly.

#### 2b: Setup & teardown

In task 2a, we had a lot of code to create and delete user just for testing the performance of creating a todo list. k6, like other testing frameworks, support setup and teardown functions. We'll refactor the code to use those.

1. Read quickly through the [test lifecycle documentation page](https://k6.io/docs/using-k6/test-lifecycle/). Don't worry if all of it doesn't make sense yet.

2. Create `setup` and `teardown` functions that create and delete the user respectively. The `setup` function should return the `id` of the generated user, and both the VU function (the `export default function` you've already created) and the `teardown` function should take the `id` as parameter, avoiding global variables. This way we only create a single user for the test, instead of one user per iteration. As an added benefit, the code should be simpler. `check` can be used in both `setup` and `teardown` functions, so move the `check`s created in 2a to the respective methods.

3. Run with 10 VUs for 5 seconds. Notice that checks in `setup` and `teardown` are grouped separately in the output.

#### 2c: Options

We've already used `options` for defining thresholds. Options can be used for many things, including overriding user agents, DNS resolution or specifying test run behavior. We'll now look at two simple ways to define duration and VUs in the script. You can read more about options in the [documentation](https://k6.io/docs/using-k6/k6-options/how-to/).

1. Create the options object, and specify 10 VUs for a duration of 5 seconds. Take a look at the [options reference for duration](https://k6.io/docs/using-k6/k6-options/reference/#duration) to see an example. Run `k6 run create-todo-lists.js` (without the VU & duration CLI arguments) and verify from the output that it works.

2. We can ramp up and down the number of VUs dynamically. The simplest way is to define `stages` in the `options` object. This will use something called a "ramping VUs executor". We'll look more into executors later. For now, remove `vus` and `duration` from `options`, have a look at the [`stages` docs](https://k6.io/docs/using-k6/k6-options/reference/#stages), and define 3 stages: ramp up to 10 VUs in 10 sec, then up to 100 VUs in 20 sec, and finally down to 5 VUs in 10 sec. When running it, notice how the number of VUs increases and decreases in the output, like in the example below:

  ```
  running (0m23.4s), 069/100 VUs, 4181 complete and 0 interrupted iterations
  default   [=====================>----------------] 069/100 VUs  23.3s/40.0s
  ```

3. Options can be overridden by CLI arguments. Without modifying the code, use CLI arguments to run with 10 VUs for 2 seconds. You can read more about the order of precedence in the [documentation](https://k6.io/docs/using-k6/k6-options/how-to/). *Hint:* Use `--duration` and `--vus` arguments like before.


#### 2d: The `init` stage

So far, we've used the `setup` and `teardown` stages, which runs **once per test invocation**. We'll now look at different ways to create test data using the [`init` stage](https://k6.io/docs/using-k6/test-lifecycle/). This is just a fancy name of putting code outside a function, i.e. in the global scope. The code in the `init` scope will generally be run **once per VU**, and can be used to generate useful test code. The `init` stage restricts HTTP calls, meaning that it's not possible to call any of the `http.*` functions to create test data. `setup()` must be used instead if that is needed.

1. In the `init` stage, create a list of random todo list names, `todoListNames`, using a for-loop and the `randInt` function from `utils.js` that's also used for creating unique usernames. In the VU stage function, use a random name from the array every time (i.e., use this: `todoListNames[randInt(0, todoListNames.length)]`). This illustrates how to create unique variables per VU, which can be useful for generating test data. Run the test and verify everything works correctly.


2. The previous example generates unique test data per VU. It is also possible to share test data between VUs. Take a look at the [documentation for `SharedArray`](https://k6.io/docs/javascript-api/k6-data/sharedarray/), and modify the code from the previous step to use a `SharedArray` instead. Run the test and verify that everything works correctly.

#### 2e: Creating a user per VU during setup

Like mentioned in task 2d, we can't call `http.*` functions to create test data. So, if we want pre-created users for each VU, we'll need to create them in the `setup()` function. How do we do that? Note that in this case, the maximum number of users are 100.

1. Modify `setup()` to create 100 users, and return a list of user IDs. Modify `teardown()` to loop over the list it now receives as a parameter, and delete every user.

2. The main VU function must be modified to take a list of user IDs. To assign a unique Id per VU, we will use [execution context variables](https://k6.io/docs/using-k6/execution-context-variables/), specifically `vu.idInTest`. This will be a number between 1 and 100 (inclusive), and can be used to index the array to retrieve a unique user ID. For an example, look at this [data parametrization example](https://k6.io/docs/examples/data-parameterization/#retrieving-unique-data) (it uses scenarios, which we will look at later).

3. Run the test, and verify that it runs correctly. If you look at the application logs, notice that the `ownerId` for created todo lists varies.

### 3: Todos

Let's move on to working with the actual todos. There's three helper methods in `utils.js`, creating thin, reusable wrappers around `http.*` calls to todos endpoints: `createTodo()`, `patchTodo()` and `deleteTodo()`, all of which return the state of the modified todo. Your editor's autocomplete features should be able to help you with signatures of parameters and return values. There are no helper methods for working with users and todo lists, but feel free to create your own wrapper methods in `utils.js` as needed.

#### 3a

We will now start working with scenarios. Scenarios are useful for simulating realistic user/traffic patterns and gives lots of flexibility in load tests. A scenario is a single traffic pattern, and by combining scenarios, we can create complex usages. For instance, imagine the following scenarios:

* Scenario 1: About 20 users signs up each hour. Each user creates a todo list, and adds a couple of todos.
* Scenario 2: The application has a baseline of a 40 users 24/7, creating, modifying and deleting todos on existing todo lists. On top of the baseline usage, the traffice starts increasing about 6 in the morning, ramps up to about 100 (total) users by 11 and stays like that until 15, whern it starts to slowly decrease down to the baseline 20 again.
* Scenario 3: Your new fancy todo app gains popularity on Reddit, and for at any giving time during the lunch hour (11-12) around 100 users signs up.
* Scenario 4: A batch job runs every hour, deleting around 20 inactive users each time.

All of these scenarios has different traffic patterns, and we control them by using *executors*. Executors can control arraival rate, ramping up and down and iteration distribution between VUs. Read briefly through the [main scenarios documentation page](https://k6.io/docs/using-k6/scenarios/) to get an overview of scenarios, executors and the syntax to create them.

We'll implement all of these scenarios, but for the sake of the tutorial and short load test runs, we'll assume 1 (real-life) hour is 5 seconds.

1. Create a new file, `create-todo-scenarios.js`.

2. Let's start with **scenario 1**. In the `export default function`, create a user, create a todo list for the user and add 5 todos to the list. The description of the todo does not matter. There's a 50ms delay between adding each todo (use `sleep(0.05)`). Add `check`s where you think it's appropriate. We'll make this a scenario in the next step, for now verify that the code works by running k6 with a low number of VUs for a short duration. *Hint:* Copying code from previous tasks, and creating reusable functions will make this and the following steps quicker to implement. *Extra credit:* Create a randomized number of todos (3-10) in the todo list (use `randInt`) to better simulate realistic traffic.

3. We'll assume the users signing up are evenly spread out inside the time range, and we'll therefore use the [constant arrival rate executor](https://k6.io/docs/using-k6/scenarios/executors/constant-arrival-rate/). Take a look at the [docs](https://k6.io/docs/using-k6/scenarios/executors/constant-arrival-rate/) and think about what the `duration`, `rate` and `timeUnit` should be for this scenario (remember, 1h = 5 seconds). Create an `options` object (like previous tasks, remember to `export` it!), and add a `signups` scenario, using constant arrival rate, the `duration`, `rate` and `timeUnit` you decided, and `preAllocatedVUs` = 1. *Hint:* `duration = 120s`, `rate = 20` and `timeUnit = 5s`.

  Run k6 (without duration and VUs CLI arguments!). You should get a warning about "Insufficient VUs", but let the test continue to run. Notice the `dropped_iterations` metrics after the test is completed. This should usually be zero, but misconfigurations of exectuor can cause this. `dropped_iterations` can also be caused by overloading the system under test. Take a look at the [docs](https://k6.io/docs/using-k6/scenarios/concepts/dropped-iterations/) to learn more about `dropped_iterations`.

4. Set `preAllocatedVUs` to 5, and `maxVUs` to 50 for the scenario and run the test again. Observe that the number of VUs might scale during the test run, in order to serve requests fast enough.

5. To accommodate for multiple scenarios, we will stop using `export default function()` and instead use "scenario functions". Remove `default` and name the function `signups`. In the definition of the scenario (in the `options` object), add `exec: 'signups'`. Read more in the [additional lifecycle functions documentation](https://k6.io/docs/using-k6/test-lifecycle/#additional-lifecycle-functions). Re-run the test to verify that it still works.

6. Moving on to **scenario 2**. Create 100 test users with corresponding todo lists in `setup()`, using a similar approach to what you did in task 2e. Create a function called `todos` for our new `todos` scenario - it should select it's todo list from the parameter, create, patch and delete some todos. `sleep` in between operations (50-150ms shoud be enough). To simulate the number of VUs increasing and decreasing, use the [ramping VUs executor](https://k6.io/docs/using-k6/scenarios/executors/ramping-vus/). We've already used the simplified syntax for this when using `stages` before, remember? In total, you need 5 stages to simulate the scenario described. Use 40 `startVUs`. Run the test and confirm that everything still works.

7. For **scenario 3** we'll have 100 users continuously signing up for 1 hour (i.e., 5s for us). We will use the [constant VUs executor](https://k6.io/docs/using-k6/scenarios/executors/constant-vus/). However, because we don't want do this from the start, but during "lunch time" the executor needs to have a delayed start. For that we'll use `startTime`, one of the [common scenario options](https://k6.io/docs/using-k6/scenarios/#options), with a good example [here](https://k6.io/docs/using-k6/scenarios/advanced-examples/#combine-scenarios). Create a function `lunchTime` that creates a single user, and a `lunchTime` scenario to execute the function. Run the test. Notice that our scenario is in a `waiting` state with a countodown until `startTime` time has passed.

8. Finally, for **scenario 4**, we're looking at a scenario with repeating spikes in traffic every "hour", typical for applications with batch jobs that runs every hour/day/etc. There are no executors that directly support this repeated spike pattern, but we can use different methods to simulate it. We'll use a the [constant arrival rate executor](https://k6.io/docs/using-k6/scenarios/executors/constant-arrival-rate/) again, with `rate = 1` and `timeUnit = 5s` deleting 20 users with a loop in the scenario function (what should `duration` and `preAllocatedVUs` be, and why does this work?). We'll have to create the users to delete in `setup()`. Since scenario 2 also creates data in setup, we'll have to make sure they don't interfere which each other's test data. This can be achieved by returning an object like `{ todoScenarioTodoListIds: number[], batchScenarioUserIds: number[] }`, each scenario reading their respective lists. Change the `setup()` function, and update scenario 2 to match. Implement the `batch` scenario function to use the correct array in the object parameter, and loop over the 20 next users. Use the `scenario.iterationInInstance` [execution environment variable](https://k6.io/docs/javascript-api/k6-execution/#scenario) to keep track of where you are in the array. Run the test

## Running the app locally

If you want to run the app locally, outside a Docker container, you need [npm and node 18](https://nodejs.org/en/download/package-manager). If you're using `nvm` to mange node, run `nvm use 18`. If you're using `brew`, `brew install node@18` installs both.

1. Spin up the database in a container: From anywhere, run `docker run -e "ACCEPT_EULA=Y" -e 'MSSQL_SA_PASSWORD=k6-workshop!' -p 1433:1433 -d --name k6-workshop-database --rm mcr.microsoft.com/azure-sql-edge:latest` to start a database in a container in the background. (After the workshop: Run `docker stop k6-workshop-database` to stop and remove the database.)
2. From the repository root folder, run `npm ci`, followed by `npx prisma migrate dev` and `npm run dev` to start the demo app.
