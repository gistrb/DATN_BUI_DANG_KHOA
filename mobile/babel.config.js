module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    ['@babel/plugin-proposal-optional-chaining'],
    ['@babel/plugin-proposal-nullish-coalescing-operator'],
    ['@babel/plugin-transform-arrow-functions'],
    [
      'react-native-reanimated/plugin',
      {
        processNestedWorklets: true,
      },
    ],
  ],
};
