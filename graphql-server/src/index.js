const { ApolloServer, gql } = require("apollo-server");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { ObjectId } = require("mongodb");
const getMongoConnection = require("./getMongoConnection");

// don't require a separate mongodb instance to run
new MongoMemoryServer({ instance: { port: 27017 } });

// this API is just an example, you can modify any parts if needed for the task
const typeDefs = gql`
    type Song {
        _id: ID!
        title: String
        keyStrokes: [String]
        durationSeconds: Int
    }

    type Query {
        songs: [Song]
    }

    type Mutation {
        addSong(title: String, keyStrokes: [String], durationSeconds: Int): Song
        deleteSong(id: ID): ID
    }
`;

const resolvers = {
    Query: {
        songs: async () => {
            // Add artificial delay to demonstrate front-end loading indicator
            await new Promise(resolve => setTimeout(resolve, 2000));

            const mongodb = await getMongoConnection();
            return mongodb
                .collection("songs")
                .find({})
                .toArray();
        },
    },
    Mutation: {
        addSong: async (_, { title, keyStrokes, durationSeconds }) => {
            // Add artificial delay to demonstrate front-end loading indicator
            await new Promise(resolve => setTimeout(resolve, 2000));

            const mongodb = await getMongoConnection();
            const newSong = { title, keyStrokes, durationSeconds };
            const response = await mongodb.collection("songs").insertOne(newSong);

            return { ...newSong, _id: response.insertedId };
        },
        deleteSong: async (_, { id }) => {
            const mongodb = await getMongoConnection();
            const response = await mongodb.collection("songs").deleteOne({_id: ObjectId(id)});
            return id;
        },
    },
};

const server = new ApolloServer({ typeDefs, resolvers });

server.listen().then(({ url }) => {
    console.log(`GraphQL server running: ${url}`);
});
