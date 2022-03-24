const express = require('express')
const app = express()
const port = 3000


app.get('/', (req, res) => {
  res.sendFile("/home/djs_jo/Documents/WebSecurity/csrfAttackOtherHost.html");
})
app.get('/token', (req, res) => {
  res.sendFile("/home/djs_jo/Documents/WebSecurity/csrfAttackGetToken.html");
})

app.listen(port, () => {
  console.log(`${__dirname} Example app listening on port ${port}`)
})
