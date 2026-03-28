import {sum, retrieve} from '../src/sample';

describe('Test case', function() {
  it('should pass', function() {
    sum(1, 2).should.be.equal(3);
  });

  it('should pass asynchronously', function(done) {
    const promise = retrieve();

    promise.should.be.instanceOf(Promise);
    promise.then(function(result) {
      result.should.be.a('string').that.equal('foo');
      done();
    });
  });
});
