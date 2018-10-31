'use strict'

const { assign, keys, getPrototypeOf } = Object
const { toString, hasOwnProperty } = Object.prototype
const { isArray } = Array
const arrayKeyRegEx = /^\[(\w+)\]$/
const MUTATION_TYPE = {
  CREATE: 'create',
  ADD: 'add',
  CHANGE: 'change',
  DELETE: 'delete'
}

// https://github.com/sindresorhus/is-plain-obj
function isPOJO (x) {
  var prototype
  /* eslint-disable-next-line no-return-assign */
  return toString.call(x) === '[object Object]' &&
    (
      prototype = getPrototypeOf(x),
      prototype === null || prototype === getPrototypeOf({})
    )
}

function isFunction (obj) {
  return typeof obj === 'function'
}

function isPrimitive (val) {
  return val == null ||
    (
      typeof val !== 'function' && typeof val !== 'object'
    )
}

function getPath (path) {
  if (typeof path === 'string') path = path.split('.')
  return (isArray(path) ? path : [path]).map(getPathType)
}

function getPathType (p) {
  if (isArray(p)) return p
  const match = arrayKeyRegEx.exec(p)
  return match != null ? ['array', match[1]] : ['', p]
}

function isWrapper (obj) {
  return isFunction(obj) && isFunction(obj.map)
}

function isWrappedData (obj) {
  return isWrapper(obj) &&
    'root' in obj &&
    'path' in obj &&
    isFunction(obj.get)
}

function isPrimitive2 (val) {
  return isPrimitive(val) || isWrapper(val)
}
const ignoreFirstCall = fn => {
  let calledOnce = false
  return function (arg) {
    /* eslint-disable-next-line no-return-assign */
    return calledOnce ? fn.call(this, arg) : calledOnce = true
  }
}

const defaultMapFunc = val => val != null ? val.unwrap() : val

