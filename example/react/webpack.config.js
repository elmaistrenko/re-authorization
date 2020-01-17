const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require('webpack');

module.exports = {
    entry: ['@babel/polyfill', path.join(__dirname, "/src/index.js")],
    module: {
        rules: [
            {
                test: /\.js$/,
                // exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        "presets": ["@babel/preset-env", "@babel/preset-react"],
                    }
                },
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.join(__dirname, "/public/index.html"),
        }),
        new webpack.DefinePlugin({
            'process.env.REACT_APP_BASE': JSON.stringify('http://192.168.7.70:3000'),
        }),
    ]
};
