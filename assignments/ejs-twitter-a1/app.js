const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const path = require('path')
const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'twitterClone.db')
let db

const initializeDB = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
  } catch (e) {
    console.log(`Db Error ${e.message}`)
    process.exit(1)
  }
}

initializeDB()

let secretKey = 'secretKey'

// Middleware to authenticate JWT Token
const authenticateToken = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (authHeader === undefined) {
    response.status(401).send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, secretKey, (error, payload) => {
      if (error) {
        response.status(401).send('Invalid JWT Token')
      } else {
        request.username = payload.username
        next()
      }
    })
  }
}

// API 1: Register a new user
app.post('/register/', async (request, response) => {
  const {username, password, name, gender} = request.body
  const getUserQuery = `SELECT * FROM user WHERE username = '${username}'`
  const dbUser = await db.get(getUserQuery)

  if (dbUser !== undefined) {
    response.status(400).send('User already exists')
  } else if (password.length < 6) {
    response.status(400).send('Password is too short')
  } else {
    const hashedPassword = await bcrypt.hash(password, 10)
    const createUserQuery = `
      INSERT INTO user (name, username, password, gender)
      VALUES ('${name}', '${username}', '${hashedPassword}', '${gender}')
    `
    await db.run(createUserQuery)
    response.status(200).send('User created successfully')
  }
})

// API 2: User Login
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const getUserQuery = `SELECT * FROM user WHERE username = '${username}'`
  const dbUser = await db.get(getUserQuery)

  if (dbUser === undefined) {
    response.status(400).send('Invalid user')
  } else {
    const isPasswordValid = await bcrypt.compare(password, dbUser.password)
    if (!isPasswordValid) {
      response.status(400).send('Invalid password')
    } else {
      const payload = {username}
      const jwtToken = jwt.sign(payload, secretKey)
      response.send({jwtToken})
    }
  }
})

// API 3: Get latest tweets feed of followed users
app.get('/user/tweets/feed/', authenticateToken, async (request, response) => {
  const {username} = request
  const getUserIdQuery = `SELECT user_id FROM user WHERE username = '${username}'`
  const {user_id} = await db.get(getUserIdQuery)

  const getFeedQuery = `
    SELECT user.username AS username, tweet.tweet AS tweet, tweet.date_time AS dateTime
    FROM tweet
    JOIN follower ON follower.following_user_id = tweet.user_id
    JOIN user ON user.user_id = tweet.user_id
    WHERE follower.follower_user_id = ${user_id}
    ORDER BY tweet.date_time DESC
    LIMIT 4
  `
  const feed = await db.all(getFeedQuery)
  response.send(feed)
})

// API 4: Get list of users the logged-in user is following
app.get('/user/following/', authenticateToken, async (request, response) => {
  const {username} = request
  const getUserIdQuery = `SELECT user_id FROM user WHERE username = '${username}'`
  const {user_id} = await db.get(getUserIdQuery)

  const getFollowingQuery = `
    SELECT user.name AS name
    FROM user
    JOIN follower ON follower.following_user_id = user.user_id
    WHERE follower.follower_user_id = ${user_id}
  `
  const following = await db.all(getFollowingQuery)
  response.send(following)
})

// API 5: Get list of users who are following the logged-in user
app.get('/user/followers/', authenticateToken, async (request, response) => {
  const {username} = request
  const getUserIdQuery = `SELECT user_id FROM user WHERE username = '${username}'`
  const {user_id} = await db.get(getUserIdQuery)

  const getFollowersQuery = `
    SELECT user.name AS name
    FROM user
    JOIN follower ON follower.follower_user_id = user.user_id
    WHERE follower.following_user_id = ${user_id}
  `
  const followers = await db.all(getFollowersQuery)
  response.send(followers)
})

// API 6: Get details of a specific tweet by tweet ID
app.get('/tweets/:tweetId/', authenticateToken, async (request, response) => {
  const {username} = request
  const {tweetId} = request.params
  const getUserIdQuery = `SELECT user_id FROM user WHERE username = '${username}'`
  const {user_id} = await db.get(getUserIdQuery)

  // Check if the tweet belongs to a followed user
  const tweetQuery = `
    SELECT tweet.tweet, tweet.date_time AS dateTime, 
           (SELECT COUNT(*) FROM like WHERE tweet_id = tweet.tweet_id) AS likes,
           (SELECT COUNT(*) FROM reply WHERE tweet_id = tweet.tweet_id) AS replies
    FROM tweet 
    JOIN follower ON tweet.user_id = follower.following_user_id 
    WHERE tweet.tweet_id = ${tweetId} AND follower.follower_user_id = ${user_id}
  `
  const tweet = await db.get(tweetQuery)

  if (tweet === undefined) {
    response.status(401).send('Invalid Request')
  } else {
    response.send(tweet)
  }
})

