const express = require('express')
const path = require('path')
const bcrypt = require('bcrypt')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()
app.use(express.json())
const dbPath = path.join(__dirname, 'userData.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

app.post('/register', async (request, response) => {
  const {username, name, password, gender, location} = request.body
  const hashedPassword = await bcrypt.hash(request.body.password, 10)
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
  const dbUser = await db.get(selectUserQuery)
  if (dbUser !== undefined) {
    response.status(400).send('User already exists')
  } else if (password.length < 5) {
    response.status(400).send('Password is too short')
  } else {
    const createUserQuery = `
      INSERT INTO 
        user (username, name, password, gender, location) 
      VALUES 
        (
          '${username}', 
          '${name}',
          '${hashedPassword}', 
          '${gender}',
          '${location}'
        )`
    const dbResponse = await db.run(createUserQuery)
    // const newUserId = dbResponse.lastID;
    response.status(200).send(`User created successfully`)
  }
})

app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched === false) {
      response.status(400)
      response.send('Invalid password')
    } else {
      response.status(200).send('Login success!')
    }
  }
})

//update password

app.put('/change-password', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body

  // Get user from database
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
  const dbUser = await db.get(selectUserQuery)

  if (dbUser === undefined) {
    response.status(400).send('User not found')
  } else {
    // Check if the old password is correct
    const isPasswordMatched = await bcrypt.compare(oldPassword, dbUser.password)

    if (!isPasswordMatched) {
      response.status(400).send('Invalid current password')
    } else if (newPassword.length < 5) {
      response.status(400).send('Password is too short')
    } else {
      // Hash the new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10)

      // Update the password in the database
      const updatePasswordQuery = `UPDATE user SET password = '${hashedNewPassword}' WHERE username = '${username}'`
      await db.run(updatePasswordQuery)

      response.status(200).send('Password updated')
    }
  }
})

module.exports = app
