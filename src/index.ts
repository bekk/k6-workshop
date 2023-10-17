import cors from 'cors'
import express, { ErrorRequestHandler, Request, Response } from 'express'
import { Prisma, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const app = express()

app.use(cors())
app.use(express.json())

type HealtcheckResponseDto = { message: string }
app.get('/healthcheck', async (req: Request<{}, HealtcheckResponseDto>, res, next) => {
  logRequest(req)
  try {
    await prisma.$connect()
    res.status(200).json({message: "Database connection ok."});
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientInitializationError) {
      res.status(501).json({message: err.message});
    } else {
      next(err);
    }
  }
});

type Dto<T extends object> = {
  [K in keyof T]: string
}

type RemoveId<T extends object> = Omit<T, "id">

type PartialBy<T extends object, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

type User = {
  id: number,
  username: string,
  email: string
}

type TodoList = {
  id: number
  ownerId: number
  name: string
}

type Todo = {
  id: number
  listId: number
  description: string
  completed: boolean
}

type TodoListWithItems = TodoList & { todos: Omit<Todo, "listId">[] }

type ErrorDto = { message: string }

const logRequest = (req: Request): void => {
  const body = req.body === undefined ? undefined : JSON.stringify(req.body);
  const message =`Received ${req.method} ${req.originalUrl} with body: ${body ?? "[No body]"}`
  console.info(message)
}

const logSerializedError = (err: unknown) => console.error(`ERROR: ${JSON.stringify(err)}`)

const getErrorWithMessage = (msg: string): ErrorDto => {
  return { message: msg };
}

const tryHandleUniqueConstraint = (res: Response,  err: unknown): boolean => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const msg = `Unique constraint failed: ${err.meta?.target ?? "[No meta information]"}`
      console.info(msg)
      res.status(409).json({
        'message': msg
      })
      return true
    }
  }
  return false
}

type CreateUserDto = Dto<RemoveId<User>>;
app.post('/users', async (req: Request<{}, User | ErrorDto, Partial<CreateUserDto>>, res, next) => {
  try {
    logRequest(req)

    const dto = req.body;
    if (dto.email === undefined || dto.username === undefined) {
      res.status(400).json(getErrorWithMessage("Email and username fields are required."))
      return
    }

    const user = await prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username
      }
    })
    res.status(200).json(user);
  }
  catch (err: unknown) {
    if(tryHandleUniqueConstraint(res, err)) return
    next(err);
  }

})

app.get('/users/:id', async (req: Request<{id: string}, User | ErrorDto>, res, next) => {
  try {
    logRequest(req)

    const id = Number.parseInt(req.params.id)

    const user = await prisma.user.findUnique({
      where: { id: id }
    })

    if (user === null) {
      res.status(404).json({ message: "User not found" })
      return
    }

    res.status(200).json(user)
  }
  catch (err: unknown) {
    next(err)
  }
})

type DeleteUserResponseDto = Pick<User, "id">
app.delete('/users/:id', async (req: Request<{id: string}, DeleteUserResponseDto | ErrorDto>, res, next) => {
  try {
    logRequest(req)
    const id = Number.parseInt(req.params.id)

    const batchPayload = await prisma.user.deleteMany({
      where: { id: id }
    })
    if (batchPayload.count === 0) {
      res.status(404).json({ message: "User not found" })
    } else if (batchPayload.count === 1) {
      res.status(200).json({ id: id });
    } else {
      res.sendStatus(500)
    }
  }
  catch (err: unknown) {
    next(err)
  }
})

app.get('/users', async (_req : Request<{}, User[]>, res, next) => {
  try {
    const users = await prisma.user.findMany({})
    res.status(200).json(users)
  }
  catch (err: unknown) {
    next(err)
  }
})


type CreateTodoListDto = Dto<RemoveId<TodoList>>;
app.post('/todo-lists', async (req: Request<{}, TodoList | ErrorDto, Partial<CreateTodoListDto>>, res, next) => {
  try {
    logRequest(req);
    const dto = req.body
    if (dto.name === undefined || dto.ownerId === undefined) {
      res.status(400).json(getErrorWithMessage("Owner and name fields are required"))
      return
    }

    const ownerId = Number.parseInt(dto.ownerId)
    if (Number.isNaN(ownerId)) {
      res.status(400).json(getErrorWithMessage("Owner field must be a valid integer"))
      return
    }

    const todoList = await prisma.todoList.create({
      data: {
        name: dto.name,
        owner: {
          connect: {
            id: ownerId
          }
        }

      }
    })

    res.status(200).json(todoList)
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        const msg = `User id ${req.body.ownerId} is a non-existent user id. Detailed error message: ${err.meta?.cause ?? "[No cause available]"}`
        console.info(msg)
        res.status(400).json(getErrorWithMessage(msg))
        return
      }
    }
    console.error(JSON.stringify(err))
    next(err);
  }
})