function wrapData (wrapper) {
  return source => {
    let root
    let _cache = null
    root = createWrap(source, [])

    function slice (path, filter, wrapper) {
      const obj = this
      const part = makeChange(obj.get(path))
      if (!isWrapper(part)) return part
      const { change } = part
      const target = wrapper || root
      const subPath = getPath(path).map(v => v[1])
      if (!isFunction(filter)) {
        filter = (value) => value.path.join().indexOf(subPath.join()) === 0
      }
      const _change = target.change.map(({ value, type, path }) => {
        if (filter({ value, type, path })) {
          change.emit(value, type, {
            path: value.path.slice(subPath.length)
          })
        }
      })
      change.end.map(_change.end)
      return part
    }

    function makeChange (packer) {
      if (!isWrapper(packer)) return packer
      const _change = wrapper()
      const oldMap = _change.map
      let changeStack = []
      _change.count = 0
      _change.skip = wrapper()
      _change.hold = wrapper()
      _change.hold.map(val => {
        if (!val) {
          changeStack.forEach(_change)
          changeStack = []
        }
      })
      _change.map = function (fn) {
        const _fn = _change.count > 0 ? ignoreFirstCall(fn) : fn
        return oldMap.call(this, _fn)
      }
      _change.emit = (value, type, data) => {
        if (root.change.skip() || _change.skip()) return
        _change.count++
        if (data == null) {
          data = { path: value.path }
        }
        if (_change.hold()) {
          changeStack.push(assign({ value, type }, data))
        } else {
          _change(assign({ value, type }, data))
        }
      }
      packer.change = _change
      return packer
    }

    function bindMethods (packer, path, type = MUTATION_TYPE.CHANGE) {
      if ('path' in packer && 'root' in packer) return packer
      // type: 0->CHANGE, 1->ADD, 2->DELETE
      packer.root = root
      packer.path = path
      packer.map(v => root.change.emit(packer, type))
      type = MUTATION_TYPE.CHANGE
      packer.get = get
      packer.slice = slice
      packer.set = set
      packer.getMany = getMany
      packer.setMany = setMany
      packer.getset = getset
      packer.ensure = ensure
      packer.unset = unset
      packer.unwrap = unwrap
      if (isArray(packer())) {
        packer.push = push
        packer.pop = pop
      }
      return packer
    }

    function createWrap (source, prevPath = []) {
      let packer = wrapper()
      const isRoot = _cache == null
      if (isRoot) {
        _cache = [[source, packer, null]]
        root = makeChange(packer)
        root.MUTATION_TYPE = MUTATION_TYPE
      }
      let skip = root.change.skip()
      root.change.skip(true)

      if (isPrimitive2(source)) {
        packer = bindMethods(wrapper(source), prevPath)
        root.change.skip(skip)
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
              /* eslint-disable-next-line no-unused-vars */
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
      }
      root.change.skip(skip)
      return ret
    }

    function deepIt (a, b, callback, path) {
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

    function getMany (
      pathMap,
      mapFunc = defaultMapFunc
    ) {
      const getValue = path => {
        return this.get(path, mapFunc)
      }
      if (isPOJO(pathMap)) {
        const obj = {}
        for (let key in pathMap) {
          if (!hasOwnProperty.call(pathMap, key)) continue
          obj[key] = getValue(key)
        }
        return obj
      } else if (isArray(pathMap)) {
        return pathMap.map(getValue)
      } else {
        return getValue(pathMap)
      }
    }

    function get (path, mapFunc) {
      let obj = this
      let n = obj
      path = getPath(path)
      for (let i = 0, len = path.length; i < len; i++) {
        if (!isWrapper(n)) {
          break
        }
        n = n()[path[i][1]]
      }
      return isFunction(mapFunc) ? mapFunc(n) : n
    }

    // ensure path exists
    function ensure (invalid, path, defaultValue, descriptor) {
      if (!isFunction(invalid)) {
        descriptor = defaultValue
        defaultValue = path
        path = invalid
        invalid = () => false
      }
      let obj = this
      let val = obj.get(path)
      if (val == null || invalid(val)) {
        val = obj.set(path, defaultValue, descriptor)
      }
      return val
    }

    function setMany (kvMap, descriptors = {}) {
      const obj = isArray(kvMap) ? [] : {}
      for (let key in kvMap) {
        if (!hasOwnProperty.call(kvMap, key)) continue
        obj[key] = this.set(key, kvMap[key], descriptors[key])
      }
      return obj
    }

    function set (path, value, descriptor) {
      if (arguments.length <= 1) {
        value = path
        path = []
      }
      const func = () => value
      return this.getset(path, func, descriptor)
    }

    function getset (path, func, descriptor) {
      let obj = this
      if (arguments.length <= 1 && isFunction(path)) {
        func = path
        path = []
      }

      path = getPath(path)
      if (!isWrapper(obj)) return obj

      let value, action
      /* eslint-disable-next-line no-unused-vars */
      let i; let len; let t; let nextT; let p; let n = obj()

      if (!path.length) {
        obj(createWrap(func(obj), obj.path.slice())())
        value = obj
        action = MUTATION_TYPE.CHANGE
      } else {
        const _path = path.map(v => v[1])
        for (i = 0, len = path.length - 1; i < len; i++) {
          [t, p] = path[i]
          ;[nextT] = path[i + 1]
          if (!isWrapper(n[p])) {
            n[p] = bindMethods(
              wrapper(nextT === 'array' ? [] : {}),
              _path.slice(0, i + 1),
              MUTATION_TYPE.CREATE
            )
          }
          n = n[p]()
        }
        [t, p] = path[i]
        if (isWrapper(n[p])) {
          n[p](createWrap(func(n[p]), obj.path.concat(_path))())
          value = n[p]
          action = MUTATION_TYPE.CHANGE
        } else {
          value = createWrap(func(n[p], true), obj.path.concat(_path))
          if (isPrimitive(descriptor)) {
            // Maybe Throw:
            // Cannot create property 'z' on number '10'
            n[p] = value
          } else {
            // Maybe Throw:
            // Object.defineProperty called on non-object
            Object.defineProperty(n, p, assign({ value }, descriptor))
          }
          action = MUTATION_TYPE.ADD
          root.change.emit(value, action)
        }
      }

      return value
    }

    function unset (path) {
      let obj = this

      path = getPath(path)
      let len = path.length
      if (!isWrapper(obj) || !len) return
      let val = obj.get(path.slice(0, -1))
      if (val == null) return
      let parent = val()
      /* eslint-disable-next-line no-unused-vars */
      let [t, p] = path[len - 1]
      if (!(p in parent)) return
      let deleteVal = parent[p]
      delete parent[p]
      root.change.emit(deleteVal, MUTATION_TYPE.DELETE)
      return isWrapper(deleteVal)
        ? deleteVal.unwrap()
        : deleteVal
    }

    function push (value) {
      let len = this().length
      return this.set(len, value)
    }

    function pop () {
      let len = this().length
      let val = this.unset(len - 1)
      this().pop()
      return val
    }

    function unwrap (path, config = {}) {
      if (arguments.length === 1 && isPOJO(path)) {
        config = path
        path = null
      }
      return _unwrap(
        path != null
          ? this.get(path)
          : this, config
      )
    }

    return root
  }
}

function _checkCacheAndUnwrap (config, _cache, val, result, key) {
  const prev = _cache.find(v => v[0] === val)
  if (prev != null) {
    !config.json && prev.push(() => {
      /* eslint-disable-next-line no-unused-vars */
      const [_, r, k] = prev
      result[key] = k == null ? r : r[k]
    })
  } else {
    _cache.push([val, result, key])
    result[key] = _unwrap(val, config, _cache)
  }
  return prev
}

function _unwrap (obj, config, _cache) {
  let isRoot = _cache == null
  if (isRoot) _cache = [[obj]]

  let result
  let source = obj
  if (isArray(source)) {
    result = []
    source.forEach((val, key) => {
      _checkCacheAndUnwrap(config, _cache, val, result, key)
    })
  } else if (isPOJO(source)) {
    result = {}
    keys(source).forEach(key => {
      const val = source[key]
      _checkCacheAndUnwrap(config, _cache, val, result, key)
    })
  } else if (isWrappedData(source)) {
    result = _unwrap(source(), config, _cache)
  } else {
    while (isWrapper(source)) {
      source = source()
    }
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

module.exports = wrapData
