const it = require('ospec')
const flyd = require('flyd')
const mithirlStream = require('mithril-stream')
const wrapData = require('../src')

const { keys } = Object
function isStream (s) { return typeof s.map === 'function' }

it('mithril stream', () => {
  var w = wrapData(mithirlStream)
  var d = w({ a: 1, b: { c: 2 } })
  it(isStream(d)).equals(true)
  it(keys(d())).deepEquals(['a', 'b'])
  it(keys(d().b())).deepEquals(['c'])
  it(isStream(d().b)).equals(true)
  it(d().a()).equals(1)
  it(typeof d().b()).equals('object')
  it(d().b().c()).equals(2)
  it(Object.keys(d.set({ b: 1 })())).deepEquals(['b'])
  it(d.set({ b: 1 }).unwrap()).deepEquals({ b: 1 })
})

it('flyd stream', () => {
  var w = wrapData(flyd.stream)
  var d = w({ a: 1, b: { c: 2 } })
  it(isStream(d)).equals(true)
  it(keys(d())).deepEquals(['a', 'b'])
  it(keys(d().b())).deepEquals(['c'])
  it(isStream(d().b)).equals(true)
  it(d().a()).equals(1)
  it(typeof d().b()).equals('object')
  it(d().b().c()).equals(2)

  it(d.root).equals(d)
  it(d().b().c.root).equals(d)
})

it('root unwrap', () => {
  var w = wrapData(flyd.stream)
  var data = { a: { b: { c: 2 } } }
  data.a.b.x = data.a
  var d = w(data)
  it(d.unwrap('a.b', { json: true })).deepEquals({ c: 2, x: {} })
  it(d.unwrap('a.b.c')).deepEquals(2)
  it(d.unwrap('a.b.c.d')).deepEquals(undefined)

  it(d.get('a').unwrap('b.c')).deepEquals(2)
})

it('not dive into stream', () => {
  var d = wrapData(mithirlStream)({
    a: 1,
    b: mithirlStream({
      x: 2, y: 3
    })
  })

  it(d().b()()).deepEquals({
    x: 2,
    y: 3
  })
})

it('array test', () => {
  var spy = it.spy()
  var x = wrapData(mithirlStream)({ a: { b: [] } })
  x().a(x().a()) // give it a change first to test map
  x.change.map(spy)

  var b = x().a().b
  b([])
  it(spy.callCount).equals(1)

  b.set(0, { x: 1 })
  it(spy.callCount).equals(2)
  it(b()[0]().x.path.join()).equals('a,b,0,x')

  var val = b.push({ x: 2 })
  it(spy.callCount).equals(3)
  it(val.path.join()).equals('a,b,1')
  it(val().x()).deepEquals(2)
  it(b().length).equals(2)

  var val = b.pop()
  it(spy.callCount).equals(4)
  it(val).deepEquals({ x: 2 })
  it(b().length).equals(1)

  var val = b.pop()
  it(spy.callCount).equals(5)
  it(val).deepEquals({ x: 1 })
  it(b().length).equals(0)

  var val = x.set('c.[0].xx', 10)
  it(spy.callCount).equals(6)

  var val = x.ensure('y.[0]', 10)
  it(val()).equals(10)
  it(val.path.join()).equals('y,0')
  it(spy.callCount).equals(7)

  it(x.unwrap()).deepEquals({ a: { b: [] }, c: [ { xx: 10 } ], y: [10] })

  // array unwrap, mutate and reset
  var c = x.get('c')
  var _c = c.unwrap()
  _c.unshift({ yy: 2 })
  c.set(_c)
  it(spy.callCount).equals(8)
  it(x.unwrap()).deepEquals({ a: { b: [] }, c: [ { yy: 2 }, { xx: 10 } ], y: [10] })
})

