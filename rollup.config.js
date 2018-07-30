// rollup.config.js
const buble = require('rollup-plugin-buble')

export default [
    {
        input: './src/index.js',
        plugins: [
            buble()
        ],
        output: [
            { format: 'umd', file: 'dist/index.umd.js', name: 'wrapData' },
        ]
    },

    {
        input: './src/index.js',
        output: [
            { format: 'cjs', file: 'dist/index.cjs.js' },
            { format: 'es', file: 'dist/index.es.js' }
        ]
    },

]