// API 7: Get likes for a specific tweet
app.get(
  '/tweets/:tweetId/likes/',
  authenticateToken,
  async (request, response) => {
    const {username} = request
    const {tweetId} = request.params

    // Get the user's ID based on the username
    const getUserIdQuery = `SELECT user_id FROM user WHERE username = '${username}'`
    const {user_id} = await db.get(getUserIdQuery)

    // Query to get the list of usernames who liked the tweet
    const likesQuery = `
      SELECT user.username AS username
      FROM like 
      JOIN user ON like.user_id = user.user_id 
      WHERE like.tweet_id = ${tweetId}
    `

    const likes = await db.all(likesQuery)

    if (likes.length === 0) {
      response.status(401).send('Invalid Request')
    } else {
      const usernames = likes.map(user => user.username)
      response.send({likes: usernames})
    }
  },
)

// API 8: Get replies for a specific tweet
app.get(
  '/tweets/:tweetId/replies/',
  authenticateToken,
  async (request, response) => {
    const {username} = request
    const {tweetId} = request.params

    // Get the user's ID based on the username
    const getUserIdQuery = `SELECT user_id FROM user WHERE username = '${username}'`
    const {user_id} = await db.get(getUserIdQuery)

    // Query to get replies to the tweet, filtering for users that the current user is following
    const repliesQuery = `
      SELECT user.name AS name, reply.reply AS reply
      FROM reply 
      JOIN user ON reply.user_id = user.user_id 
      WHERE reply.tweet_id = ${tweetId}
      AND reply.user_id IN (
        SELECT following_user_id 
        FROM follower 
        WHERE follower_user_id = ${user_id}
      )
    `

    const replies = await db.all(repliesQuery)

    if (replies.length === 0) {
      response.status(401).send('Invalid Request')
    } else {
      response.send({replies})
    }
  },
)

// API 9: Get all tweets of the logged-in user
app.get('/user/tweets/', authenticateToken, async (request, response) => {
  const {username} = request
  const getUserIdQuery = `SELECT user_id FROM user WHERE username = '${username}'`
  const {user_id} = await db.get(getUserIdQuery)

  const getTweetsQuery = `
    SELECT tweet.tweet, tweet.date_time AS dateTime,
           (SELECT COUNT(*) FROM like WHERE like.tweet_id = tweet.tweet_id) AS likes,
           (SELECT COUNT(*) FROM reply WHERE reply.tweet_id = tweet.tweet_id) AS replies
    FROM tweet 
    WHERE tweet.user_id = ${user_id}
  `
  const tweets = await db.all(getTweetsQuery)
  response.send(tweets)
})

// API 10: Create a new tweet
app.post('/user/tweets/', authenticateToken, async (request, response) => {
  const {username} = request
  const {tweet} = request.body
  const getUserIdQuery = `SELECT user_id FROM user WHERE username = '${username}'`
  const {user_id} = await db.get(getUserIdQuery)

  const createTweetQuery = `
    INSERT INTO tweet (tweet, user_id, date_time)
    VALUES ('${tweet}', ${user_id}, datetime('now'))
  `
  await db.run(createTweetQuery)
  response.status(200).send('Created a Tweet')
})

// API 11: Delete a tweet
app.delete(
  '/tweets/:tweetId/',
  authenticateToken,
  async (request, response) => {
    const {username} = request
    const {tweetId} = request.params
    const getUserIdQuery = `SELECT user_id FROM user WHERE username = '${username}'`
    const {user_id} = await db.get(getUserIdQuery)

    const tweetQuery = `SELECT * FROM tweet WHERE tweet_id = ${tweetId} AND user_id = ${user_id}`
    const tweet = await db.get(tweetQuery)

    if (tweet === undefined) {
      response.status(401).send('Invalid Request')
    } else {
      const deleteTweetQuery = `DELETE FROM tweet WHERE tweet_id = ${tweetId}`
      await db.run(deleteTweetQuery)
      response.status(200).send('Tweet Removed')
    }
  },
)

module.exports = app
