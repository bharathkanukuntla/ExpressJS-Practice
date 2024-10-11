const express = require('express')
const path = require('path')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()

const dbPath = path.join(__dirname, 'covid19India.db')
app.use(express.json())
let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

//get states
app.get('/states/', async (request, response) => {
  const getStatesQuery = `
    SELECT
      state_id as stateId,
      state_name as stateName,
      population as population
    FROM
     state;
     `
  const dbResponse = await db.all(getStatesQuery)
  response.send(dbResponse)
})

//get states by id
app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const getStateById = `
    SELECT
      state_id as stateId,
      state_name as stateName,
      population as population
    FROM
      state
    WHERE
      state_id = ${stateId};`
  const dbResponse = await db.get(getStateById)
  response.send(dbResponse)
})

//create district
app.post('/districts/', async (request, response) => {
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  const addDistrictQuery = `
    INSERT INTO
      district (district_name, state_id, cases, cured, active, deaths)
    VALUES
      (
        '${districtName}',
        ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths}
      );`

  await db.run(addDistrictQuery)
  //   const destrictId = dbResponse.lastID
  response.send('District Successfully Added')
})

//get distsrict by id
app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictById = `
    SELECT
      district_id as districtId,
      district_name as districtName,
      state_id as stateId,
      cases as cases,
      cured as cured,
      active as active,
      deaths as deaths 
    FROM
      district
    WHERE
      district_id = ${districtId};`
  const dbResponse = await db.get(getDistrictById)
  response.send(dbResponse)
})

//delete district by id
app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deleteDIstrictQuery = `
    DELETE FROM
      district
    WHERE
      district_id = ${districtId};`
  await db.run(deleteDIstrictQuery)
  response.send('District Removed')
})

//update district By Id
app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  const updateDistrictQuery = `
    UPDATE
      district
    SET
      district_name = '${districtName}',
      state_id = ${stateId},
      cases = ${cases},
      cured = ${cured},
      active = ${active},
      deaths = ${deaths}
    WHERE
      district_id = ${districtId};`
  await db.run(updateDistrictQuery)
  response.send('District Details Updated')
})

//get statistics of cases by stateid
app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getStatsById = `
    SELECT
      SUM(cases) as totalCases,
      SUM(cured) as totalCured,
      SUM(active) as totalActive,
      SUM(deaths) as totalDeaths
    FROM
      district
    WHERE
      state_id = ${stateId};`
  const dbResponse = await db.get(getStatsById)
  response.send(dbResponse)
})

//
app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const getStateByDistrictId = `
    SELECT
      state.state_name stateName
    FROM
    state INNER JOIN district ON state.state_id = district.state_id
    WHERE
      district.district_id = ${districtId};`

  const dbResponse = await db.get(getStateByDistrictId)
  response.send(dbResponse)
})

module.exports = app
