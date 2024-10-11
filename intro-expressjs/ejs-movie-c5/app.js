const express = require('express')
const app = express()
app.use(express.json())
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, 'moviesData.db')

let db = null

const initializeDB = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
  } catch (e) {
    console.log(`DB error ${e.message}`)
    process.exit(1)
  }
}
initializeDB()

//get all movies
app.get('/movies/', async (request, response) => {
  const getMovies = `
    SELECT movie_name as movieName FROM movie;
  `
  const dbResponse = await db.all(getMovies)
  response.send(dbResponse)
})

// Post Movie API
app.post('/movies', async (request, response) => {
  const {directorId, movieName, leadActor} = request.body
  const addMovieQuery = `
    INSERT INTO movie (director_id, movie_name, lead_actor)
    VALUES (
      ${directorId},
      '${movieName}',
      '${leadActor}'
    );
  `

  await db.run(addMovieQuery)
  response.send('Movie Successfully Added')
})

//get movie by ID
app.get('/movies/:movieId', async (request, response) => {
  const {movieId} = request.params
  const getMovie = `
    SELECT 
      movie_id as movieId,
      director_id as directorId,
      movie_name as movieName,
      lead_actor as leadActor
    FROM movie WHERE movie_id=${movieId};
  `
  const dbResponse = await db.get(getMovie)
  response.send(dbResponse)
})

//update an movie
app.put('/movies/:movieId', async (request, response) => {
  const {movieId} = request.params
  const {directorId, movieName, leadActor} = request.body
  const updateMovie = `
    UPDATE movie set 
      director_id = ${directorId},
      movie_name = '${movieName}',
      lead_actor = '${leadActor}'

      WHERE 
      movie_id = ${movieId}
    ;
  `

  await db.run(updateMovie)
  // const movieId = dbResponse.lastID;
  response.send('Movie Details Updated')
})

//delete movie by id
app.delete('/movies/:movieId', async (request, response) => {
  const {movieId} = request.params
  const deleteMovie = `
    DELETE FROM movie WHERE movie_id=${movieId};
  `
  await db.get(deleteMovie)
  response.send('Movie Removed')
})

//get all directors
app.get('/directors/', async (request, response) => {
  const getDirectors = `
    SELECT 
    director_id as directorId,
    director_name as directorName
     FROM director;
  `
  const dbResponse = await db.all(getDirectors)
  response.send(dbResponse)
})

//movies directed by director id
app.get('/directors/:directorId/movies', async (request, response) => {
  const {directorId} = request.params
  const getMovies = `
    SELECT movie_name as movieName FROM movie WHERE director_id=${directorId};
  `
  const dbResponse = await db.all(getMovies)
  response.send(dbResponse)
})

module.exports = app
