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

it('array test', () => {
  var spy = it.spy()
  var x = wrapData(mithirlStream, spy)({a:{b:[]}})

  var b = x().a().b
  b([])
  it(spy.callCount).equals(1)

  b.set(0, {x:1})
  it(spy.callCount).equals(2)
  it(b()[0]().x.path.join()).equals('a,b,0,x')

  var val = b.push({x:2})
  it(spy.callCount).equals(3)
  it(val.path.join()).equals('a,b,1')
  it(val().x()).deepEquals(2)
  it(b().length).equals(2)

  var val = b.unset(1)
  it(spy.callCount).equals(4)
  it(val).deepEquals({x:2})
  it(b().length).equals(1)

  var val = b.pop()
  it(spy.callCount).equals(5)
  it(val).deepEquals({x:1})
  it(b().length).equals(0)

  var val = b.unshift({x:3})
  it(spy.callCount).equals(6)
  it(val.path.join()).equals('a,b,0')
  it(b().length).equals(1)
  
  var val = b.splice(0, 0, {x:4}, {x:5})
  it(spy.callCount).equals(8)

  var val = b.splice(0, 2)
  it(spy.callCount).equals(10)
  it(val.length).equals(2)
  it(val).deepEquals([ { x: 4 }, { x: 5 } ])

  var val = b.shift()
  it(spy.callCount).equals(11)
  it(b().length).equals(0)

  var val = b.shift()
  it(spy.callCount).equals(11)

  var val = b.pop()
  it(spy.callCount).equals(11)

  var val = x.set('(array)c.0.xx', 10)
  it(spy.callCount).equals(12)

  it(x.unwrap()).deepEquals({ a: { b: [] }, c: [ { xx: 10 } ] })
  
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
  it(spy.args[0].value()).deepEquals(34)
  it(spy.args[0].value.path.join()).deepEquals('a,x,y')
  it(spy.args[0].type).equals('add')  // 1: ADD

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
  it(spy.args[0].type).equals('change')  // 0: CHANGE
  it(ss()).equals(3)

  try{
    var ss = d.ensure('a.v.z', 234)
  }catch(e){
    //TypeError: Cannot create property 'z' on number '10'
    var err = e
  }
  it(err instanceof Error).equals(true)
  // failed, but still callback
  it(spy.callCount).equals(3)

  // success ensured set
  var xy = d.ensure('a.x.z', 234)
  it(spy.callCount).equals(4)
  it(xy()).equals(234)

  d.set('a.x.y', 199)
  it(spy.callCount).equals(5)
  it(d.get('a.x').get('y')()).equals(199)

  d.unset('a.x.y')
  it(spy.callCount).equals(6)
  it(spy.args[0].value.path.join()).equals('a,x,y')
  it(spy.args[0].type).equals('delete')

  it(d.get('a.x.y')).equals(undefined)

  
  d.set('a.x.y', {xx:2})
  it(spy.callCount).equals(7)
  it(d.get('a.x.y.xx').path.join()).equals('a,x,y,xx')
  it(d.get('a.x.y.xx')()).equals(2)
  it(d().a().x().y().xx()).equals(2)

  d.set('a.y.4', {yy:{zz:234}})
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

  it(d.unwrap()).deepEquals({ a: 
    { i: 10,
      b: 1,
      v: 10,
      y: [ 3, 4, 5, {yy: {zz: 234}} ],
      c: { d: 3 },
      x: { f: 35, z: 234, y: {xx:2} } } })

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

  var json = d.unwrap({json: true})
  it(json).deepEquals({ a: { b: { d: 1 }, y: [ 3, 4, 5 ] } })

})


if(require.main === module) it.run()

