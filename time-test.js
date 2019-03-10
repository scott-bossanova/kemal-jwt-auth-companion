import { minutes, hours, days } from '../index.js'

const timeTest = {
  minutes: () => minutes(5).should.equal(600),
  hours: () => hours(2).should.equal(minutes(120)),
  days: () => days(3).should.equal(hours(72)),
}
for time in timeTest {
  describe(time, function() {
    it("returns the right number of seconds", function() {
      timeTest[time]()
    })
  })
}
