## Setting Up a ReactJS/Kemal Environment With Authentication

I would start this project by creating a parent folder in which to place both projects – the server-side project and the client-side one, then initializing both libraries with the respective package management tools

```shell
mkdir -p Documents/code/experiments/kemal_react_auth/client
cd $_
yarn init
cd ..
crystal init app server
<< YAML >> server/shard.yml
dependencies:
  kemal:
    github: kemalcr/kemal
  kemal_jwt_auth:
    github: dscottboggs/kemal_jwt_auth
YAML
shards install
```

We’re just going to use the existing `example.cr` file in the library source repo to bootstrap our server environment here, so simply copy that file to your `server/src` directory and use `crystal run` to start it. After you’ve run `shards install` you can find `example.cr` in the directory `server/lib/kemal_jwt_auth/example/`.

Your first step with the server-side project would be to create some sort of serializable user which stores the hashed password in either a database or configuration file,  and then you will be free to define your primary logic and routes around the concept of the presence or lack thereof of the `#current_user?` property of the route context. The most simple implementation would be to simply `include JSON::Serializable` in your User model/`class`/`struct`, and synchronize it to disk. However, the library is intentionally flexible in the implementation of a User, allowing you to store any data you wish as attributes of the `context.current_user?` property, and store that data using any back-end of your choosing.

With that out of the way, we can move on to setting up the client. This is where the bulk of the boilerplate and configuration lies. 

We can compress a lot of steps by editing our `package.json` file in the node project directly rather than running `yarn add` for each package. Basically, you need to define it like so:

```json
{
  … (there can and should be be other values in this object, like name, main, license) …
  "scripts": {
    "build": "webpack --mode production",
    "start": "webpack-dev-server"
  },
  "dependencies": {
    "@babel/core": "^7.3.4",
    "@babel/preset-env": "^7.3.4",
    "@babel/preset-react": "^7.0.0",
    "babel-loader": "^8.0.5",
    "bulma": "^0.7.4",
    "html-webpack-plugin": "^3.2.0",
    "path": "^0.12.7",
    "prop-types": "^15.7.2",
    "react": "^16.8.4",
    "react-dom": "^16.8.4",
    "webpack": "^4.29.6",
    "webpack-cli": "^3.3.0",
    "webpack-dev-server": "^3.2.1",
    "kemal_jwt_auth_companion": "^1.0.0"
  }
}

```

This sets up two scripts for you: one to run a development version of your project in a web browser, and the other to deploy a development version, and installs all the dependencies you will need today. Namely:

 - webpack and babel to convert your Node.js library into a browser-compatible JavaScript file, and sets you up with compatibility for old browsers while it’s at it. We’re going to configure both of those in a second. 
 - React.js because this is a react project.
 - PropTypes helps us catch bugs
 - Bulma (or whatever CSS framework you prefer)
 - Finally, the authentication library

### Webpack and Babel configuration

Babel and Webpack are each configured with specially-formatted files in your project-root, like package.json. Babel’s is stored at .babelrc and webpack’s is webpack.config.js. One can also configure webpack with JSON or YAML but I find using actual Javascript to be more convenient. For Babel, all we need to do is tell it to use the default presets. These two preset plugins set up the translation of JSX and new Javascript into older, more widely compatible Javascript.

```json
{ "presets": ["@babel/preset-env", "@babel/preset-react"] }
```

Finally, we need to configure webpack, in a node.js-style javascript file. This includes configuration for building your Javascript, HTML, and CSS, into a single directory (`dist` within your project directory) which can then be served up by Kemal (or any static-file-serving web server):

