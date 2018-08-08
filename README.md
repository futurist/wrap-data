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

First you need a **stream** like helper function or library, which conforms to the [fantasy land applicative](https://github.com/fantasyland/fantasy-land#applicative) specification, [flyd](https://github.com/paldepind/flyd) is recommanded.

### - **Convert existing data and use wrapped data**

```js
const flyd = require('flyd')
const wrapData = require('wrap-data')
const data = {
    firstName: 'Hello',
    lastName: 'World'
}
const model = wrapData(flyd.stream)(data)
// everything inside model is a stream!

// manually access a data
model().firstName  // stream(Hello)
model().lastName  // stream(World)

model.set('address', {city: 'Mars'})  // set model.address
model().address().city()  // 'Mars'

const city = model.get('address.city')  //stream(Mars)
city()  // 'Mars'
city('Earth')  // stream(Earth)

model.unwrap('address')  // {city: 'Earth'}
model.unset('address')   // unset model.address

model.unwrap() // {firstName: 'Hello', lastName: 'World'}

```

### - **Observe data changes**

The root `model` has a `changed` stream, you can get callback from every data changes.

```js
// start observe model changes
const update = model.changed.map(({value, type})=>{
    console.log('data mutated:', value.path, type, value.unwrap())
})

model.set('address.city', 'Mars')
// [console] data mutated: [ 'address', 'city' ] add Mars
model.get('address.city')('Earth')
// [console] data mutated: [ 'address', 'city' ] change Earth
model.unset('address.city', 'Mars')
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
  (a,b)=>a()+b(),
  [firstName, lastName]
)
model.set('fullName', fullName)
fullName.map(console.log)   // [console] HelloWorld
firstName('Green')          // [console] GreenWorld

model.set('age', flyd.stream(flyd.stream(20)))
model.unwrap()
// {firstName:'Green', lastName:'World', fullName:'GreenWorld', age:20}
```

### - **Use in React**

```js
const model = wrapData(flyd.stream)({user: {name: 'Hello'}})

class App extends React.Component {
    constructor(props){
        super(props)
        const {model} = this.props
        
        this.update = model.changed.map(({value, type})=>{
            console.log(type, value.unwrap())
            this.forceUpdate()
        })
      
        this.onChange = e=>{
          model.set('user.name', e.target.value)
        }
    }
  
    componentWillUnmount(){
        this.update.end(true)
    }
    
    render(){
        const {model} = this.props
        const userName = model.unwrap('user.name')
        return <div>
            <h3>Your name: {userName}</h3>
            <input value={userName} onChange={this.onChange} />
        </div>
    }
}

ReactDOM.render(<App model={model} />, APP)

```



