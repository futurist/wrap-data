const it = require('ospec')
const flyd = require('flyd')
const mithirlStream = require('mithril-stream')
const wrapData = require('../src')

const {keys} = Object
function isStream(s) {return typeof s.map==='function'}

it('mithril stream', () => {
  var w = wrapData(mithirlStream)
  var d = w({a:1, b: {c: 2}})
  it(isStream(d)).equals(true)
  it(keys(d())).deepEquals(['a', 'b'])
  it(keys(d().b())).deepEquals(['c'])
  it(isStream(d().b)).equals(true)
  it(d().a()).equals(1)
  it(typeof d().b()).equals('object')
  it(d().b().c()).equals(2)
})

it('flyd stream', () => {
  var w = wrapData(flyd.stream)
  var d = w({a:1, b: {c: 2}})
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


it('not dive into stream', ()=>{
  var d = wrapData(mithirlStream)({
    a: 1,
    b: mithirlStream({
      x:2, y:3
    })
  })

  it(d().b()()).deepEquals({
    x:2,
    y:3
  })
})

it('object test', () => {
  var xa = {
    i: mithirlStream(mithirlStream(99)),
    b: 1,
    v: 10,
    y: [3,4,5,6]
  }
  var xd = { d: 3 }
  xa.c = xd

  var x = {
    a: xa
  }

  var spy = it.spy()
  var w = wrapData(mithirlStream, spy)
  var d = w(x)
  it(spy.callCount).equals(0)

  it(d.unwrap()).deepEquals({
    a: {
      i: 99,
      b: 1,
      v: 10,
      y: [3,4,5,6],
      c: {
        d:3
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
  it(spy.args[0]()).deepEquals(34)
  it(spy.args[0].path.join()).deepEquals('a,x,y')
  it(spy.args[1]).equals('add')  // 1: ADD

  d.set('a.x.f', mithirlStream(mithirlStream(35)))
  it(spy.callCount).equals(2)

  it(d.get('a.x.y')()).equals(34)
  it(d.get('a.x.f')()()()).equals(35)

  var ss = d.ensure('a.x.y', 234)
  it(spy.callCount).equals(2)
  // ensure not changed for exits one
  it(ss()).equals(34)

  // but set can
  d.set('a.x.y', 3)
  it(spy.callCount).equals(3)
  it(spy.args[1]).equals('change')  // 0: CHANGE
  it(ss()).equals(3)

  try{
    var ss = d.ensure('a.v.z', 234)
  }catch(e){
    //TypeError: Cannot create property 'z' on number '10'
    var err = e
  }
  it(err instanceof Error).equals(true)
  // failed, but still callback
  it(spy.callCount).equals(4)

  // success ensured set
  var xy = d.ensure('a.x.z', 234)
  it(spy.callCount).equals(5)
  it(xy()).equals(234)

  d.set('a.x.y', 199)
  it(spy.callCount).equals(6)
  it(d.get('a.x').get('y')()).equals(199)

  d.unset('a.x.y')
  it(spy.callCount).equals(7)
  it(spy.args[0].path.join()).equals('a,x,y')
  it(spy.args[1]).equals('delete')

  it(d.get('a.x.y')).equals(undefined)

  it(d.unwrap()).deepEquals({ a: 
    { i: 99,
      b: 1,
      v: 10,
      y: [ 3, 4, 5, 6 ],
      c: { d: 3 },
      x: { f: 35, z: 234 } } })

})



it('circle object test', () => {
  var xa = {
    b: {d: 1},
    y: [3,4,5]
  }
  xa.c = xa
  xa.y.push(xa.b)

  var x = {
    a: xa
  }
  xa.a = x

  var spy = it.spy()
  var w = wrapData(mithirlStream, spy)
  var d = w(x)
  it(spy.callCount).equals(0)

  it(keys(d()).join()).equals('a')
  it(keys(d().a()).join()).equals('b,y,a,c')
  it((d().a().c().c().c().b.path).join()).equals('a,y,3')
  it(keys(d().a().c().c().c().b()).join()).equals('d')
  it(d().a().y()[3]().d.path.join()).equals('a,b,d')
  it(keys(d().a().y()[3]()).join()).equals('d')

  var r = (d.unwrap())
  it(r.a.c).equals(r.a)
  it(r.a.c).equals(r.a.c.c.c)
  it(r.a.y[3]).equals(r.a.b)

  // below recursive will be removed for json
  d().x = d().a

  var json = d.unwrap({json: true})
  it(json).deepEquals({ a: { b: { d: 1 }, y: [ 3, 4, 5 ] } })

})



it.run()