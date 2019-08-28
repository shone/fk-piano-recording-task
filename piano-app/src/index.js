import React from "react";
import ReactDOM from "react-dom";
import ApolloClient from "apollo-boost";
import { ApolloProvider } from "react-apollo";

// This is a workaround
// See https://github.com/apollographql/apollo-client/issues/2042#issuecomment-509041949
import { ApolloProvider as ApolloHooksProvider } from "@apollo/react-hooks";

import "./index.css";
import App from "./App";

const client = new ApolloClient({
    uri: "http://localhost:4000",
});

function Root() {
    return (
        <ApolloProvider client={client}>
            <ApolloHooksProvider client={client}>
                <App />
            </ApolloHooksProvider>
        </ApolloProvider>
    )
}

ReactDOM.render(
    <Root />,
    document.getElementById("root")
);
