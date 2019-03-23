# Kemal JWT Auth Companion

A companion to the Kemal JWT Auth shard for the Crystal language, this library
makes authenticating a user as simple as `login(username, password)`.

### Installation and build

```shell
# To install
yarn add kemal-jwt-auth-companion
# To build a version to use from the browser
yarn build
```

That's about it. After that you can set your script tag's src to the output
file in the build dir within the project dir, import it, or require it.

This project uses Webpack and Babel to target browsers, but can be used by node
scripts as well.

See the server library for deployment of a server, including a working example.
See deployment.md for a fully integrated walkthrough for all boilerplate needed
to use this with React.js, although there's no reason it can't be used in other
frameworks or just vanilla JS.

### Usage

```javascript
import auth from 'kemal-jwt-auth-companion'
// OR
const auth = require('kemal-jwt-auth-companion')
// OR include the script tag with the built library
const { login, authFetch } = auth('https://my.host/', '/api/sign_in')

login('my-username', 'my password').then(() => {
  authFetch(`${HOSTNAME}/api/some/endpoint`)
    .then(res => {
      if( res.ok ) return res.json()
      else return { errors: ['request to /api/some/endpoint failed'] } })
    .then(data => {
      if( data.errors && Array.isArray(data.errors))
        return data.errors.forEach(console.error)
      doSomethingWith(data) })
})
```

Also available is the authXHR function which provides a new XHR with
authentication set up already.
