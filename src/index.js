/*jslint node: true */
'use strict'

var { keys, getPrototypeOf } = Object
var { toString, hasOwnProperty } = Object.prototype
var { isArray } = Array

// https://github.com/sindresorhus/is-plain-obj
function isPOJO(x) {
  var prototype;
	return toString.call(x) === '[object Object]' && (prototype = Object.getPrototypeOf(x), prototype === null || prototype === Object.getPrototypeOf({}));
}

function isFunction(obj) {
  return typeof obj === 'function'
}

function isPrimitive(val) {
  return val == null || (typeof val !== 'function' && typeof val !== 'object')
}

function getPath(path) {
  if (typeof path === 'string') path = path.split('.')
  return isArray(path) ? path : [path]
}

function isWrapper(obj){
  return isFunction(obj) && isFunction(obj.map)
}

function isPrimitive2(val) {
  return isPrimitive(val) || isWrapper(val)
}

function wrapData(wrapper, callback) {

  let finished = 0
  let root
  let _cache = null
  let cb = (value, type) => finished && isFunction(callback) && callback({value, type})

  return source => createWrap(source, [])

  function bindMethods(packer, path, type='change') {
    if('path' in packer && 'root' in packer) return packer
    // type: 0->CHANGE, 1->ADD, 2->DELETE
    packer.root = root
    packer.path = path
    packer.map(v => cb(packer, type))
    type = 'change'
    packer.get = get
    packer.set = set
    packer.ensure = ensure
    packer.unset = unset
    packer.unwrap = unwrap
    return packer
  }

  function createWrap(source, prevPath = []) {
    let packer = wrapper()
    const isRoot = _cache == null
    if (isRoot) {
      _cache = [[source, packer, null]]
      root = packer
    }

    if (isPrimitive2(source)) {
      packer = bindMethods(wrapper(source), prevPath)
      return packer
    }
    
    const target = isArray(source) ? [] : isPOJO(source) ? {} : source
    packer(deepIt(target, source, (a, b, key, path) => {
      const _path = path.concat(key)
      const bval = b[key]
      if (bval === undefined) a[key] = wrapper()
      else if (isPrimitive2(bval)) a[key] = wrapper(bval)
      else {
        const prev = _cache.find(function (v) { return v[0] === bval })
        if (prev == null) {
          _cache.push([bval, a, key])
          a[key] = createWrap(bval, _path, _cache)
        } else {
          prev.push(() => {
            const [_, x, k] = prev
            a[key] = k == null ? x : x[k]
            bindMethods(a[key], k == null ? [] : _path)
          })
        }
      }
      if (a[key] != null) {
        bindMethods(a[key], _path)
      }
    }, prevPath))
    
    const ret = bindMethods(packer, prevPath)

    if (isRoot) {
      _cache.forEach(v => {
        if (isFunction(v[3])) {
          v[3]()
        }
      })
      finished = 1
    }
    return ret
  }


  function deepIt(a, b, callback, path) {
    _cache = isArray(_cache) ? _cache : []
    path = isArray(path) ? path : []
    if (isPrimitive2(b)) return bindMethods(wrapper(a), path)
    for (let key in b) {
      if (!hasOwnProperty.call(b, key)) continue
      // return false stop the iteration
      const ret = callback(a, b, key, path, _cache)
      if (ret === false) break
      else if (ret === 0) continue
      const aval = a[key]
      const bval = b[key]
      if (!isPrimitive2(bval) && isFunction(aval) && !isPrimitive(aval())) {
        const prev = _cache.find(function (v) { return v[0] === bval })
        if (prev == null) {
          const _path = path.concat(key)
          _cache.push([bval, a, key])
          deepIt(aval(), bval, callback, _path)
        } else {
          // recursive found
        }
      }
    }
    return a
  }

  function get(path) {
    let obj = this
    let n = obj
    path = getPath(path)
    for (let i = 0, len = path.length; i < len; i++) {
      if (!isWrapper(n)) {
        return
      }
      n = n()[path[i]]
    }
    return n
  }

  // ensure path exists
  function ensure(path, defaultValue) {
    let obj = this
    path = getPath(path)
    let val = obj.get(path)
    if (val == null) {
      val = obj.set(path, defaultValue)
    }
    return val
  }

  function set(path, value) {
    let obj = this
    if(arguments.length===1) {
      value = path
      path = []
    }

    path = getPath(path)
    if (!isWrapper(obj)) return obj

    let val, action
    let i, len, p, n = obj()
    finished = 0
    
    if(!path.length){
      obj(createWrap(value, obj.path.slice())())
      val = obj
      action = 'change'
    } else {
      for (i = 0, len = path.length - 1; i < len; i++) {
        p = path[i]
        if (!isWrapper(n[p])) {
          n[p] = bindMethods(wrapper({}), path.slice(0, i + 1))
        }
        n = n[p]()
      }
      p = path[i]
      if(isWrapper(n[p])){
        val = n[p](createWrap(value, path.slice())())
        action = 'change'
      } else {
        val = n[p] = createWrap(value, path.slice())
        // n[p] = bindMethods(wrapper(value), path.slice(), 'add')
        action = 'add'
      }
    }
    finished = 1
    cb(val, action)

    return val
  }

  function unset(path) {
    let obj = this

    path = getPath(path)
    let len = path.length
    if (!isWrapper(obj) || !len) return
    let val = obj.get(path.slice(0, -1))
    if (val == null) return
    let parent = val()
    let p = path[len - 1]
    let deleteVal = parent[p]
    let result
    if(isArray(parent) && !isNaN(p)) {
      result = parent.splice(p, 1)
    } else {
      result = delete parent[p]
    }
    cb(deleteVal, 'delete')
    return result
  }

  function _checkCacheAndUnwrap(config, _cache, val, result, key) {
    const prev = _cache.find(v=>v[0]===val)
    if(prev != null) {
      !config.json && prev.push(()=>{
        const [_, r, k] = prev
        result[key] = k==null ? r : r[k]
      })
    } else {
      _cache.push([val, result, key])
      result[key] = _unwrap(val, config, _cache)
    }
    return prev
  }

  function _unwrap(obj, config, _cache) {
    let isRoot = _cache==null
    if(isRoot) _cache = [[obj]]
    if (!isWrapper(obj)) return obj
    
    let result
    let source = obj()
    if (isArray(source)){
      result = []
      source.forEach((val,key)=> {
        _checkCacheAndUnwrap(config, _cache, val, result, key)
      })
    } else if(isPOJO(source)){
      result = {}
      keys(source).forEach(key => {
        const val = source[key]
        _checkCacheAndUnwrap(config, _cache, val, result, key)
      })
    } else if(isWrapper(source)) {
      result = _unwrap(source(), config, _cache)
    } else {
      result = source
    }
    if (isRoot) {
      _cache.forEach(v => {
        if (isFunction(v[3])) {
          v[3]()
        }
      })
    }
    return result
  }

  function unwrap(config={}) {
    return _unwrap(this, config)
  }

}

module.exports = wrapData

const stream = require('mithril-stream')
const cb = v=>{
  console.log(v.type)
}
const w = wrapData(stream, cb)
const d = w({a:[]})
d().a(1)

