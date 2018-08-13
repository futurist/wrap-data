# wrap-data
Wrap data object into reactive streams, with helpers like unwrap, get, set, unset etc.

[![Build Status](https://travis-ci.org/futurist/wrap-data.svg?branch=master)](https://travis-ci.org/futurist/wrap-data)
[![NPM Version](https://img.shields.io/npm/v/wrap-data.svg)](https://www.npmjs.com/package/wrap-data)

## Install

**NPM**
```sh
npm i -S wrap-data
```

**Browser**
```html
<script src="https://unpkg.com/wrap-data"></script>
<script>
    // wrapData is a global
    wrapData(...)
</script>
```


## Usage

First you need a **stream** like helper function or library, which conforms to the [fantasy land applicative](https://github.com/fantasyland/fantasy-land#applicative) specification, [flyd](https://github.com/paldepind/flyd) is recommended.

### - **Convert existing data and use wrapped data**

```js
const flyd = require('flyd')
const wrapData = require('wrap-data')
const data = {
    firstName: 'Hello',
    lastName: 'World'
}
const model = wrapData(flyd.stream)(data)
// model, and everything inside model is a stream!

// manually access a data
model().firstName  // stream(Hello)
model().lastName  // stream(World)

model.set('address', {city: 'Mercury'})  // set model.address

model().address().city()  // get value: 'Mercury'
model().address().city('Mars')  // set value: 'Mars'

const city = model.get('address.city')  //stream(Mars)
city()  // get value: 'Mars'
city('Earth')  // set value: 'Earth'

model.unwrap('address')  // {city: 'Earth'}
model.unset('address')   // unset model.address

model.unwrap() // {firstName: 'Hello', lastName: 'World'}

```

### - **Observe data changes**

The root `model` has a `change` stream, you can get callback from every data changes.

```js
// start observe model changes
const update = model.change.map(({value, type})=>{
    console.log('data mutated:', value.path, type, value.unwrap())
})

model.set('address.city', 'Mars')
// [console] data mutated: [ 'address', 'city' ] add Mars
model.get('address.city')('Earth')
// [console] data mutated: [ 'address', 'city' ] change Earth
model.unset('address.city')
// [console] data mutated: [ 'address', 'city' ] delete Earth

// stop observe model changes
update.end(true)
```

### - **Define data relations**

You can define data relations using `combine`, `scan` etc., and `unwrap` will unwrap them automatically, you can nest any level of streams.

```js
const firstName = model.get('firstName')
const lastName = model.get('lastName')
const fullName = flyd.combine(
  (a, b) => a() + ' ' + b(),
  [firstName, lastName]
)
model.set('fullName', fullName)
fullName.map(console.log)   // [console] Hello World
firstName('Green')          // [console] Green World

model.set('age', flyd.stream(flyd.stream(20)))
model.unwrap()
// {firstName:'Green', lastName:'World', fullName:'Green World', age:20}
```

### - **Use in React**

```js
const model = wrapData(flyd.stream)({user: {name: 'earth'}})

class App extends React.Component {
    constructor(props){
        super(props)
        const {model} = this.props
        
        this.update = model.change.map(({value, type})=>{
            this.forceUpdate()
        })
        
        this.onChange = e => {
            const {name, value} = e.target
            model.set(name, value)
        }
    }
  
    componentWillUnmount(){
        this.update.end(true)
    }
    
    render(){
        const {model} = this.props
        const userName = model.unwrap('user.name')
        return <div>
            <h3>Hello {userName}</h3>
            <input name='user.name' value={userName} onChange={this.onChange} />
        </div>
    }
}

ReactDOM.render(<App model={model} />, app)

```

You can play with the [demo here](https://flems.io/#0=N4IghgrgLg9gSgUwDYzAExALgGZiQZwQBoRsBLJBfLAbVADswBbBLEAOgAsomkQSAxjHpQEItgB40ZAG4ACMmgC8AHXAAHdWoB8EgPTSZ2kAF8iDZq0wcAVtUHDR460Pr4ocpjDTI5SuQDuAE5g6gAiYFBgABTYSACeaOzuQQjMAJTRwBCEQZhywIws+QDkaUFQnCUmJukq9PUCSGD4+HIAgppyCAAeTmhtiGACUOwAwjBM6sJiHsD1cotyrikQIzBB0epBMOr46fP0S8dy+BDqCJvbu-sLJ4src14+SCZ+cpVk+OzXe3f3-xOn2+5zQkQQ72eyHYAk4YHoAHMEOwmKFolkZHgIMQPvELrUlNpDvd7sD2NgNgIEABVdRg0TROpHEm1QHHNlLMnCMZwxEQ-z87QFDnHR4FIo4zFIbFvAXsKJBJFQEVLKFIZIIKDRCVEORS7FMklyEyAk3MwFCKYzEQAdQoSGp9C8EBEjOJJLJoPB7DEaGiUCCBtNgMBqXoPk2BxVYuAatlH04Xx+Oz+zPuYpylwAcpZId5oS7gmiSpmguwJSVDSTUlAIEEjlJZNoVccJJwAMzaAASyBQBVLOZYJn0HebaaNcgkZHo6mgcglShLuXLlhKeqxCCU2Vyg4Qb25vKRW659B58KRbz0Y6N+kM16WZrN9SGIzCAHkALLsMMR6ISTrqJ4+ZIFucZyFeuqhOoTL8CAlrqBQlxsAARmAyHILBhCUCMZDCNQ1gAIwAJyYAArKY5ggBKbAwq0sGuE4UBsKYAC6JBINOADW+F0FRlhsKkwyjD4MjILsLAiOwdiwXWfDWNwUB7Jgeh6C66icQiMKTHogkjKpTBoDpaQjOwIlieoEmjNJJBQHiVggPgAhBGQ6hMWYFgsAJxlQAAtGgkymQgokoBZsxSfYICyWwClKSpakaVpTBGUJfnaRABnJSMqVMIFwXiWF1kgLZFxsI5zmuRRHn2XEiThTJQRySAMX4Mpqkzgllp6DVaAAAIAAzsAATOwAAcXUJEkhXFfZZUuW5lHUdYRbqH5kRgPVjXNa18WaZ1y2rVE-XsO27AEe2BhfFAejTj4PTsOlk0RdNpVOXNrEmEAA)


## API

#### - wrapData = require('wrap-data')
> get the `wrapData` function

*return: function(stream) -> wrapFactory*

#### - wrapFactory = wrapData(stream)
> the `wrapFactory` used to turn data into wrapped data

*return: function(data) -> wrapped_data*

```js
var flyd = require('flyd')
var wrapFactory = wrapData(flyd.stream)
```

#### - root = wrapFactory(data: any)
> the `root` is a *wrapped_data*, with all nested data wrapped.

`root.change` is also a stream, you can `map` it to receive any data change inside.

Any data inside is `wrapped_data`, wrapped data is just a stream.

*return: wrapped_data for `data`*

```js
var root = wrapFactory({x: {y: {z: 1}}})
root().x().y().z()  // 1
root.change.map(({value, type})=>{ console.log(value, type) })
root().x().y().z(2)
```

#### - wrapped_data.get(path: string|string[])
> get nested wrapped data from path, path is array of string or dot(`"."`) seperated string.

*return: wrapped_data for `value`*

```js
var z = root.get('x.y.z')
// or
var z = root.get(['x','y','z'])
z() //2
z(10)
```

#### - wrapped_data.set(path?: string|string[], value?: any, descriptor?: object)
> set nested wrapped data value from path, same rule as `get` method.

`path` can contain `a.[3]` like string denote `3` is array element of `a`.

`value` can be any data types, if `path` is omitted, set value into wrapped_data itself.

`descriptor` is optional, same as 3rd argument of `Object.defineProperty`, this can e.g. create non-enumerable stream which will be hidden when `unwrap`.

If data not exist in `path`, all intermediate object will be created.

*return: wrapped_data for `value`*

```js
var z = root.set('x.a', 10)
z()  // 10

// same as: (only if x.a exits)
root.get('x.a').set(10)
root.get('x.a')(10)

var z = root.set('x.c', [], {enumerable: false})  // c is non-enumerable
Object.keys( z.get('x')() )  // ['a']

root.unwrap()  // {x: {y: {z: 1}}, a: 10}  // `c` is hidden!

root.set(`arr.[0]`, 10)
root.get('arr.0')()  // 10

root.unwrap()  // {x: {y: {z: 1}}, a: 10, arr:[10]}  // `arr` is array!

```

#### - wrapped_data.getset(path?: string|string[], function(prevValue, empty?: boolean)->newValue, descriptor: object)
> like `set`, but value is from a function, it let you set `value` based on previous value, the `descriptor` only applied when `empty` is `true`.

```js
var z = root.getset('x.a', val=>val+1)
z()  // 11
```

#### - wrapped_data.ensure(path: string|string[], value?: any, descriptor?: object)
> like `set`, but only `set` when the path is empty, otherwise perform a `get` operation.

```js
var z = root.ensure('x.a', 5)
// x.a exists, so perform a get, `5` ignored
z()  // 11

var z = root.ensure('x.b', 5)
// x.b not exists, so perform a `set`
z()  // 5
```

#### - wrapped_data.unset(path: string|string[])
> delete `wrapped_data` or `value` in `path`

*return: deleted data*

```js
var z = root.unset('x.b')
z // 5
```

#### - wrapped_data.unwrap(path?: string|string[], config?: {json: true})
> unwrap data and nested data while keep data structure, any level of `wrapper` on any data will be stripped.

If set `config` arg with `{json: true}`, then any circular referenced data will be set `undefined`, suitable for `JSON.stringify`.

*return: unwrapped data*

```js
var z = root.unwrap()

z // {x: {y: {z: 11}}, a: [10]},   x.c is hidden
```

#### - wrapped_array.push(value: any)
> push new `value` into wrapped data when it's array, all the inside will be wrapped.

*return: newly pushed wrapped_data*

```js
var z = root.set('d', [])
z.push({v: 10})
z.get('d.0.v')()  // 10
```

#### - wrapped_array.pop()
> pop and unwrap last element in wrapped array.

*return: unwrapped_data in last array element*

```js
var z = root.ensure('d', [])
z.get('d').pop()  // {v: 10}
```

