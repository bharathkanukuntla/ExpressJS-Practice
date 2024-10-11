const express = require('express')
const app = express()
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const dbpath = path.join(__dirname, 'cricketMatchDetails.db')

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

//Get player API
app.get('/players/', async (request, response) => {
  const getPlayersQuery = `SELECT player_id AS playerId, player_name AS playerName FROM player_details`
  const playersArray = await db.all(getPlayersQuery)
  response.send(playersArray)
})

//get players by player ID
app.get('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  const getPlayerQuery = `SELECT player_id AS playerId, player_name AS playerName FROM player_details WHERE player_id = ${playerId}`
  const player = await db.get(getPlayerQuery)
  response.send(player)
})

//update player by ID
app.put('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  const getBody = request.body
  const {playerName} = getBody
  const updatePlayerQuery = `
  update
    player_details
  set 
    player_name ='${playerName}'
  where
    player_id = ${playerId} ;`
  await db.run(updatePlayerQuery)
  response.send('Player Details Updated')
})

//get match details by matchId
app.get('/matches/:matchId/', async (request, response) => {
  const {matchId} = request.params
  const getMatchQuery = `SELECT match_id AS matchId, match, year FROM match_details WHERE match_id = ${matchId}`
  const match = await db.get(getMatchQuery)
  response.send(match)
})

//get match details by player id
app.get('/players/:playerId/matches', async (request, response) => {
  const {playerId} = request.params
  const getMatchDetails = `
  select 
    match_details.match_id as matchId,
    match_details.match,
    match_details.year
  from
      match_details INNER JOIN player_match_score ON
      match_details.match_id = player_match_score.match_id
  where
   player_match_score.player_id = ${playerId};`

  const match = await db.all(getMatchDetails)
  response.send(match)
})

//get match details by player id
app.get('/matches/:matchId/players', async (request, response) => {
  const {matchId} = request.params
  const getMatchDetails = `
  select 
    player_details.player_id as playerId,
    player_details.player_name as playerName
  from
      player_details INNER JOIN player_match_score ON
      player_details.player_id = player_match_score.player_id
  where
   player_match_score.match_id = ${matchId};`

  const match = await db.all(getMatchDetails)
  response.send(match)
})

//get match details by player id
app.get('/players/:playerId/playerScores', async (request, response) => {
  const {playerId} = request.params
  const getMatchDetails = `
  select 
    player_details.player_id as playerId,
    player_details.player_name as playerName,
    sum(player_match_score.score) as  totalScore,
    sum(player_match_score.fours) as  totalFours,
    sum(player_match_score.sixes) as  totalSixes
  from
      player_details INNER JOIN player_match_score ON
      player_details.player_id = player_match_score.player_id
  where
   player_match_score.player_id = ${playerId};`
  const match = await db.get(getMatchDetails)
  response.send(match)
})

module.exports = app
