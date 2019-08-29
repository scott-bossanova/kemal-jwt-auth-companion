// get the fetch capability whether we're in the browser or node
const fetch = window? window.fetch
  : require('node-fetch')

export class InvalidToken extends Error {
  constructor(token_value) {
    super(`got invalid token value "${token_value}"`)
  }
}

export class FailedLogin extends Error {
  constructor(user, response) {
    let errors
    if( typeof response === 'string' ||
        response instanceof String )
      errors = response
    if( isNonEmptyArray(response.errors) )
    {
      errors = response.errors.join("; ")
    }
    super( 'failed to log in "' +
      user +
      '": status ' +
      response.statusCode +
           errors? 'errors: ' + errors
      : '')
  }
}

export class NoLoginInfo extends Error {
  constructor() {
    super("can't log in with no authentication information -- please specify a username or a password!")
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
const cookieNamed = (name) => {
  let key, value
  document
    .cookie
    .split(';')
    .find(cookie => {
      [key, value] = cookie.trim().split('=', 2)
      if( key === name && value )
        return true
      value = null
    })
  return value
}
// True if the given value is an array whose size is truthy (not 0)
const isNonEmptyArray = (potArr) => Array.isArray(potArr) && potArr.length

// store the given value as a new authentication token.
const keep = (newToken) => {
  if( !newToken ) throw new InvalidToken(newToken)
  // token is a global variable
  token = newToken
  document.cookie = "auth=" + newToken + ";samesite=strict;secure;max-age=" + days(7)
  return newToken
}

export default function (host, signInEndpoint = '/sign_in') {
  // The next few lines are a big guard against invalid values. Nothing but a
  // string gets through, and the empty string gets assigned to a reasonable
  // default before checking its 0 index (which the empty string does not have)
  if (!host || !(typeof host === 'string' || host instanceof String))
    host = '/'
  if (!signInEndpoint || !(typeof signInEndpoint === 'string' || signInEndpoint instanceof String))
    signInEndpoint = '/'
  if (!(signInEndpoint[0] == '/')) signInEndpoint = '/' + signInEndpoint
  if (host[host.length - 1] != '/') host += '/'
  const SIGN_IN_ADDR = host.slice(0, host.length - 1) + signInEndpoint
  // Log in with a given username and password.
  //
  // This stores the login token in the document's cookie and returns it. Either
  // the username or password can be left off if the API supports it.
  const login = (username, password) => new Promise((resolve, reject) => {
    let data = {}
    if( username ) data['name'] = username
    if( password ) data['auth'] = password
    if( Object.keys(data).length === 0 ) throw new NoLoginInfo
    fetch(SIGN_IN_ADDR, {method: 'POST', body: JSON.stringify(data)})
      .then(response => {
        if( response.ok ) return response.json()
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
    if( input.startsWith(host) || input.startsWith('/') ) {
      init = init || {}
      init.headers = init.headers || {}
      init.headers["X-Token"] = token || cookieNamed("auth")
    }
    return fetch(input, init)
  }
  const authXHR = () => {
    const out = new XMLHttpRequest()
    out.setRequestHeader('X-Token', token || cookieNamed('auth'))
    return out
  }
  return {login, authFetch, authXHR}
}

export const onError = (action) => handleError = action
