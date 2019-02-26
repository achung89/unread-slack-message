# Unread Slack Messages

## Install

`npm install unread-slack-message`  
`yarn add unread-slack-message`  

## Usage
```javascript
const unreadSlackMessage = require('unreadSlackMessage');

unreadSlackMessage({authToken: process.env.AUTH_TOKEN})
  .then(({mpims, ims, private, public}) => {
    /** mpims | ims | private | public  = {
     *    name;
     *    messages: Array<{
     *      user,
     *      type,
     *      subtype,
     *      ts,
     *      text
     *    }>
     *  }
     */
  })
```

## Tech stack
node v > 8.x.x  
yarn v1.12.3
