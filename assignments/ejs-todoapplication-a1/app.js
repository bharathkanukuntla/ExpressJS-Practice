const express = require('express')
const app = express()
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const {format} = require('date-fns') // Use date-fns
const dbPath = path.join(__dirname, 'todoApplication.db')

let db = null
app.use(express.json())

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
  } catch (error) {
    console.error(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

// Middleware for validation
const middleWareFunc = (request, response, next) => {
  const {status, priority, category, dueDate} = request.query

  const validStatuses = ['TO DO', 'IN PROGRESS', 'DONE']
  const validPriorities = ['HIGH', 'MEDIUM', 'LOW']
  const validCategories = ['WORK', 'HOME', 'LEARNING']

  // Validate status
  if (status && !validStatuses.includes(status)) {
    return response.status(400).send('Invalid Todo Status')
  }

  // Validate priority
  if (priority && !validPriorities.includes(priority)) {
    return response.status(400).send('Invalid Todo Priority')
  }

  // Validate category
  if (category && !validCategories.includes(category)) {
    return response.status(400).send('Invalid Todo Category')
  }

  // Validate due date
  if (dueDate) {
    const parsedDate = Date.parse(dueDate)
    if (isNaN(parsedDate)) {
      return response.status(400).send('Invalid Due Date')
    }
    request.query.dueDate = format(new Date(dueDate), 'yyyy-MM-dd')
  }

  next()
}

// API 1: GET /todos/ - Retrieve todos with query params
app.get('/todos/', middleWareFunc, async (request, response) => {
  const {status, priority, category, search_q = ''} = request.query

  let getTodosQuery = `
    SELECT 
      id, todo, priority, status, category, due_date AS dueDate
    FROM 
      todo 
    WHERE todo LIKE '%${search_q}%' `

  if (status) {
    getTodosQuery += `AND status = '${status}' `
  }

  if (priority) {
    getTodosQuery += `AND priority = '${priority}' `
  }

  if (category) {
    getTodosQuery += `AND category = '${category}' `
  }

  const todos = await db.all(getTodosQuery)
  response.send(todos)
})

// API 2: GET /todos/:todoId/ - Get specific todo by ID
app.get('/todos/:todoId/', middleWareFunc, async (request, response) => {
  const {todoId} = request.params
  const getTodoQuery = `
    SELECT id, todo, priority, status, category, due_date AS dueDate 
    FROM todo 
    WHERE id = ${todoId};
  `
  const todo = await db.get(getTodoQuery)
  response.send(todo)
})

// API 3: GET /agenda/ - Retrieve todos by due date
app.get('/agenda/', middleWareFunc, async (request, response) => {
  const {date} = request.query

  // Validate the date
  const parsedDate = Date.parse(date)
  if (isNaN(parsedDate)) {
    return response.status(400).send('Invalid Due Date')
  }

  const formattedDate = format(new Date(date), 'yyyy-MM-dd')
  const getTodosByDateQuery = `
    SELECT id, todo, priority, status, category, due_date AS dueDate 
    FROM todo 
    WHERE due_date = '${formattedDate}';
  `
  const todos = await db.all(getTodosByDateQuery)
  response.send(todos)
})

/// API 4: POST /todos/ - Create a new todo
app.post('/todos/', middleWareFunc, async (request, response) => {
  const {id, todo, priority, status, category, dueDate} = request.body

  // Validate input fields
  if (!id || !todo || !priority || !status || !category || !dueDate) {
    return response.status(400).send('Invalid Input')
  }

  // Check for valid dueDate format
  const parsedDueDate = Date.parse(dueDate)
  if (isNaN(parsedDueDate)) {
    return response.status(400).send('Invalid Due Date')
  }

  const formattedDueDate = format(new Date(dueDate), 'yyyy-MM-dd')

  // Check for valid status, priority, category
  if (!['TO DO', 'IN PROGRESS', 'DONE'].includes(status)) {
    return response.status(400).send('Invalid Todo Status')
  }
  if (!['HIGH', 'MEDIUM', 'LOW'].includes(priority)) {
    return response.status(400).send('Invalid Todo Priority')
  }
  if (!['WORK', 'HOME', 'LEARNING'].includes(category)) {
    return response.status(400).send('Invalid Todo Category')
  }

  const createTodoQuery = `
    INSERT INTO todo (id, todo, priority, status, category, due_date)
    VALUES (${id}, '${todo}', '${priority}', '${status}', '${category}', '${formattedDueDate}');
  `
  await db.run(createTodoQuery)
  response.send('Todo Successfully Added')
})

// API 5: PUT /todos/:todoId/ - Update specific todo by ID
app.put('/todos/:todoId/', middleWareFunc, async (request, response) => {
  const {todoId} = request.params
  const {status, priority, todo, category, dueDate} = request.body
  let updateField = ''

  // Validate input fields
  if (dueDate && isNaN(Date.parse(dueDate))) {
    return response.status(400).send('Invalid Due Date')
  }
  if (status && !['TO DO', 'IN PROGRESS', 'DONE'].includes(status)) {
    return response.status(400).send('Invalid Todo Status')
  }
  if (priority && !['HIGH', 'MEDIUM', 'LOW'].includes(priority)) {
    return response.status(400).send('Invalid Todo Priority')
  }
  if (category && !['WORK', 'HOME', 'LEARNING'].includes(category)) {
    return response.status(400).send('Invalid Todo Category')
  }

  if (status) updateField = `status = '${status}'`
  if (priority) updateField = `priority = '${priority}'`
  if (todo) updateField = `todo = '${todo}'`
  if (category) updateField = `category = '${category}'`
  if (dueDate)
    updateField = `due_date = '${format(new Date(dueDate), 'yyyy-MM-dd')}'`

  const updateTodoQuery = `
    UPDATE todo
    SET ${updateField}
    WHERE id = ${todoId};
  `
  await db.run(updateTodoQuery)
  if (dueDate) {
    response.send('Due Date Updated')
  } else {
    response.send(
      `${
        updateField.split(' ')[0][0].toUpperCase() +
        updateField.split(' ')[0].slice(1)
      } Updated`,
    )
  }
})

// API 6: DELETE /todos/:todoId/ - Delete todo by ID
app.delete('/todos/:todoId/', middleWareFunc, async (request, response) => {
  const {todoId} = request.params
  const deleteTodoQuery = `
    DELETE FROM todo
    WHERE id = ${todoId};
  `
  await db.run(deleteTodoQuery)
  response.send('Todo Deleted')
})

module.exports = app