it('single unwrap', () => {
  var spy = it.spy()
  var x = wrapData(mithirlStream)({ a: { b: mithirlStream(10) } })
  x.change.map(spy)
  it(x().a.unwrap()).deepEquals({ b: 10 })
})

it('object test', () => {
  var xa = {
    i: mithirlStream(mithirlStream(99)),
    b: 1,
    v: 10,
    y: [3, 4, 5, 6]
  }
  var xd = { d: 3 }
  xa.c = xd

  var x = {
    a: xa
  }

  var spy = it.spy()
  var w = wrapData(mithirlStream)
  var d = w(x)
  d.change.map(spy)
  it(spy.callCount).equals(0)

  it(d.unwrap()).deepEquals({
    a: {
      i: 99,
      b: 1,
      v: 10,
      y: [3, 4, 5, 6],
      c: {
        d: 3
      }
    }
  })

  it(keys(d()).join()).equals('a')
  it(keys(d().a()).join()).equals('i,b,v,y,c')
  it(keys(d().a().c()).join()).equals('d')
  it(d().a().i()()()).equals(99)
  it(d().a().y().length).equals(4)
  it(isStream(d().a().y()[0])).equals(true)
  it(d().a().y()[0]()).equals(3)
  it(d().a().c().d()).equals(3)

  it(d.get('a.c.d').path.join()).equals('a,c,d')
  it(d.get('a.c.d')()).equals(3)

  it(d.get('a.c.dddd')).equals(undefined)
  it(d.get('a.ccc.c')).equals(undefined)

  it(d.get('a').get('c').get('d').path.join()).equals('a,c,d')

  it(spy.callCount).equals(0)

  d.set('a.x.y', 34)
  it(spy.callCount).equals(1)
  it(spy.args[0].value()).deepEquals(34)
  it(spy.args[0].value.path.join()).deepEquals('a,x,y')
  it(spy.args[0].type).equals('add') // 1: ADD

  d.set('a.x.f', mithirlStream(mithirlStream(35)))
  it(spy.callCount).equals(2)

  it(d.get('a.x.y')()).equals(34)
  it(d.get('a.x.f')()()()).equals(35)

  var ss = d.ensure('a.x.y', 234)
  it(spy.callCount).equals(2)
  // ensure not change for exits one
  it(ss.unwrap()).equals(34)

  // but set can
  d.set('a.x.y', 3)
  it(spy.callCount).equals(3)
  it(spy.args[0].type).equals('change') // 0: CHANGE
  it(ss.unwrap()).equals(3)

  try {
    var ss = d.ensure('a.v.z', 234)
  } catch (e) {
    // TypeError: Cannot create property 'z' on number '10'
    var err = e
  }
  it(err instanceof Error).equals(true)
  // failed, but still change
  it(spy.callCount).equals(3)

  // success ensured set
  var xy = d.ensure('a.x.z', 234)
  it(spy.callCount).equals(4)
  it(xy()).equals(234)

  d.set('a.x.y', 199)
  it(spy.callCount).equals(5)
  it(d.get('a.x').get('y').unwrap()).equals(199)

  d.unset('a.x.y')
  it(spy.callCount).equals(6)
  it(spy.args[0].value.path.join()).equals('a,x,y')
  it(spy.args[0].type).equals('delete')

  it(d.get('a.x.y')).equals(undefined)

  d.set('a.x.y', { xx: 2 })
  it(spy.callCount).equals(7)
  it(d.get('a.x.y.xx').path.join()).equals('a,x,y,xx')
  it(d.get('a.x.y.xx')()).equals(2)
  it(d().a().x().y().xx()).equals(2)

  d.set('a.y.4', { yy: { zz: 234 } })
  it(spy.callCount).equals(8)
  it(d.get('a.y')().length).equals(5)
  it(d.get('a.y.4.yy').path.join()).equals('a,y,4,yy')
  it(d.get('a.y.4.yy.zz').path.join()).equals('a,y,4,yy,zz')
  it(d.get('a.y.4.yy.zz')()).equals(234)

  d.unset('a.y.3')
  it(spy.callCount).equals(9)

  d.get('a.i').set(10)
  it(spy.callCount).equals(10)
  it(spy.args[0].type).equals('change')
  it(d().a().i()).equals(10)
  it(d().a().i.path.join()).equals('a,i')

  var y = [ 3, 4, 5, null, { yy: { zz: 234 } } ]
  delete y[3]
  it(d.unwrap()).deepEquals({ a:
    { i: 10,
      b: 1,
      v: 10,
      y,
      c: { d: 3 },
      x: { f: 35, z: 234, y: { xx: 2 } } } })
})