```javascript
const path = require('path')

const HTMLWebpackPlugin = require('html-webpack-plugin')

// configures the HTML Webpack plugin to create a file at
// index.html in the output directory, which links to the final
// product that webpack has produced.
const HTMLWebpackPluginConfig = new HTMLWebpackPlugin({
  template: './src/index.html',
  filename: 'index.html',
  inject: 'body'
})

const KemalServerLocation = process.env.KEMAL_SERVER_LOCATION || "http://127.0.0.1:3000"

module.exports = {
  entry: ‘./src/index.js’, // This will be the central point from which all other files will be imported.
  output: {
    path: path.resolve('dist'),
    filename: 'bundle.js'
  },
  module: {
    // These rules determine what files are compiled and how.
    rules: [
      {
        test: /\.css$/, // all files that end in .css
        use: [ // use some zeroconf CSS compilers
          { loader: 'style-loader' },
          { loader: 'css-loader' }
        ]
      }, {
        test: /\.jsx?$/, // all files that end in .js or .jsx
        exclude: /^node.modules$/, // unless they're in node_modules
        use: 'babel-loader' // using the babel-loader plugin.
      }
    ]
  },
  // adds the configured HTML plugin
  plugins: [ HTMLWebpackPluginConfig ],
  // configures webpack development server to forward unrecognized requests
  // on to Kemal
  devServer: {
    proxy: {
      '/': { target: KemalServerLocation }
    }
  }
}
```

Phew, finally done with the configuration!

#### Boilerplate code

We're obviously going to need a form where the user can input their credentials before we can authenticate with the server. I like to start with the smallest, most self-contained components, so lets fill in a basic login form. This reusable submit button is about the simplest component one could create with React:

```jsx
import React from 'react'
import PropTypes from 'prop-types'

// The clicked required property is called when the user's
// mouse clicks the div. A label may be specifed but is not required.
export default function SubmitButton({ clicked, label }) {
  label = label || "Submit"
  return (
    <div className="form-group button" onClick={clicked} >
      {label}
    </div>
  )
}

SubmitButton.propTypes = {
  clicked: PropTypes.func.isRequired,
  label: PropTypes.string // not required
}
```

Save this as `src/js/components/SubmitButton.js`. Bulma turns any div tagged with the "button" class into a button-shaped area, which will respond to a click which can be specified as a property. Next, lets create a text input box:

```jsx
import React from 'react'
import PropTypes from 'prop-types'

// A labelled text input box.
export default function TextInput(props) {
  const {id, label, value, handleChange, ...inputProps} = props
  return (
    <div className="form-group">
      <label htmlFor={id} className="input">{label}</label>
      <input type="text"
             className="input"
             id={`input-${id}`} 
             value={value}
             onChange={handleChange}
             { inputProps... } />
    </div>
  )
}

// any props which are specified when creating an instance of
// TextInput, but which are not expected, are forwarded to the
// internal <input> tag. For example, you could add a `required`
// property to the input, like so:
// <TextInput label="give input"
//            id="given"
//            value={value}
//            handleChange={this.handleChange}
//            required />
//
// Note the extra "required" property. The TextInput simply forwards
// this to the <input> without paying it any mind.
TextInput.propTypes = {
  label: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  handleChange: PropTypes.func.isRequired
}
```

And a password input:

```jsx
import React from 'react'
import PropTypes from 'prop-types'

// A labelled password input box.
export default function PasswordInput(props) {
  const {id, label, value, handleChange, ...inputProps} = props
  return (
    <div className="form-group">
      <label htmlFor={id} className="input">{label}</label>
      <input type="password"
             className="input"
             id={`input-${id}`} 
             value={value}
             onChange={handleChange}
             { inputProps... } />
    </div>
  )
}

PasswordInput.propTypes = {
  label: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  handleChange: PropTypes.func.isRequired
}
```

Finally, lets create a form component to wrap it all up in:

