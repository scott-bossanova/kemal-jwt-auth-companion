
class TooOldBrowser extends Error {
  constructor() {
    super("your browser is too old to use the fetch() function! Use XHR instead.")
  }
}

class InvalidToken extends Error {
  constructor(token_value) {
    super("got invalid token value '" + token_value + "'")
  }
}

class FailedLogin extends Error {
  constructor(user, response) {
    const data = JSON.parse(response)
    let errors
    if( data.errors && data.errors.length ) errors = data.errors
    super( 'failed to log in "' +
           user +
           '": status ' +
           response.statusCode +
           errors? 'errors: ' + errors
                 : '')
  }
}

const fetch = require('node-fetch')

let token
let handleError = console.error

// Returns the given number of minutes as seconds
const minutes = count => 60 * count
// Returns the given number of hours as seconds
const hours = count => 60 * minutes(count)
// Returns the given number of days as seconds
const days = count => 24 * hours(count)
// Parse the document.cookie response into an indexable mapping.
const cookieHash = () => {
  let out
  document
    .cookie
    .split(';')
    .map(cookie => cookie.trim().split('='))
    .forEach(pair => out[pair[0]] = pair[1])
  return out
}
// True if the given value is an array whose size is truthy (not 0)
const isNonEmptyArray = (potArr) => Array.isArray(potArr) && potArr.length

// store the given value as a new authentication token.
function keep(newToken) {
  if( !newToken ) throw new InvalidToken(newToken)
  token = newToken
  document.cookie = "auth=" + newToken + ";samesite=strict;secure;max-age=" + days(7)
  return newToken
}
const retrieveToken = () => cookieHash()["auth"]

module.exports = function(host, signInEndpoint = '/sign_in') {
  const SIGN_IN_ADDR = host + signInEndpoint
  if( !(signInEndpoint[0] == '/') ) signInEndpoint = '/' + signInEndpoint
  // Log in with a given username and password.
  //
  // This stores the login token in the document's cookie and returns it. Either
  // the username or password can be left off if the API supports it.
  const fetchLogin = async (username, password) => {
    let data = {}
    if( username ) data['user'] = username
    if( password ) data['auth'] = password
    const response = await fetch(SIGN_IN_ADDR, {method: 'POST', body: JSON.stringify(data)})
    if( !response.ok ) throw new FailedLogin(username, response)
    const json = await response.json()
    if(isNonEmptyArray(json.errors)) json.errors.forEach(e => handleError(e))
    return keep(json.token)
  }
  // Log in with a given username and password.
  //
  // This stores the login token in the document's cookie and returns it. Either
  // the username or password can be left off if the API supports it.
  const login = (username, password) => {
    new Promise(function(resolve, reject) {
      const xhr = new XMLHttpRequest()
      xhr.onreadystatechange = function(args) {
        if( this.readyState === this.DONE){
          let data
          try {
            data = JSON.parse(this.responseText)
          } catch (e) {
            data = {
              errors: [
                e,
                `requst to ${SIGN_IN_ADDR} for user ${username} and password REDACTED failed with status ${this.statusText}`,
              ]
            }
          }
          if( this.status === 200)
            resolve(keep(data.token))
          else reject(data.errors)
        }
      }
      xhr.setRequestHeader('Accept', 'application/json')
      xhr.open('POST', SIGN_IN_ADDR)
      xhr.send(JSON.stringify({user: username, auth: password}))
    });
  }
  // This function mirrors the functionality of the normal `fetch()` function,
  // but adds the authentication token to the header before calling fetch.
  const authFetch = (input, init) => {
    if( input == host ) {
      init = init || {}
      init.headers = init.headers || {}
      let t = token || retrieveToken()
      init.headers["X-Token"] = t
    }
    return fetch(input, init)
  }
  const authXHR = () => {
    const out = new XMLHttpRequest()
    out.setRequestHeader('X-Token', token)
    return out
  }
  return {login, authFetch, authXHR}
}

module.exports.onError = (action) => handleError = action
