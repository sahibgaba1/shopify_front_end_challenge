const { Configuration } = require('openai');
const { OpenAIApi } = require('openai');
const express = require('express');
const path = require('path');

const app = express();
const mongoose = require('mongoose');

const bcrypt = require('bcrypt');

const root = path.join(__dirname, 'static');
const jwt = require('jsonwebtoken');
const Words = require('./model/words');
const User = require('./model/user');

const { SESSION_SECRET } = process.env;
const { MONGO_SECRET } = process.env;
const { OPENAI_SECRET } = process.env;


app.use('/', express.static(root));
app.use(express.json());


const port = 8080;




app.listen(process.env.port || port, () =>
  console.log(`Your server has started on port '${port}!`)
);

app.get('/login', (req, res) => {
  res.sendFile(`${root}/login.html`);
});

app.post('/api/generate', async (req, res) => {

  const configuration = new Configuration({
    apiKey: OPENAI_SECRET,
  });
  const openai = new OpenAIApi(configuration);

  const completion = await openai.createCompletion('text-davinci-002', {
    prompt: `Write a haiku poem about ${req.body.subject}`,
    temperature: 0.6,
    max_tokens: 20,
  });
  res.status(200).json({ result: completion.data.choices[0].text });
});

app.get('/home/me', (req, res) => {
  res.sendFile(`${root}/myProfile.html`);
});

app.get('/home/me/delete', (req, res) => {
  res.sendFile(`${root}/deleteConfirmation.html`);
});

app.get('/register', (req, res) => {
  res.sendFile(`${root}/register.html`);
});

app.get('/home', (req, res) => {
  res.sendFile(`${root}/home.html`);
});

app.get('/home/me/changePassword', (req, res) => {
  res.sendFile(`${root}/changepassword.html`);
});

app.post('/api/changePassword', async (req, res) => {
  const { token, newpassword: plainTextPassword } = req.body;
  if (!plainTextPassword || typeof plainTextPassword !== 'string') {
    return res.json({ status: 'error', error: 'Invalid password' });
  }
  if (plainTextPassword.length < 6) {
    return res.json({
      status: 'error',
      error: 'Password must be at least 6 characters',
    });
  }

  try {
    const user = jwt.verify(token, SESSION_SECRET);
    const password = await bcrypt.hash(plainTextPassword, 10);
    const _id = user.id;

    await User.updateOne({ _id }, { $set: { password } });
    return res.json({ status: 'ok' });
  } catch (error) {
    return res.json({
      status: 'error',
      error: "You've got to login before you can do that.",
    });
  }
});

const url = `mongodb+srv://sahibgaba:${MONGO_SECRET}@cluster0.ez5ia.mongodb.net/mydb`;
mongoose.connect(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.post('/api/authenticate', async (req, res) => {
  const { token } = req.body;

  try {
    const user = jwt.verify(token, SESSION_SECRET);
    return res.json({ status: 'ok' });
  } catch (error) {
    return res.json({
      status: 'error',
      error: "You've got to login before you do can do that.",
    });
  }
});

app.post('/home/search', async (req, res) => {
  const { keyword } = req.body;

  Words.findOne({ keyword }, (err, word) => {
    try {
      return res.json({
        status: 'ok',
        data: word.data,
      });
    } catch (err) {
      return res.json({
        status: 'error',
        error: 'Not Found',
      });
    }
  });
});

app.post('/home/search/api', async (req, res) => {
  const { keyword, data } = req.body;
  Words.create(
    {
      keyword,
      data,
    },
    (error, keyword) => {
      try {
        console.log('Word added to database successfully: ', keyword);
      } catch (error) {
        console.log(JSON.stringify(error));
        return res.json({
          status: 'error',
          error: "That shouldn't happen. Somethings wrong!",
        });
      }
    },
  );

  res.json({ status: 'ok', data });
});

app.post('/api/deleteAccount', async (req, res) => {
  const { username } = req.body;
  const user = await User.findOneAndDelete({ username }).lean();

  if (!user) {
    return res.json({
      status: 'error',
      error: '404 Error Occurred, Please logout and try again',
    });
  }
  return res.json({
    status: 'ok',
  });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username }).lean();

  if (!user) {
    return res.json({
      status: 'error',
      error: 'The username/password combination does not exist. Try again.',
    });
  }
  if (await bcrypt.compare(password, user.password)) {
    const token = jwt.sign(
      { id: user._id, username: user.username },
      SESSION_SECRET,
    );
    return res.json({
      status: 'ok',
      data: token,
      username: user.username,
    });
  }
  return res.json({
    status: 'error',
    error: 'The username/password combination does not exist. Try again.',
  });
});
app.post('/api/register', async (req, res) => {
  const { username, password: plainTextPassword } = req.body;

  if (!username || typeof username !== 'string') {
    return res.json({ status: 'error', error: 'Invalid username' });
  }

  if (!plainTextPassword || typeof plainTextPassword !== 'string') {
    return res.json({ status: 'error', error: 'Invalid password' });
  }
  if (plainTextPassword.length < 6) {
    return res.json({
      status: 'error',
      error: 'Password must be at least 6 characters',
    });
  }
  const password = await bcrypt.hash(req.body.password, 10);

  try {
    const response = await User.create({
      username,
      password,
    });
    console.log('User created successfully: ', response);
  } catch (error) {
    console.log(JSON.stringify(error));
    if (error.code === 11000) {
      return res.json({
        status: 'error',
        error: 'This email is already in use',
      });
    }
    throw error;
  }
  res.json({ status: 'ok' });
});
