const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const app = express();

const checklistRoutes = require("./routes/checklistRoute");
const listSubmitRoutes = require("./routes/listSubmitRoute");
const userRoutes = require("./routes/userRoute");
const addressRoutes = require("./routes/addressRoute");

require('dotenv/config')

app.use('/images', express.static('public/images'));

app.use('/temp', express.static('temp'));
app.use(express.json());
app.use(cors());
app.use(morgan('tiny'));

mongoose.connect(process.env.Connection_String)
    .then(() => {
        console.log("Database is connecting");
    })
    .catch((err) => {
        console.log(err);
    })

app.use("/api/checklist", checklistRoutes);
app.use("/api/listSubmit", listSubmitRoutes);
app.use("/api/user", userRoutes)
app.use("/api/address", addressRoutes)

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});