const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: ['http://localhost:5173', 'https://cars-doctor-74791.web.app', 'https://cars-doctor-74791.firebaseapp.com'],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// our middleware

const logger = (req, res, next) => {
  console.log("my create middleware, log info:", req.method, req.url);
  next();
};
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  // console.log('token in the middleware', token);

  // no token handdle
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  // jwt verify
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
  // next()
};

const cookeOption = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production'? true : false,
  sameSite: process.env.NODE_ENV === 'production'? 'none' :  'strict',
}

app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(port, () => {
  console.log(`server  is running ${port}`);
});

const uri = "mongodb://localhost:27017";
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ykkxidd.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const serviceCollection = client.db("carDoctor").collection("services");
    const bookingCollection = client.db("carDoctor").collection("bookings");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("user token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, cookeOption)
        .send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("login out user", user);
      res.clearCookie("token", { ...cookeOption, maxAge: 0 }).send({ success: true });
    });

    // get all service data from mongoDB
    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/product", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      console.log(page, size);
      const cursor = serviceCollection.find()      
      .skip(page * size)
      .limit(size)
      .toArray();
      const result = await cursor.toArray();
      res.send(result);
    });

    // pagenation api genaret
    app.get('/productsCount', async(req, res) => {
      const count = await serviceCollection.estimatedDocumentCount();
      res.send({count})
    })




    // get data from mongoDB
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, service_id: 1, price: 1, img: 1 },
      };
      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    });

    // get data to mongoDB
    app.get("/bookings", verifyToken, async (req, res) => {

      console.log(req.query.email);
      console.log("token owner info", req.user);

      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    // delete data from mongoDB
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    // update data from mongoBD
    app.patch("/bookings/:id", async (req, res) => {
      const updatedBooking = req.body;
      console.log(updatedBooking);
    });

    // sent data to bookings collection
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