```jsx
import React, { Component } from 'react'
import RequiredInput from '../presentational/Input.jsx'
import SubmitButton from '../presentational/SubmitButton.jsx'

export default class LoginFormContainer extends Component {
  constructor() {
    super()

    this.state = { username: '', password: '' }
    this.handleChange = this.handleChange.bind(this)
    this.handleSubmission = this.handleSubmission.bind(this)
  }

  handleChange(event) {
    this.setState({ [event.target.id]: event.target.value} )
  }
  handleSubmission(event) {
    event.preventDefault()
    console.log("login submitted with state ", this.state)
  }
  render() {
    const { username, password } = this.state
    return (
      <form id="login-form-form">
        <TextInput label="Username"
                   id="username"
                   value={username}
                   handleChange={this.handleChange}
                   required />
        <PasswordInput label="Password"
                       id="password"
                       value={password}
                       handleChange={this.handleChange}
                       required />
        <SubmitButton clicked={this.handleSubmission}/>
      </form>
    )
  }
}
```

Note that handleSubmission is merely stubbed at this stage. We'll come back to that after we make sure these basic components work right first. Lets tie all the pieces together in `src/index.js`. Remeber, that's where `webpack.config.js` is going to look for the base of the node module to build its output browser-ready javascript.

```jsx
// src/index.js

import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import LoginFormContainer from './js/components/container/LoginFormContainer.jsx'

// render the login screen if the div is there
const loginPageElement = document.getElementById('login-form')
if( loginPageElement )
  ReactDOM.render(<LoginFormContainer />, loginPageElement)
```

The final bundle will be linked to a `src/index.html` that looks like this:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Authenticated Kemal/React App</title>
  </head>
  <body>
    <div id="login-form">
    </div>
  </body>
</html>
```

You can now run `yarn start` in your project directory and you'll be able to see your changes live in the browser as you make them. Web pack will compile all of your files on the fly each time you save them. When you're ready to deploy, you can run `yarn build` and serve that up from your Kemal server's `#public_folder` property.

Before we go on, lets stub out a way to communicate error messages to the user. This gives us a central place to change whenever we have a real user to show an error message to, but without making us spend too much time on a what is largely a design decision anyway. So, just drop this in `src/js/VisibleError.js`:

```javascript
// just a stub
export default console.error
```

Alright, now that we've got the basic back-end and all the boilerplate and configuration to build up your application in React.JS, lets add the actual authentication code. In `LoginFormContainer.jsx`, it's time to update the `handleSubmission()` method.

```javascript
import React, { Component } from 'react'
...

export default class LoginFormContainer extends Component {

  ...

  async handleSubmission() {
    // if your SubmitButton is an <html> button tag internally, you must call
    // event.preventDefault() here.
    try {
      // The actual login function, this will throw an exception with a list of
      // errors from the server on failure.
      await this.props.LoginFunc(this.state.username, this.state.password)
    } catch(e) {
      // make sure `e` exists
      if(e){
        // We expect `e` to be an Array, but we have no guarantees of that.
        if( Array.isArray(e) ) e.forEach(err => VisibleError(err))
        // so fallback on just presenting the error object to the user.
        else VisibleError(e)
      } else {
        VisibleError("Falsey error received from login function!: " + e)
      }
      return // don't go on to welcoming the user
    }
    // once logged in, welcome the user, demonstrating an authenticated fetch
    // being performed.
    const result = this.props.authFetch('/test')
    if( result.ok ) {
      try {
        // `/test` in the example returns a plaintext result
        this.setState({welcome: await result.text()})
      } catch(e) {
        VisibleError(e)
      }
    } else {
      // handle various potential error results
      let error
      try {
        const { errors } = await result.json()
        error = errors
      } catch (e) {
        error = await result.text()
      }
      if( error ) {
        if( Array.isArray(error) ) error.forEach(err => VisibleError(err))
        else VisibleError(error)
      } else {
        VisibleError("got no response from the server for '/test'")
      }
    }
  }

  ...

}

LoginFormContainer.propTypes = {
  LoginFunc: PropTypes.func.isRequired,
  fetch: PropTypes.func.isRequired
}

```

Once your user submits a successful request to the login() function (passed to LoginFormContainer as the LoginFunc prop value), the authFetch function (passed to LoginFormContainer as the fetch prop value), may be used anywhere to make an authenticated request to your Kemal server.

