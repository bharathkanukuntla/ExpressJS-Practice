const express = require('express')
const app = express()
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, 'todoApplication.db')
let db = null

app.use(express.json())

// Initialize the database
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    // Insert some initial data if table is empty
    const tableExistsQuery = 'SELECT COUNT(*) as count FROM todo;'
    const {count} = await db.get(tableExistsQuery)
    if (count === 0) {
      const insertInitialDataQuery = `
        INSERT INTO todo (id, todo, priority, status)
        VALUES
          (1, 'Watch Movie', 'LOW', 'TO DO'),
          (2, 'Learn Node JS', 'HIGH', 'IN PROGRESS'),
          (3, 'Read a book', 'MEDIUM', 'DONE');
      `
      await db.run(insertInitialDataQuery)
    }
  } catch (error) {
    console.error(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

app.get('/todos/', async (request, response) => {
  const {status, priority, search_q = ''} = request.query

  let getTodosQuery = `
    SELECT
      *
    FROM
      todo
    WHERE
      todo LIKE '%${search_q}%'`

  if (status !== undefined && priority !== undefined) {
    getTodosQuery += ` AND status = '${status}' AND priority = '${priority}'`
  } else if (status !== undefined) {
    getTodosQuery += ` AND status = '${status}'`
  } else if (priority !== undefined) {
    getTodosQuery += ` AND priority = '${priority}'`
  }

  const todos = await db.all(getTodosQuery)
  response.send(todos)
})

app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const getTodoQuery = `SELECT * FROM todo WHERE id = ${todoId};`
  const todo = await db.get(getTodoQuery)
  response.send(todo)
})

app.post('/todos/', async (request, response) => {
  const {id, todo, priority, status} = request.body
  const addTodoQuery = `
    INSERT INTO
      todo (id, todo, priority, status)
    VALUES
      (${id}, '${todo}', '${priority}', '${status}');`
  await db.run(addTodoQuery)
  response.send('Todo Successfully Added')
})

// API 4: Update a specific todo based on todoId
app.put('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const {status, priority, todo} = request.body

  if (status !== undefined) {
    const updateStatusQuery = `UPDATE todo SET status = '${status}' WHERE id = ${todoId};`
    await db.run(updateStatusQuery)
    response.send('Status Updated')
  } else if (priority !== undefined) {
    const updatePriorityQuery = `UPDATE todo SET priority = '${priority}' WHERE id = ${todoId};`
    await db.run(updatePriorityQuery)
    response.send('Priority Updated')
  } else if (todo !== undefined) {
    const updateTodoQuery = `UPDATE todo SET todo = '${todo}' WHERE id = ${todoId};`
    await db.run(updateTodoQuery)
    response.send('Todo Updated')
  }
})

// API 5: Delete a todo based on todoId
app.delete('/todos/:todoId/', async (req, res) => {
  const {todoId} = req.params
  const deleteTodoQuery = `DELETE FROM todo WHERE id = ${todoId}`
  await db.run(deleteTodoQuery)
  res.send('Todo Deleted')
})

module.exports = app
