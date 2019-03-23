// get the fetch capability whether we're in the browser or node
const fetch = window.fetch || require('node-fetch')

export class TooOldBrowser extends Error {
  constructor() {
    super("your browser is too old to use the fetch() function! Use XHR instead.")
  }
}

export class InvalidToken extends Error {
  constructor(token_value) {
    super("got invalid token value '" + token_value + "'")
  }
}

export class FailedLogin extends Error {
  constructor(user, response) {
    let errors
    if( typeof response === 'string' || response instanceof String )
      errors = response
    if( response.errors && Array.isArray(response.errors) && response.errors.length)
      errors = response.errors.join("; ")
    super( 'failed to log in "' +
           user +
           '": status ' +
           response.statusCode +
           errors? 'errors: ' + errors
                 : '')
  }
}

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
const keep = (newToken) => {
  if( !newToken ) throw new InvalidToken(newToken)
  token = newToken
  document.cookie = "auth=" + newToken + ";samesite=strict;secure;max-age=" + days(7)
  return newToken
}
const retrieveToken = () => cookieHash()["auth"]

export default function(host, signInEndpoint = '/sign_in') {
  const SIGN_IN_ADDR = host + signInEndpoint
  if( !(signInEndpoint[0] == '/') ) signInEndpoint = '/' + signInEndpoint
  // Log in with a given username and password.
  //
  // This stores the login token in the document's cookie and returns it. Either
  // the username or password can be left off if the API supports it.
  const login = (username, password) => new Promise((resolve, reject) => {
    let data = {}
    if( username ) data['name'] = username
    if( password ) data['auth'] = password
    fetch(SIGN_IN_ADDR, {method: 'POST', body: JSON.stringify(data)})
      .then(response => {
        if( response.ok ) return response.json()
        console.log(response.statusText)
        return response.json()
          .then( ({errors}) => reject(new FailedLogin(username, errors)))
          .catch(e => { console.error(e); return response.text()})
          .then(text => reject(new FailedLogin(username, text)))
          .catch(() => reject(new FailedLogin(username, `status code ${response.status}`)))})
      .then(json => {
        if( !json ) return reject(`got json response '${json}'`)
        const { errors, token } = json
        if( isNonEmptyArray(errors) ) errors.forEach(e => handleError(e))
        resolve(keep(token)) })
      .catch(handleError)
  })
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

export const onError = (action) => handleError = action
