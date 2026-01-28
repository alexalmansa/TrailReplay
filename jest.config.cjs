module.exports = {
    testEnvironment: 'jsdom',
    transform: {
        '^.+\.js$': ['babel-jest', { configFile: './babel.config.cjs' }],
    },
    moduleNameMapper: {
        '^(\.{1,2}/.*)\.js$': '$1',
    },
};