app.delete('/todo-lists/:listId', async (req: Request<{listId: string}, Pick<TodoList, 'id'> | ErrorDto>, res, next) => {
  try {
    logRequest(req)
    const id = Number.parseInt(req.params.listId)
    if (Number.isNaN(id)) {
      res.status(404).json(getErrorWithMessage(`Todo list id must be a valid int`))
      return
    }
    
    const batchPayload = await prisma.todoList.deleteMany({
      where: { id: id }
    })
    if (batchPayload.count === 0) {
      res.status(404).json({ message: "Todo list not found" })
    } else if (batchPayload.count === 1) {
      res.status(200).json({ id: id });
    } else {
      res.sendStatus(500)
    }
    res.status(500).json(getErrorWithMessage("Not implemented"))
    return
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        const msg = `Todo list id ${req.body.listId} is a non-existent user id. Detailed error message: ${err.meta?.cause ?? "[No cause available]"}`
        console.info(msg)
        res.status(400).json(getErrorWithMessage(msg))
        return
      }
    }
    console.error(JSON.stringify(err))
    next(err);
  }
})


type CreateTodoDto = PartialBy<Omit<Dto<RemoveId<Todo>>, 'listId'>, 'completed'>
app.post('/todo-lists/:listId/todos', async (req: Request<{listId: string}, Todo | ErrorDto, CreateTodoDto>, res, next) => {
  try {
    logRequest(req)

    const listId = Number.parseInt(req.params.listId);
    const dto = req.body;

    if (dto.description === undefined) {
      res.status(400).json(getErrorWithMessage("Description field is required"))
      return
    }

    if (Number.isNaN(listId)) {
      res.status(400).json(getErrorWithMessage(`The path todo list id must be a valid number, got: '${req.params.listId}'`))
      return
    }

    const completed = (dto.completed === 'true') ?? false;
    const todo = await prisma.todo.create({
      data: {
        description: dto.description,
        completed: completed,
        list: {
          connect: {
            id: listId
          }
        }

      }
    })
    res.status(200).json(todo)
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        const msg = `Todo list id ${req.params.listId} is a non-existent todo list id. Detailed error message: ${err.meta?.cause ?? "[No cause available]"}`
        console.info(msg)
        res.status(400).json(getErrorWithMessage(msg))
        return
      }
    }
    console.error(JSON.stringify(err))
    next(err);
  }
  
})

type PatchTodoDto = Partial<Omit<Dto<RemoveId<Todo>>, 'listId'>>
app.patch('/todo-lists/:listId/todos/:todoId', async (req: Request<{listId: string, todoId: string}, Todo | ErrorDto, PatchTodoDto>, res, next) => {
  try {
    logRequest(req)

    const listId = Number.parseInt(req.params.listId);
    const todoId = Number.parseInt(req.params.todoId);
    const dto = req.body;

    if (dto.description === undefined && dto.completed === undefined) {
      res.status(400).json(getErrorWithMessage("Either description or completed fields must be specified"))
      return
    }

    if (Number.isNaN(listId)) {
      res.status(400).json(getErrorWithMessage(`The path todo list id must be a valid number, got: '${req.params.listId}'`))
      return
    }

    if (Number.isNaN(todoId)) {
      res.status(400).json(getErrorWithMessage(`The path todo id must be a valid number, got: '${req.params.todoId}'`))
      return
    }

    const completed = dto.completed === undefined ? undefined : dto.completed === 'true';
    const todo = await prisma.todo.update({
      where: {
        id: todoId
      },
      data: {
        description: dto.description,
        completed: completed,
      }
    })
    res.status(200).json(todo)
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        const msg = `Todo list id ${req.params.listId} and todo id ${req.params.todoId} must be valid ids. Detailed error message: ${err.meta?.cause ?? "[No cause available]"}`
        console.info(msg)
        res.status(400).json(getErrorWithMessage(msg))
        return
      }
    }
    console.error(JSON.stringify(err))
    next(err);
  }
})

app.delete('/todo-lists/:listId/todos/:todoId', async (req: Request<{listId: string, todoId: string}, Pick<Todo, 'id'> | ErrorDto, PatchTodoDto>, res, next) => {
  try {
    logRequest(req)
    const listId = Number.parseInt(req.params.listId);
    const todoId = Number.parseInt(req.params.todoId);

    if (Number.isNaN(listId)) {
      res.status(400).json(getErrorWithMessage(`The path todo list id must be a valid number, got: '${req.params.listId}'`))
      return
    }

    if (Number.isNaN(todoId)) {
      res.status(400).json(getErrorWithMessage(`The path todo id must be a valid number, got: '${req.params.todoId}'`))
      return
    }

    const batchPayload = await prisma.todo.deleteMany({
      where: {
        id: todoId
      },
    })
    if (batchPayload.count === 0) {
      res.status(404).json({ message: "User not found" })
    } else if (batchPayload.count === 1) {
      res.status(200).json({ id: todoId });
    } else {
      res.sendStatus(500)
    }
    return
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        const msg = `Todo list id ${req.params.listId} and todo id ${req.params.todoId} must be valid ids. Detailed error message: ${err.meta?.cause ?? "[No cause available]"}`
        console.info(msg)
        res.status(400).json(getErrorWithMessage(msg))
        return
      }
    }
    console.error(JSON.stringify(err))
    next(err);
  }
  
})

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const e = err as Error;
  console.error(`Caught error ${e.name}: ${e.message}\n${e.stack}`);
  res.status(500).end();
}
app.use(errorHandler);

app.listen(3000);
