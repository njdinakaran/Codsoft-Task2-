var express = require("express")
var bodyParser = require("body-parser")
var mongoose = require("mongoose")

const app = express()

app.use(bodyParser.json())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({
    extended: true
}))

const dbUrl = "mongodb://dina:<your db passwrd>@ac-9ruu58i-shard-00-00.u74yfnc.mongodb.net:27017,ac-9ruu58i-shard-00-01.u74yfnc.mongodb.net:27017,ac-9ruu58i-shard-00-02.u74yfnc.mongodb.net:27017/?ssl=true&replicaSet=atlas-k42jhx-shard-0&authSource=admin&retryWrites=true&w=majority";
//user your own database url 
const connectionp = {
    useNewUrlParser: true,
    useUnifiedTopology: true
};

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String
});

const User = mongoose.model('User', userSchema);

mongoose.connect(dbUrl, connectionp);
var db = mongoose.connection;

db.on('error', () => console.log("error in connecting"));
db.once('open', () => console.log("connected successfully"));

app.post("/signup", async (req, res) => {

    const udata = req.body;
    var name = udata.name;
    var email = udata.email;
    var password = udata.password;

    try {
        const existingUser = await User.findOne({ email: email });

        if (existingUser) {
            console.log('User already exists with the given email');
            return res.status(200).json({ message: "User already exists with the given email" });
        }

        var data = {
            "name": name,
            "email": email,
            "password": password
        };
        console.log(name);

        const newUser = new User(data);
        await newUser.save();
        return res.status(200).json("user created");
    } catch (error) {
        console.error('Error signing up:', error);
        return res.status(500).send();
    }
});


let loggedInUser = {};

app.post("/login_pass", (req, res) => {
    const udata = req.body;
    var email = udata.email;
    var password = udata.password;

    User.findOne({ email: email })
        .then((user) => {
            if (!user) {
                console.log('User not found');
                return res.status(200).json({ message: "Invaild" });
            }
            if (user.password === password) {
                loggedInUser = {
                    name: user.name,
                    email: user.email
                };
                return res.status(200).json({ message: user.name });
            } else {
                return res.status(200).json({ message: "Invaild" });
            }
        })   
});

app.post("/movetohome", (req, res) => {
    console.log('moving to home ',loggedInUser.name);
    var myname=loggedInUser.name;
    res.send(myname);
});



app.get("/", (req, res) => {
    res.set({
        "Allow-access-Allow-Origin": '*'
    });
    const path = require('path');
    const indexPath = path.join(__dirname, 'public', 'index.html');

    res.sendFile(indexPath);
});


//Schema for storing quiz dataa
const quizSchema = new mongoose.Schema({
    userName: String,
    userEmail: String,
    quizName: String,
    totalQuestions: Number,
    visibility: String,
    quizdbId: {
        type: String,
        default: null
    },
    quizPassword: {
        type: String,
        default: null
    },
    questions: [{
        question: String,
        options: [String],
        correctAnswer: String
    }],
    Date_created: {
        type: String,
        default: new Date().toLocaleDateString('en-GB')
    }
});

const Quiz = mongoose.model('Quiz', quizSchema);


app.post("/submitQuizData", (req, res) => {
    const quizData = req.body;
    const userName = loggedInUser.name; 
    const userEmail = loggedInUser.email;

    const newQuiz = new Quiz(quizData);
    newQuiz.userName = userName;
    newQuiz.userEmail = userEmail;

    newQuiz.save()
        .then((result) => {
            console.log('Quiz data saved:', result);
            res.send(userName);
        })
        .catch((error) => {
            console.error('Error saving quiz data:', error);
            return res.status(500).send();
        });
});


app.get("/quizzesByUser", (req, res) => {
    const userEmail = loggedInUser.email; 
    console.log(userEmail);

    Quiz.find({ userEmail: userEmail })
        .exec()
        .then((quizzes) => {
            console.log("Quizzes found:", quizzes);
            const formattedQuizzes = quizzes.map((quiz) => {
                return {
                    thisid: quiz._id,
                    quizName: quiz.quizName,
                    createdAt: quiz.Date_created,
                    visibility: quiz.visibility,
                    quizId: quiz.quizdbId,
                    quizPassword: quiz.quizPassword,
                    userName: quiz.userName,
                    userEmail: quiz.userEmail,
                    totalQuestions: quiz.totalQuestions
                };
            });
            res.send(formattedQuizzes);
        })
        .catch((error) => {
            console.error('Error finding quizzes:', error);
            res.status(500).send();
        });
});
// working till here

app.get("/quizzesByVisibility", (req, res) => {
    const visibility = req.query.visibility;
    const userEmail = loggedInUser.email; 

    Quiz.find({ visibility: visibility, userEmail: { $ne: userEmail }, visibility: "public" })
        .sort({ Date_created: -1 })
        .exec()
        .then((quizzes) => {
            res.send(quizzes);
        })
        .catch((error) => {
            console.error(`Error finding ${visibility} quizzes:`, error);
            res.status(500).send();
        });
});

