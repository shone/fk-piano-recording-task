const { MongoMemoryServer } = require("mongodb-memory-server");
const { MongoClient, ObjectId } = require("mongodb");
const { ApolloServer, gql } = require("apollo-server");

(async function() {
    const mongoMemoryServer = new MongoMemoryServer();
    const mongoUri = await mongoMemoryServer.getConnectionString();
    const mongoConnection = await MongoClient.connect(mongoUri);
    const mongodb = mongoConnection.db("graphqldb");

    const apolloServer = new ApolloServer({
        typeDefs: gql`
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
        `,
        resolvers: {
            Query: {
                songs: async () => {
                    // Add artificial delay to demonstrate front-end loading indicator
                    await new Promise(resolve => setTimeout(resolve, 2000));

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

                    const newSong = { title, keyStrokes, durationSeconds };
                    const response = await mongodb.collection("songs").insertOne(newSong);

                    return { ...newSong, _id: response.insertedId };
                },
                deleteSong: async (_, { id }) => {
                    const response = await mongodb.collection("songs").deleteOne({_id: ObjectId(id)});
                    return id;
                },
            },
        }
    });

    const {url} = await apolloServer.listen();
    console.log(`GraphQL server running: ${url}`);
})();
