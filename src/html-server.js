const express = require('express')
const fileHandler = require('./file-handler');
const path = require('path')

const app = express()
app.use('/', express.static(path.join(__dirname, 'client')))

app.get('/practices/:practiceId', function (req, res) {
    const { practiceId } = req.params;
    res.send(fileHandler.getPracticeDetails(practiceId));
});

app.listen(3000, function () {
      console.log('Example app listening on port 3000!')
});