app.post("/joinPrivateQuiz", (req, res) => {
    const { quizId, quizPassword } = req.body;
    
    Quiz.findOne({ quizdbId: quizId, quizPassword: quizPassword, visibility: 'private' })
        .sort({ Date_created: -1 })
        .exec()
        .then((quiz) => {
            if (quiz) {
                console.log(`Joined private quiz with ID ${quizId}`);
                const myquizid = quiz._id; 
                return res.status(200).send({ myquizid });
            } else {
                return res.status(401).send('Incorrect quiz ID or password');
            }
        })
        .catch((error) => {
            console.error('Enter Correct Details', error);
            return res.status(500).send();
        });
});

// taking quiz
app.get("/quizDetails", (req, res) => {
    const quizId = req.query.quizId;
    console.log('myyyyyyyyy quizzzz id',quizId);

    Quiz.findOne({ _id: quizId })       
    .exec()
        .then((quiz) => {
            if (quiz) {
                res.send(quiz);
            } else {
                console.log('Quiz not found');
                res.status(404).send('Quiz not found');
            }
        })
        .catch((error) => {
            console.error('Error fetching quiz details:', error);
            res.status(500).send();
        });
});

//schema for storing atttende quizz details
const attendQuizSchema = new mongoose.Schema({
    quizAId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz'
    },
    quizName: String,
    userName: String,
    userEmail: String,
    ownerName: String,
    ownerEmail: String,
    attemptedDate: {
        type: String,
        default: new Date().toLocaleDateString('en-GB')
    },
    questions: [{   
        question: String,
        options: [String],
        correctAnswer: String,
        choosedAnswer: String
    }],
    totalScore: {
        type: Number,
        default: 0
    }
});

const AttendQuiz = mongoose.model('Attempts', attendQuizSchema);


app.post('/submitAttendQuizData', (req, res) => {
    const attendQuizData = req.body;
    const userName = loggedInUser.name;
    const userEmail = loggedInUser.email; 

    const newAttendQuiz = new AttendQuiz(attendQuizData);
    newAttendQuiz.userName = userName;
    newAttendQuiz.userEmail = userEmail;
    newAttendQuiz.save()
        .then((result) => {
            console.log('Attended quiz data saved:', result);
            return res.status(200).send('Attended quiz data saved successfully');
        })
        .catch((error) => {
            console.error('Error saving attended quiz data:', error);
            return res.status(500).send();
        });
});

//recent quiz 
// home page dev
app.get('/attendQuizDetails', (req, res) => {
    const userEmail = loggedInUser.email;

    AttendQuiz.find({ userEmail: userEmail })
        .sort({ attemptedDate: -1 })
        .exec()
        .then((attendQuizzes) => {
            res.send(attendQuizzes);
        })
        .catch((error) => {
            console.error('Error', error);
            res.status(500).send();
        });
});

app.get("/homequizzesByUser", (req, res) => {
    const userEmail = loggedInUser.email;
    console.log(userEmail);

    Quiz.find({ userEmail: userEmail })
        .sort({ Date_created: -1 })
        .exec()
        .then((quizzes) => {
            console.log("Quizzes found:", quizzes);
            const formattedQuizzes = quizzes.map((quiz) => {
                return {
                    quizName: quiz.quizName,
                    createdAt: quiz.Date_created,
                    visibility: quiz.visibility,
                    quizId: quiz.quizdbId,
                    quizPassword: quiz.quizPassword,
                    userName: quiz.userName,
                    userEmail: quiz.userEmail,
                    totalQuestions: quiz.totalQuestions
                };
            });
            res.send(formattedQuizzes);
        })
        .catch((error) => {
            console.error('Error', error);
            res.status(500).send();
        });
});

app.get("/homequizzesByVisibility", (req, res) => {
    const visibility = req.query.visibility;
    const userEmail = loggedInUser.email;

    Quiz.find({ visibility: visibility, userEmail: { $ne: userEmail }, visibility: "public" })
        .sort({ Date_created: -1 })
        .exec()
        .then((quizzes) => {
            res.send(quizzes);
        })
        .catch((error) => {
            console.error(`Error finding ${visibility} quizzes:`, error);
            res.status(500).send();
        });
});

app.get('/allattempteddata', (req, res) => {
    const userEmail = loggedInUser.email;

    AttendQuiz.find({ userEmail: userEmail })
        .sort({ attemptedDate: -1 })
        .exec()
        .then((attendQuizzes) => {
            res.send(attendQuizzes);
        })
        .catch((error) => {
            console.error('Error', error);
            res.status(500).send();
        });
});

app.get("/attemptedquizDetails", (req, res) => {
    const quizId = req.query.quizId;
    console.log('myyyyyyyyy quizzzz id', quizId);

    AttendQuiz.findOne({ _id: quizId })
        .exec()
        .then((attendQuizzes) => {
            if (attendQuizzes) {
                res.send(attendQuizzes);
            } else {
                console.log('Quiz not found');
                res.status(404).send('Quiz not found');
            }
        })
        .catch((error) => {
            console.error('Error fetching quiz details:', error);
            res.status(500).send();
        });
});


//displaying all students attended quiz
app.post('/allstudentDetails', (req, res) => {
    const { quizId } = req.body;
    console.log('Received quiz ID:', quizId);
    
    AttendQuiz.find({ quizAId: quizId })
        .sort({attemptedDate: -1})
        .exec()
        .then((attendQuizzes) => {
            res.send(attendQuizzes);
        })
        .catch((error) => {
            console.error('Error fetching attended quizzes:', error);
            res.status(500).send();
        });
});


app.listen(3000, () => {
    console.log("Listening on port 3000");
});
