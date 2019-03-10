import kemal from '../build/index'
// require('jasmine-ajax')
const testUser = "test user"
const testPW = "test password"

describe("the default exported anonymous function, which we'll call 'kemal'.", function() {
  it('responds with two functions', function() {
    const {login, authFetch} = kemal("https://localhost:12345")
    expect(login).not.toBeFalsey
    expect(authFetch).not.toBeFalsey
    expect(typeof login).toEqual('function')
    expect(typeof authFetch).toEqual('function')
  })
  // PENDING ability to mock fetch() calls
  it('mock authenticates', function(done) {
    // import kemal from '../build/index'
    const eFun = jasmine.createSpy('error')
    kemal.onError(eFun)
    jasmine.Ajax.withMock(function() {
      const {login, authFetch} = kemal("https://localhost:12345")
      const $login = login(testUser, testPW)
      const req = jasmine.Ajax.requests.mostRecent()
      expect(req.method).toEqual('POST')
      expect(req.data()).toEqual({user: testUser, auth: testPW})
      req.response({
        status: 200,
        responseText: '{"token": "not really a token", "errors": []}'
      })
      $login.then(token => expect(token).toEqual("not really a token") )
            .finally(done)
      expect(eFun).not.toHaveBeenCalled()
    })
  })
  // it('mock authenticates via XHR', function() {
  //   const kemal = require('../src/index');
  //   const eFun = jasmine.createSpy('error')
  //   kemal.onError(eFun)
  //   jasmine.Ajax.withMock(function() {
  //     const {login, authFetch} = kemal("https://localhost:12345")
  //
  //   })
  // })
})
