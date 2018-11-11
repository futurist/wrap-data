// rollup.config.js
import buble from 'rollup-plugin-buble'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

export default [
  {
    input: './src/index.js',
    plugins: [
      buble(),
      resolve({
        preferBuiltins: false
      }),
      commonjs()
    ],
    output: [
      { format: 'cjs', file: 'dist/index.cjs.js' },
      { format: 'umd', file: 'dist/index.umd.js', name: 'wrapData' }
    ]
  },

  {
    input: './src/index.js',
    plugins: [
      resolve({
        preferBuiltins: false
      }),
      commonjs()
    ],
    output: [
      { format: 'es', file: 'dist/index.es.js' }
    ]
  }

]