it('circle object test', () => {
  var xa = {
    b: { d: 1 },
    y: [3, 4, 5]
  }
  xa.c = xa
  xa.y.push(xa.b)

  var x = {
    a: xa
  }
  xa.a = x

  var spy = it.spy()
  var w = wrapData(mithirlStream)
  var d = w(x)
  d.change.map(spy)
  it(spy.callCount).equals(0)

  it(keys(d()).join()).equals('a')
  it(keys(d().a()).join()).equals('b,y,a,c')
  it((d().a().c().c().c().b.path).join()).equals('a,b')
  it(keys(d().a().c().c().c().b()).join()).equals('d')
  it(d().a().y()[3]().d.path.join()).equals('a,b,d')
  it(keys(d().a().y()[3]()).join()).equals('d')

  var r = (d.unwrap())
  it(r.a.c).equals(r.a)
  it(r.a.c).equals(r.a.c.c.c)
  it(r.a.y[3]).equals(r.a.b)

  // below recursive will be removed for json
  d().x = d().a

  var json = d.unwrap({ json: true })
  it(json).deepEquals({ a: { b: { d: 1 }, y: [ 3, 4, 5 ] } })
})

it('getset', () => {
  var spy = it.spy()
  var w = wrapData(mithirlStream)
  var d = w({
    a: 1, b: { c: 2 }
  })
  d.change.map(spy)
  var r = d.getset('b.c', v => v + 1)
  it(spy.callCount).equals(1)
  it(r.unwrap()).equals(3)

  var r = d.getset('b.d', (v, empty) => {
    it(empty).equals(true)
    return { y: 3 }
  })
  it(spy.callCount).equals(2)
  it(r.path.join()).equals('b,d')
  it(r.unwrap()).deepEquals({ y: 3 })

  var x = d.get('b.c')
  var r = x.getset(v => v + 1)
  it(r.unwrap()).equals(4)
})

it('set descriptor', () => {
  var spy = it.spy()
  var w = wrapData(mithirlStream)
  var d = w({
    a: 1, b: { c: 2 }
  })
  d.change.map(spy)
  var r = d.set('b.x', 3, {})
  it(spy.callCount).equals(1)
  it(r.unwrap()).equals(3)

  // test set, then get
  d.set('b.x', 4)
  r = d.get('b.x')
  it(r()).equals(4)

  d.ensure('b.y', 10, {})
  d.ensure('b.z', 10, { enumerable: true })

  d.get('a').set()

  it(d.unwrap()).deepEquals({
    a: undefined, b: { c: 2, z: 10 }
  })
})

it('model slice', () => {
  var spy = it.spy()
  var w = wrapData(mithirlStream)
  var d = w({
    a: 1, b: { c: 2 }
  })
  d.change.map(spy)
  var bc = d.slice('b.c')
  bc.change.map(spy)
  d.slice('b').change.map(({ value, path }) => {
    it(path).deepEquals(['c'])
  })
  d.set('b.c', 3)
  it(spy.callCount).equals(2)
  d.set('a', 2)
  it(spy.callCount).equals(3)
  // end bc.change
  bc.change.end(true)
  bc(4)
  it(spy.callCount).equals(4)
})

if (require.main === module) it.run()
