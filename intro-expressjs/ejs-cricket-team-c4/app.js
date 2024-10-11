const express = require('express')
const app = express()
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const dbpath = path.join(__dirname, 'cricketTeam.db')

let db = null

app.use(express.json())

const initializeDB = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })
  } catch (e) {
    console.log(`DB error ${e.message}`)
    process.exit(1)
  }
}

initializeDB()

app.get('/players/', async (request, response) => {
  const getPlayersQuery = `
    SELECT
      player_id as playerId,
      player_name as playerName,
      jersey_number as jerseyNumber,
      role as role
    FROM
      cricket_team
    ORDER BY
      player_id;
    `

  const playersArray = await db.all(getPlayersQuery)
  response.send(playersArray)
})

//Add Player API
app.post('/players/', async (request, response) => {
  const getDetails = request.body
  const {playerName, jerseyNumber, role} = getDetails
  const addPlayerQuery = `
  INSERT INTO 
      cricket_team(player_name, jersey_number, role)
  values(
    ?,
    ?,
    ?
  );`
  await db.run(addPlayerQuery, playerName, jerseyNumber, role)
  response.send('Player Added to Team')
})

//Get player API
app.get('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  const getPlayerQuery = `
  select 
    *
  from
      cricket_team
  where
   player_id = ${playerId};`
  const player = await db.get(getPlayerQuery)
  const {player_id, player_name, jersey_number, role} = player
  const dbResponse = {
    playerId: player_id,
    playerName: player_name,
    jerseyNumber: jersey_number,
    role: role,
  }
  response.send(dbResponse)
})

//update Book API
app.put('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  const getBody = request.body
  const {playerName, jerseyNumber, role} = getBody
  const updatePlayerQuery = `
  update
    cricket_team
  set 
    player_name ='${playerName}',
    jersey_number = ${jerseyNumber},
    role = '${role}' 
  where
    player_id = ${playerId} ;`
  await db.run(updatePlayerQuery)
  response.send('Player Details Updated')
})

//Delete Player API
app.delete('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  const deletePlayerQuery = `
    delete
      from cricket_team
    where
      player_id = ${playerId};`
  await db.run(deletePlayerQuery)
  response.send('Player Removed')
})

module.exports = app
